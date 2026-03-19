/**
 * Monthly Usage Reset Cron Handler
 *
 * Cloudflare Workers Cron Trigger that runs on the 1st day of every month at 00:00 UTC
 * Resets current_month_usage_usd to 0 for all active (non-revoked) API keys
 *
 * IMPORTANT: This is a CALENDAR MONTH reset (different from user-level rolling 30-day period)
 * - Gateway Key Monthly Limit: Resets on 1st of each month (calendar month)
 * - User Monthly Requests: Rolling 30-day from first request (personalized)
 *
 * Example:
 * - Gateway Key created March 15: Limit resets April 1, May 1, June 1...
 * - User first request March 17: 30-day period resets April 16, May 16...
 *
 * Scheduled: 0 0 1 * * (At 00:00 on day-of-month 1)
 * Documentation: https://developers.cloudflare.com/workers/configuration/cron-triggers/
 */

import { Env } from '../types';

// Cloudflare Workers types (not in @cloudflare/workers-types package)
interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface ResetResult {
  success: boolean;
  keysReset: number;
  timestamp: string;
  error?: string;
}

/**
 * Main cron handler for monthly usage reset
 * @param env - Cloudflare Workers environment bindings
 * @returns ResetResult with operation details
 */
export async function monthlyUsageReset(env: Env): Promise<ResetResult> {
  const timestamp = new Date().toISOString();

  try {
    console.log(`[CronJob] Action: monthly_usage_reset_started (Metadata: timestamp=${timestamp})`);

    // Reset current_month_usage_usd for all active keys (where revoked_at IS NULL)
    const stmt = env.DB.prepare(`
      UPDATE gateway_keys
      SET current_month_usage_usd = 0.00
      WHERE revoked_at IS NULL
    `);

    const result = await stmt.run();

    if (!result.success) {
      throw new Error('Database update failed');
    }

    const keysReset = result.meta.changes || 0;

    console.log(
      `[CronJob] Action: monthly_usage_reset_completed ` +
      `(Metadata: timestamp=${timestamp}, keys_reset=${keysReset})`
    );

    return {
      success: true,
      keysReset,
      timestamp
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(
      `[CronJob] Action: monthly_usage_reset_failed ` +
      `(Metadata: timestamp=${timestamp}, error="${errorMessage}")`
    );

    return {
      success: false,
      keysReset: 0,
      timestamp,
      error: errorMessage
    };
  }
}

/**
 * Cloudflare Workers Scheduled Event Handler for Monthly Reset
 * This function is exported and invoked by the scheduled dispatcher
 *
 * @param event - Scheduled event with cron property
 * @param env - Cloudflare Workers environment bindings
 * @param ctx - Execution context (for waitUntil, etc.)
 */
export async function scheduledMonthlyReset(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  // Log the cron trigger invocation
  console.log(
    `[CronJob] Action: scheduled_event_received ` +
    `(Metadata: cron="${event.cron}", scheduled_time=${event.scheduledTime})`
  );

  // Execute the reset operation
  const result = await monthlyUsageReset(env);

  // In Cloudflare Workers, we can use ctx.waitUntil() for background tasks
  // This ensures the operation completes even if we return early
  ctx.waitUntil(
    Promise.resolve().then(async () => {
      // Store the result in the cron_logs table for audit trail
      const logId = crypto.randomUUID();
      const status = result.success ? 'success' : 'failure';

      const logStmt = env.DB.prepare(`
        INSERT INTO cron_logs (id, job_name, status, keys_reset, error_message)
        VALUES (?, ?, ?, ?, ?)
      `);

      await logStmt.bind(
        logId,
        'monthly_usage_reset',
        status,
        result.keysReset,
        result.error || null
      ).run();

      console.log(
        `[CronJob] Action: audit_log_created ` +
        `(Metadata: timestamp=${result.timestamp}, keys_reset=${result.keysReset}, status=${status})`
      );
    })
  );
}

/**
 * Manual trigger endpoint for testing (can be called via HTTP)
 * This allows testing the cron job without waiting for the scheduled time
 *
 * Example: curl -X POST https://your-worker.dev/api/cron/test/monthly-reset
 *
 * Note: This should be secured or removed in production environments
 */
export async function manualTrigger(env: Env): Promise<Response> {
  const result = await monthlyUsageReset(env);

  if (result.success) {
    return new Response(
      JSON.stringify({
        message: 'Monthly usage reset completed successfully',
        keysReset: result.keysReset,
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
        error: 'Monthly usage reset failed',
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
