import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { circuitBreaker, _resetCircuitBreaker, _getCircuitState, _circuitStates, _circuitStats } from './circuit-breaker';
import type { Env, Variables } from '../types';

// Helper to set context before circuit breaker runs
function setMockContext(projectId = 'test-project', provider = 'openai') {
    return async (c: any, next: any) => {
        c.set('project', { id: projectId });
        c.set('provider', provider);
        await next();
    };
}

describe('Circuit Breaker Middleware', () => {
    beforeEach(() => {
        _resetCircuitBreaker();
    });

    // Global error handler to mark errors in context for circuit breaker
    // This must be added to the app before any tests that throw errors
    function withErrorMarking(app: Hono) {
        app.onError((err, c) => {
            // Mark error in context so circuit breaker can detect it
            c.set('requestError', err);
            // Re-throw for Hono's default error handler
            throw err;
        });
        return app;
    }

    it('should allow requests when circuit is CLOSED', async () => {
        const app = new Hono<{ Bindings: Env; Variables: Variables }>();

        app.get('/', setMockContext(), circuitBreaker, (c) => c.json({ status: 'ok' }));

        const req = new Request('http://localhost/', {
            method: 'GET'
        });

        const res = await app.request(req);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.status).toBe('ok');
    });

    it('should open circuit after failure threshold (5 failures)', async () => {
        const app = new Hono<{ Bindings: Env; Variables: Variables }>();
        const circuitKey = 'test-project:openai';

        // Add error marking to app
        withErrorMarking(app);

        app.get('/', setMockContext(), circuitBreaker, (c) => {
            throw new Error('Simulated provider failure');
        });

        // Simulate 5 failures
        for (let i = 0; i < 5; i++) {
            const req = new Request('http://localhost/');
            try {
                await app.request(req);
            } catch {
                // Expected to throw
            }
        }

        const state = _getCircuitState(circuitKey);
        expect(state?.state).toBe('OPEN');
        expect(state?.stats.failures).toBe(5);
    });

    it('should fail fast when circuit is OPEN', async () => {
        const app = new Hono<{ Bindings: Env; Variables: Variables }>();
        const circuitKey = 'test-project:openai';

        app.get('/', setMockContext(), circuitBreaker, (c) => c.json({ status: 'ok' }));

        // Manually set circuit to OPEN
        const now = Date.now();
        _circuitStates.set(circuitKey, 'OPEN');
        _circuitStats.set(circuitKey, {
            failures: 5,
            successes: 0,
            lastFailureTime: now,
            lastStateChange: now
        });

        const req = new Request('http://localhost/');
        const res = await app.request(req);

        expect(res.status).toBe(503);
        expect(res.headers.get('X-Circuit-State')).toBe('OPEN');
        expect(res.headers.get('X-Circuit-Provider')).toBe('openai');

        const body = await res.json();
        expect(body.error.type).toBe('service_unavailable');
        expect(body.error.code).toBe('circuit_breaker_open');
        expect(body.error.message).toContain('Circuit breaker is OPEN');
    });

    it('should transition to HALF_OPEN after timeout (60s)', async () => {
        const app = new Hono<{ Bindings: Env; Variables: Variables }>();
        const circuitKey = 'test-project:openai';

        app.get('/', setMockContext(), circuitBreaker, (c) => c.json({ status: 'ok' }));

        // Set circuit to OPEN with old timestamp (70 seconds ago)
        const oldTimestamp = Date.now() - 70000;
        _circuitStates.set(circuitKey, 'OPEN');
        _circuitStats.set(circuitKey, {
            failures: 5,
            successes: 0,
            lastFailureTime: oldTimestamp,
            lastStateChange: oldTimestamp
        });

        const req = new Request('http://localhost/');
        const res = await app.request(req);

        // Should succeed (circuit transitioned to HALF_OPEN)
        expect(res.status).toBe(200);

        const state = _getCircuitState(circuitKey);
        expect(state?.state).toBe('HALF_OPEN');
    });

    it('should close circuit after 2 successes in HALF_OPEN', async () => {
        const app = new Hono<{ Bindings: Env; Variables: Variables }>();
        const circuitKey = 'test-project:openai';

        app.get('/', setMockContext(), circuitBreaker, (c) => c.json({ status: 'ok' }));

        // Set circuit to HALF_OPEN
        const now = Date.now();
        _circuitStates.set(circuitKey, 'HALF_OPEN');
        _circuitStats.set(circuitKey, {
            failures: 5,
            successes: 0,
            lastFailureTime: now,
            lastStateChange: now
        });

        // Simulate 2 successful requests
        for (let i = 0; i < 2; i++) {
            const req = new Request('http://localhost/');
            await app.request(req);
        }

        const state = _getCircuitState(circuitKey);
        expect(state?.state).toBe('CLOSED');
        expect(state?.stats.successes).toBe(0); // Reset on close
        expect(state?.stats.failures).toBe(0); // Reset on close
    });

    it('should re-open circuit on failure in HALF_OPEN', async () => {
        const app = new Hono<{ Bindings: Env; Variables: Variables }>();
        const circuitKey = 'test-project:openai';

        // Add error marking to app
        withErrorMarking(app);

        let shouldFail = false;

        app.get('/', setMockContext(), circuitBreaker, (c) => {
            if (shouldFail) {
                throw new Error('Provider failed again');
            }
            return c.json({ status: 'ok' });
        });

        // Set circuit to HALF_OPEN with 0 successes (so first success won't close it)
        const now = Date.now();
        _circuitStates.set(circuitKey, 'HALF_OPEN');
        _circuitStats.set(circuitKey, {
            failures: 5,
            successes: 0,
            lastFailureTime: now,
            lastStateChange: now
        });

        // First request succeeds (successes becomes 1, not enough to close)
        const req1 = new Request('http://localhost/');
        const res1 = await app.request(req1);
        expect(res1.status).toBe(200);

        // Verify we're still in HALF_OPEN (only 1 success, need 2 to close)
        let state = _getCircuitState(circuitKey);
        expect(state?.state).toBe('HALF_OPEN');
        expect(state?.stats.successes).toBe(1);

        // Second request fails
        shouldFail = true;
        const req2 = new Request('http://localhost/');
        try {
            await app.request(req2);
        } catch {
            // Expected to throw
        }

        state = _getCircuitState(circuitKey);
        expect(state?.state).toBe('OPEN');
    });

    it('should skip circuit breaker if no project or provider', async () => {
        const app = new Hono<{ Bindings: Env; Variables: Variables }>();

        app.use('*', circuitBreaker);
        app.get('/', (c) => {
            // Don't set project or provider
            return c.json({ status: 'ok' });
        });

        const req = new Request('http://localhost/');
        const res = await app.request(req);

        expect(res.status).toBe(200);
    });

    it('should maintain separate circuit states per project-provider combination', async () => {
        const app = new Hono<{ Bindings: Env; Variables: Variables }>();

        // Add error marking to app
        withErrorMarking(app);

        app.get('/project1', setMockContext('project1', 'openai'), circuitBreaker, (c) => {
            throw new Error('Project 1 failure');
        });

        app.get('/project2', setMockContext('project2', 'openai'), circuitBreaker, (c) => {
            return c.json({ status: 'ok' });
        });

        // Fail project1 5 times
        for (let i = 0; i < 5; i++) {
            try {
                await app.request(new Request('http://localhost/project1'));
            } catch {
                // Expected
            }
        }

        // Project 1 circuit should be OPEN
        const state1 = _getCircuitState('project1:openai');
        expect(state1?.state).toBe('OPEN');
        expect(state1?.stats.failures).toBe(5);

        // Project 2 circuit should still be CLOSED (or undefined if never initialized)
        const state2 = _getCircuitState('project2:openai');
        // state2 might be undefined (never initialized) or CLOSED (initialized but no failures)
        expect(state2?.state).toBeUndefined();

        // Project 2 should still work
        const res = await app.request(new Request('http://localhost/project2'));
        expect(res.status).toBe(200);
    });
});
