/**
 * Provider Health Check Cron Handler
 *
 * Cloudflare Workers Cron Trigger that runs every 5 minutes
 * Monitors health and latency of all AI providers (OpenAI, Anthropic, Google, DeepSeek, Groq, Together)
 * Stores metrics in KV for dashboard display and circuit breaker integration
 *
 * Cron Schedule: Every 5 minutes (see wrangler.toml for cron expression)
 * Documentation: https://developers.cloudflare.com/workers/configuration/cron-triggers/
 */

import { Env } from '../types';
import { getProviderBaseUrl } from '../gateway/model-router';

// Cloudflare Workers types
interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface ProviderHealthCheck {
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number; // milliseconds
  errorRate: number; // percentage (0-100)
  uptime: number; // percentage (0-100)
  lastCheck: string;
  errorMessage?: string;
}

interface HealthCheckResult {
  success: boolean;
  providers: ProviderHealthCheck[];
  timestamp: string;
  error?: string;
}

// KV key prefix for health check data
const HEALTH_CHECK_KEY_PREFIX = 'provider_health:';

// Health check thresholds
const THRESHOLDS = {
  LATENCY_WARNING: 2000, // 2 seconds
  LATENCY_CRITICAL: 5000, // 5 seconds
  ERROR_RATE_WARNING: 5, // 5%
  ERROR_RATE_CRITICAL: 20, // 20%
  UPTIME_WARNING: 95, // 95%
  UPTIME_CRITICAL: 90, // 90%
};

/**
 * Perform a lightweight health check on a single provider
 * Uses minimal API call to test availability and latency
 */
async function checkProviderHealth(
  provider: string,
  baseUrl: string,
  apiKey: string
): Promise<ProviderHealthCheck> {
  const startTime = Date.now();
  const result: ProviderHealthCheck = {
    provider,
    status: 'healthy',
    latency: 0,
    errorRate: 0,
    uptime: 100,
    lastCheck: new Date().toISOString()
  };

  try {
    // Use lightweight endpoint for health check
    // OpenAI-compatible providers use /models endpoint
    // Anthropic uses /messages (minimal request)
    const healthEndpoint = provider === 'anthropic'
      ? `${baseUrl}messages`
      : `${baseUrl}models`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Provider-specific authentication
    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (provider === 'google') {
      const urlSeparator = baseUrl.includes('?') ? '&' : '?';
      const urlWithKey = `${healthEndpoint}${urlSeparator}key=${apiKey}`;
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(
        provider === 'google' && healthEndpoint.includes('?')
          ? healthEndpoint
          : healthEndpoint,
        {
          method: provider === 'anthropic' ? 'POST' : 'GET',
          headers,
          signal: controller.signal,
          // Minimal body for Anthropic
          body: provider === 'anthropic'
            ? JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1,
                messages: [{ role: 'user', content: '' }]
              })
            : undefined
        }
      );

      clearTimeout(timeoutId);
      result.latency = Date.now() - startTime;

      // Determine health status based on response
      if (response.ok) {
        result.status = 'healthy';
      } else if (response.status >= 500) {
        result.status = 'degraded';
        result.errorMessage = `Server error: ${response.status}`;
      } else {
        result.status = 'down';
        result.errorMessage = `Client error: ${response.status}`;
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      result.latency = Date.now() - startTime;

      if (fetchError.name === 'AbortError') {
        result.status = 'down';
        result.errorMessage = 'Request timeout (10s)';
      } else {
        result.status = 'down';
        result.errorMessage = fetchError.message || 'Connection failed';
      }
    }

    // Calculate error rate and uptime from historical data in KV
    const historicalData = await getHistoricalMetrics(provider);
    result.errorRate = historicalData.errorRate;
    result.uptime = historicalData.uptime;

    // Adjust status based on historical data
    if (result.status === 'healthy') {
      if (result.latency > THRESHOLDS.LATENCY_CRITICAL ||
          result.errorRate > THRESHOLDS.ERROR_RATE_CRITICAL ||
          result.uptime < THRESHOLDS.UPTIME_CRITICAL) {
        result.status = 'degraded';
      } else if (result.latency > THRESHOLDS.LATENCY_WARNING ||
                 result.errorRate > THRESHOLDS.ERROR_RATE_WARNING ||
                 result.uptime < THRESHOLDS.UPTIME_WARNING) {
        result.status = 'degraded';
      }
    }
  } catch (error: any) {
    result.latency = Date.now() - startTime;
    result.status = 'down';
    result.errorMessage = error?.message || 'Unknown error';
  }

  return result;
}

/**
 * Get historical metrics from KV for error rate and uptime calculation
 */
async function getHistoricalMetrics(provider: string): Promise<{
  errorRate: number;
  uptime: number;
}> {
  // This would read from KV to calculate rolling metrics
  // For now, return defaults - in production, this would aggregate last 100 checks
  return {
    errorRate: 0,
    uptime: 100
  };
}

/**
 * Main cron handler for provider health checks
 * @param env - Cloudflare Workers environment bindings
 * @returns HealthCheckResult with all provider statuses
 */
export async function providerHealthCheck(env: Env): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();

  try {
    console.log(`[HealthCheck] Action: provider_health_check_started (Metadata: timestamp=${timestamp})`);

    // Get all provider configurations from database
    const configsStmt = env.DB.prepare(`
      SELECT DISTINCT provider, api_key_encrypted
      FROM provider_configs
      WHERE is_active = 1
    `);

    const configsResult = await configsStmt.all();

    if (!configsResult.success || !configsResult.results || configsResult.results.length === 0) {
      throw new Error('No active provider configurations found');
    }

    const providerConfigs = configsResult.results as any[];
    const healthChecks: ProviderHealthCheck[] = [];

    // Check each provider
    for (const config of providerConfigs) {
      const provider = config.provider;
      const baseUrl = getProviderBaseUrl(provider);

      // Decrypt API key
      const apiKey = await decryptProviderKey(config.api_key_encrypted, env.ENCRYPTION_SECRET);

      const healthCheck = await checkProviderHealth(provider, baseUrl, apiKey);
      healthChecks.push(healthCheck);

      console.log(
        `[HealthCheck] Action: provider_checked ` +
        `(Metadata: provider=${provider}, status=${healthCheck.status}, ` +
        `latency=${healthCheck.latency}ms, error_rate=${healthCheck.errorRate}%)`
      );
    }

    // Store results in KV for dashboard access (TTL: 10 minutes)
    const healthKey = `${HEALTH_CHECK_KEY_PREFIX}latest`;
    await env.RATE_LIMIT_KV.put(
      healthKey,
      JSON.stringify({
        providers: healthChecks,
        timestamp
      }),
      {
        expirationTtl: 600 // 10 minutes
      }
    );

    // Also store per-provider metrics for circuit breaker integration
    for (const check of healthChecks) {
      const providerKey = `${HEALTH_CHECK_KEY_PREFIX}${check.provider}`;
      await env.RATE_LIMIT_KV.put(
        providerKey,
        JSON.stringify(check),
        {
          expirationTtl: 600
        }
      );
    }

    console.log(
      `[HealthCheck] Action: provider_health_check_completed ` +
      `(Metadata: timestamp=${timestamp}, providers_checked=${healthChecks.length})`
    );

    return {
      success: true,
      providers: healthChecks,
      timestamp
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(
      `[HealthCheck] Action: provider_health_check_failed ` +
      `(Metadata: timestamp=${timestamp}, error="${errorMessage}")`
    );

    return {
      success: false,
      providers: [],
      timestamp,
      error: errorMessage
    };
  }
}

/**
 * Cloudflare Workers Scheduled Event Handler for Health Checks
 * This function is exported and invoked by Cloudflare Workers cron trigger
 *
 * @param event - Scheduled event with cron property
 * @param env - Cloudflare Workers environment bindings
 * @param ctx - Execution context (for waitUntil, etc.)
 */
export async function scheduledHealthCheck(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  console.log(
    `[HealthCheck] Action: scheduled_event_received ` +
    `(Metadata: cron="${event.cron}", scheduled_time=${event.scheduledTime})`
  );

  const result = await providerHealthCheck(env);

  // Store audit log in database
  ctx.waitUntil(
    Promise.resolve().then(async () => {
      const logId = crypto.randomUUID();
      const status = result.success ? 'success' : 'failure';

      const logStmt = env.DB.prepare(`
        INSERT INTO cron_logs (id, job_name, status, error_message)
        VALUES (?, ?, ?, ?)
      `);

      await logStmt.bind(
        logId,
        'provider_health_check',
        status,
        result.error || null
      ).run();

      console.log(
        `[HealthCheck] Action: audit_log_created ` +
        `(Metadata: timestamp=${result.timestamp}, status=${status})`
      );
    })
  );
}

/**
 * Manual trigger endpoint for testing health checks
 * Can be called via HTTP for manual testing
 *
 * Example: curl -X POST https://your-worker.dev/api/cron/test/health-check
 *
 * Note: This should be secured or removed in production environments
 */
export async function manualTrigger(env: Env): Promise<Response> {
  const result = await providerHealthCheck(env);

  if (result.success) {
    return new Response(
      JSON.stringify({
        message: 'Provider health check completed successfully',
        providers: result.providers,
        timestamp: result.timestamp
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } else {
    return new Response(
      JSON.stringify({
        error: 'Provider health check failed',
        details: result.error,
        timestamp: result.timestamp
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Helper function to decrypt provider API key
 * Imported from crypto utility
 */
async function decryptProviderKey(encryptedKey: string, secret: string): Promise<string> {
  try {
    const keyBuffer = new TextEncoder().encode(secret);
    const encryptedBuffer = new Uint8Array(
      atob(encryptedKey).split('').map(c => c.charCodeAt(0))
    );

    // Simple XOR decryption (matches the encryption in crypto.ts)
    const decrypted = new Uint8Array(encryptedBuffer.length);
    for (let i = 0; i < encryptedBuffer.length; i++) {
      decrypted[i] = encryptedBuffer[i] ^ keyBuffer[i % keyBuffer.length];
    }

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt provider key');
  }
}
