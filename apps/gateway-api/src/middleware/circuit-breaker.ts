import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';

/**
 * Circuit Breaker States
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
    failureThreshold: number;      // Number of failures before opening
    successThreshold: number;      // Number of successes to close circuit
    timeout: number;               // Milliseconds to wait before HALF_OPEN
    monitoringWindow: number;      // Milliseconds to track failures
}

interface CircuitStats {
    failures: number;
    successes: number;
    lastFailureTime: number;
    lastStateChange: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,           // Open after 5 failures
    successThreshold: 2,           // Close after 2 consecutive successes
    timeout: 60000,                // 1 minute cooldown
    monitoringWindow: 300000,      // 5 minute window
};

// In-memory circuit breaker state per project
const circuitStates = new Map<string, CircuitState>();
const circuitStats = new Map<string, CircuitStats>();

// Export internal state for testing
export const _circuitStates = circuitStates;
export const _circuitStats = circuitStats;

/**
 * Circuit breaker middleware
 * Prevents cascading failures by failing fast when a provider is down
 *
 * Architecture:
 * - Per-project circuit breakers (in-memory, D1 persistence for recovery)
 * - Tracks failures and successes in monitoring window
 * - Automatic state transitions: CLOSED → OPEN → HALF_OPEN → CLOSED
 *
 * State transitions:
 * - CLOSED → OPEN: When failures exceed threshold
 * - OPEN → HALF_OPEN: After timeout period
 * - HALF_OPEN → CLOSED: When successes exceed threshold
 * - HALF_OPEN → OPEN: On any failure
 */
export const circuitBreaker: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
    const project = c.get('project');
    const provider = c.get('provider');

    // Skip circuit breaker if no project or provider (not an AI provider request)
    if (!project || !provider) {
        await next();
        return;
    }

    const circuitKey = `${project.id}:${provider}`;
    const config = DEFAULT_CONFIG;
    const now = Date.now();

    // Initialize circuit state if needed (only on first request ever)
    if (!circuitStates.has(circuitKey)) {
        circuitStates.set(circuitKey, 'CLOSED');
        circuitStats.set(circuitKey, {
            failures: 0,
            successes: 0,
            lastFailureTime: 0,
            lastStateChange: now
        });
        console.log(`[CircuitBreaker] Initialized circuit for ${circuitKey}`);
    }

    // Get current state (may have been updated above or by another request)
    let state = circuitStates.get(circuitKey)!;
    const stats = circuitStats.get(circuitKey)!;

    console.log(`[CircuitBreaker] Request for ${circuitKey}, state: ${state}, failures: ${stats.failures}`);

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (state === 'OPEN' && (now - stats.lastStateChange) >= config.timeout) {
        circuitStates.set(circuitKey, 'HALF_OPEN');
        stats.lastStateChange = now;
        state = 'HALF_OPEN'; // Update local variable
    }

    // Fail fast if circuit is OPEN
    if (state === 'OPEN') {
        const retryAfter = Math.ceil((config.timeout - (now - stats.lastStateChange)) / 1000);
        return c.json({
            error: {
                message: `Service unavailable. Circuit breaker is OPEN for provider: ${provider}. Retry after ${retryAfter}s.`,
                type: 'service_unavailable',
                code: 'circuit_breaker_open'
            }
        }, 503, {
            'Retry-After': retryAfter.toString(),
            'X-Circuit-State': 'OPEN',
            'X-Circuit-Provider': provider
        });
    }

    // Track request outcome for circuit breaker state
    // Success: no exception thrown
    // Failure: exception thrown (network error, timeout, etc.)
    let success = false;
    try {
        await next();
        success = true;
        console.log(`[CircuitBreaker] Request succeeded for ${circuitKey}`);
    } catch (error) {
        success = false;
        console.log(`[CircuitBreaker] Request failed for ${circuitKey}:`, error);
        throw error; // Re-throw to let error handlers deal with it
    } finally {
        // Check if an error was marked in the context (by error tracking middleware)
        const requestError = c.get('requestError');
        if (requestError) {
            success = false;
            console.log(`[CircuitBreaker] Request failed (marked in context) for ${circuitKey}`);
        }

        console.log(`[CircuitBreaker] Finally block for ${circuitKey}, success: ${success}`);
        // Update circuit stats based on outcome
        if (success) {
            handleSuccess(circuitKey, config, now);
        } else {
            handleFailure(circuitKey, config, now);
        }
    }
};

function handleSuccess(circuitKey: string, config: CircuitBreakerConfig, now: number) {
    const state = circuitStates.get(circuitKey);
    const stats = circuitStats.get(circuitKey);

    if (!state || !stats) return;

    stats.successes++;

    // If in HALF_OPEN and enough successes, close circuit
    if (state === 'HALF_OPEN' && stats.successes >= config.successThreshold) {
        circuitStates.set(circuitKey, 'CLOSED');
        stats.lastStateChange = now;
        stats.failures = 0; // Reset failures on close
        stats.successes = 0;
    }
}

function handleFailure(circuitKey: string, config: CircuitBreakerConfig, now: number) {
    let state = circuitStates.get(circuitKey);
    const stats = circuitStats.get(circuitKey);

    if (!state || !stats) {
        console.log('[CircuitBreaker] handleFailure: No state or stats for', circuitKey);
        return;
    }

    stats.failures++;
    stats.lastFailureTime = now;

    console.log(`[CircuitBreaker] Failure ${stats.failures}/${config.failureThreshold} for ${circuitKey}, state: ${state}`);

    // If in HALF_OPEN, any failure opens circuit immediately
    if (state === 'HALF_OPEN') {
        circuitStates.set(circuitKey, 'OPEN');
        stats.lastStateChange = now;
        stats.successes = 0;
        console.log('[CircuitBreaker] HALF_OPEN -> OPEN (failure)');
        return;
    }

    // If in CLOSED and threshold exceeded, open circuit
    if (state === 'CLOSED' && stats.failures >= config.failureThreshold) {
        circuitStates.set(circuitKey, 'OPEN');
        stats.lastStateChange = now;
        console.log('[CircuitBreaker] CLOSED -> OPEN (threshold exceeded)');
    }
}

// Export for testing
export function _resetCircuitBreaker() {
    circuitStates.clear();
    circuitStats.clear();
}

export function _getCircuitState(circuitKey: string): { state: CircuitState; stats: CircuitStats } | undefined {
    const state = circuitStates.get(circuitKey);
    const stats = circuitStats.get(circuitKey);

    if (!state || !stats) return undefined;

    return { state, stats };
}
