import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';

/**
 * Bulkhead middleware - Limit concurrent requests per project
 * Uses in-memory counters with D1 persistence to avoid race conditions
 * Per-tier limits: Free=5, Pro=10, Custom=20
 *
 * Architecture:
 * - In-memory counter per Worker instance (fast, no DB race conditions)
 * - Periodic D1 sync every 30 seconds for persistence
 * - Fallback to D1 on Worker cold start
 */
const concurrentCounters = new Map<string, number>();
const lastSyncTime = new Map<string, number>();
const SYNC_INTERVAL = 30000; // 30 seconds
const CLEANUP_INTERVAL = 300000; // 5 minutes

// Export for testing
export function _resetCounters() {
    concurrentCounters.clear();
    lastSyncTime.clear();
}

// Cleanup stale entries to prevent memory leaks
function cleanupStaleEntries() {
    const now = Date.now();
    for (const [projectId, lastSync] of lastSyncTime.entries()) {
        const count = concurrentCounters.get(projectId) || 0;
        // Remove if zero concurrent requests and not accessed in 5 minutes
        if (count === 0 && (lastSync + CLEANUP_INTERVAL < now)) {
            concurrentCounters.delete(projectId);
            lastSyncTime.delete(projectId);
        }
    }
}

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupStaleEntries, CLEANUP_INTERVAL);
}

export const bulkhead: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
    const project = c.get('project');

    // Skip bulkhead if no project (shouldn't happen in normal flow)
    if (!project) {
        await next();
        return;
    }

    const limit = project.concurrent_limit || 5; // Default to free tier
    const projectId = project.id;
    const now = Date.now();

    try {
        // Initialize counter from D1 on cold start or after sync interval
        if (!concurrentCounters.has(projectId) ||
            (lastSyncTime.get(projectId) || 0) + SYNC_INTERVAL < now) {

            const result = await c.env.DB.prepare(
                'SELECT concurrent_count FROM projects WHERE id = ?'
            ).bind(projectId).first() as { concurrent_count: number } | null;

            const dbCount = result?.concurrent_count || 0;
            const memCount = concurrentCounters.get(projectId) || 0;

            // Use the higher of DB or memory to avoid losing count
            concurrentCounters.set(projectId, Math.max(dbCount, memCount));
            lastSyncTime.set(projectId, now);
        }

        const currentCount = concurrentCounters.get(projectId) || 0;

        // Check if over limit
        if (currentCount >= limit) {
            return c.json({
                error: {
                    message: `Too many concurrent requests. Limit: ${limit}, Current: ${currentCount}. Please try again.`,
                    type: 'concurrent_limit_exceeded',
                    code: 'too_many_requests'
                }
            }, 429, {
                'Retry-After': '5',
                'X-Concurrent-Limit': limit.toString(),
                'X-Concurrent-Current': currentCount.toString()
            });
        }

        // Increment in-memory counter
        concurrentCounters.set(projectId, currentCount + 1);

        // Sync to D1 periodically (async, don't block)
        if ((lastSyncTime.get(projectId) || 0) + SYNC_INTERVAL < now) {
            const correlationId = c.get('correlationId') || 'unknown';
            c.executionCtx.waitUntil(
                (async () => {
                    try {
                        const count = concurrentCounters.get(projectId) || 0;
                        await c.env.DB.prepare(
                            'UPDATE projects SET concurrent_count = ? WHERE id = ?'
                        ).bind(count, projectId).run();
                        lastSyncTime.set(projectId, Date.now());
                    } catch (error) {
                        console.error(`[Bulkhead] [${correlationId}] Failed to sync counter to D1:`, error);
                    }
                })()
            );
        }

        // Process request
        await next();

        // Decrement counter after request completes (in-memory only)
        const finalCount = concurrentCounters.get(projectId) || 0;
        concurrentCounters.set(projectId, Math.max(0, finalCount - 1));

    } catch (error) {
        const correlationId = c.get('correlationId') || 'unknown';
        console.error(`[Bulkhead] [${correlationId}] Error:`, error);
        // Fail open - don't block requests on errors
        await next();
    }
};
