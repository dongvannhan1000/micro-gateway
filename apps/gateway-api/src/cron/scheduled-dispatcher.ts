/**
 * Scheduled Cron Dispatcher
 *
 * Cloudflare Workers only allows ONE `scheduled` export, so this dispatcher
 * routes cron events to the appropriate handler based on the cron expression.
 *
 * Supported cron schedules (configured in wrangler.toml):
 * - Monthly reset: 1st day of every month at midnight
 * - Provider health checks: every 5 minutes
 *
 * Documentation: https://developers.cloudflare.com/workers/configuration/cron-triggers/
 */

import { Env } from '../types';
import { scheduledMonthlyReset } from './monthly-reset';
import { scheduledHealthCheck } from './health-check';

// Cloudflare Workers types
interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Main scheduled handler that dispatches to appropriate cron job
 * This is the ONLY scheduled export allowed by Cloudflare Workers
 *
 * @param event - Scheduled event with cron property
 * @param env - Cloudflare Workers environment bindings
 * @param ctx - Execution context (for waitUntil, etc.)
 */
export async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const cronExpression = event.cron;

  console.log(
    `[CronDispatcher] Action: cron_triggered ` +
    `(Metadata: cron="${cronExpression}", scheduled_time=${event.scheduledTime})`
  );

  // Route to appropriate handler based on cron expression
  if (cronExpression === '0 0 1 * *') {
    // Monthly usage reset (1st day of every month at midnight)
    console.log('[CronDispatcher] Action: routing_to_monthly_reset');
    await scheduledMonthlyReset(event, env, ctx);
  } else if (cronExpression === '*/5 * * * *') {
    // Provider health checks (every 5 minutes)
    console.log('[CronDispatcher] Action: routing_to_health_check');
    await scheduledHealthCheck(event, env, ctx);
  } else {
    console.error(
      `[CronDispatcher] Action: unknown_cron_schedule ` +
      `(Metadata: cron="${cronExpression}")`
    );
  }
}
