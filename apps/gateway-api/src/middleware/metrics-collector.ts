import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';
import { storeMetrics } from '../monitoring/metrics';

/**
 * Metrics collector middleware
 * Tracks request duration, status, errors for monitoring and debugging
 * Samples 10% of requests to stay within D1 free tier limits
 */
export const metricsCollector: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
    const startTime = Date.now();
    const requestId = c.get('correlationId');
    const project = c.get('project');
    const apiKeyId = c.get('gatewayKey')?.id;

    // Track request start
    let status: 'success' | 'error' = 'success';
    let error: string | undefined;

    try {
        await next();
        return; // Let response proceed normally
    } catch (err) {
        status = 'error';
        error = err instanceof Error ? err.message : String(err);
        throw err; // Re-throw to let error handlers deal with it
    } finally {
        // Calculate duration
        const duration = Date.now() - startTime;

        // Only collect metrics if we have a project
        if (project && apiKeyId && requestId) {
            const provider = c.get('provider');
            const model = c.get('model');

            // Store metrics asynchronously (don't block response)
            try {
                c.executionCtx.waitUntil(
                    storeMetrics(c.env, {
                        requestId,
                        timestamp: new Date().toISOString(),
                        projectId: project.id,
                        apiKeyId,
                        provider,
                        model,
                        duration,
                        status,
                        error
                    })
                );
            } catch {
                // Execution context not available (e.g., in tests), store synchronously
                // This is fine for tests, in production executionCtx will be available
                await storeMetrics(c.env, {
                    requestId,
                    timestamp: new Date().toISOString(),
                    projectId: project.id,
                    apiKeyId,
                    provider,
                    model,
                    duration,
                    status,
                    error
                });
            }
        }
    }
};
