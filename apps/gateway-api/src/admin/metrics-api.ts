import { Hono } from 'hono';
import { adminAuth } from '../middleware/admin-auth';
import { getProjectMetrics } from '../monitoring/metrics';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /api/management/metrics
 * Protected endpoint for fetching system metrics
 * Requires admin authentication
 */
app.get('/api/management/metrics', adminAuth, async (c) => {
    try {
        // Get query parameters
        const hours = parseInt(c.req.query('hours') || '24');
        const projectId = c.req.query('projectId');

        let metrics;

        if (projectId) {
            // Get metrics for specific project
            metrics = await getProjectMetrics(c.env, projectId, hours);
        } else {
            // Get system-wide metrics
            metrics = await getSystemMetrics(c.env, hours);
        }

        return c.json(metrics);

    } catch (error) {
        console.error('[MetricsAPI] Error fetching metrics:', error);
        return c.json({
            error: {
                message: 'Failed to fetch metrics',
                type: 'internal_error',
                code: 'metrics_fetch_failed'
            }
        }, 500);
    }
});

/**
 * Get system-wide metrics
 */
async function getSystemMetrics(env: Env, hours: number): Promise<{
    totalRequests: number;
    avgDuration: number;
    errorRate: number;
    activeProjects: number;
    providerHealth: Record<string, {
        status: string;
        latency: number;
        errorRate: number;
        uptime: number;
    }>;
}> {
    try {
        // Get aggregated metrics from D1
        const result = await env.DB.prepare(`
            SELECT
                COUNT(*) as total_requests,
                AVG(duration) as avg_duration,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
                COUNT(DISTINCT project_id) as active_projects
            FROM metrics
            WHERE timestamp > datetime('now', '-' || ? || ' hours')
        `).bind(hours).first();

        // Get provider health from KV (stored by health check cron job)
        const providers = ['openai', 'anthropic', 'google', 'deepseek'];
        const providerHealth: Record<string, any> = {};

        for (const provider of providers) {
            try {
                const healthKey = `provider_health:${provider}`;
                const healthData = await env.RATE_LIMIT_KV.get(healthKey, 'json');

                if (healthData) {
                    providerHealth[provider] = healthData;
                } else {
                    // Default to unknown status if no data
                    providerHealth[provider] = {
                        status: 'unknown',
                        latency: 0,
                        errorRate: 0,
                        uptime: 100
                    };
                }
            } catch (kvError) {
                console.error(`[MetricsAPI] Failed to get health for ${provider}:`, kvError);
                providerHealth[provider] = {
                    status: 'unknown',
                    latency: 0,
                    errorRate: 0,
                    uptime: 100
                };
            }
        }

        return {
            totalRequests: result?.total_requests as number || 0,
            avgDuration: result?.avg_duration as number || 0,
            errorRate: result?.total_requests > 0
                ? (result?.errors as number || 0) / (result?.total_requests as number)
                : 0,
            activeProjects: result?.active_projects as number || 0,
            providerHealth
        };

    } catch (error) {
        console.error('[MetricsAPI] Failed to get system metrics:', error);
        return {
            totalRequests: 0,
            avgDuration: 0,
            errorRate: 0,
            activeProjects: 0,
            providerHealth: {}
        };
    }
}

export default app;
