import { Hono } from 'hono';
import { adminAuth } from '../middleware/admin-auth';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /api/admin/observability/config
 *
 * Returns observability configuration for the admin dashboard.
 * The dashboard uses this config to query traces from the observability platform.
 *
 * Protected by admin authentication.
 */
app.get('/api/admin/observability/config', adminAuth, async (c) => {
    const config = {
        traces: {
            enabled: true,
            samplingRate: 0.1, // 10% sampling
            customAttributes: [
                'project_id',
                'api_key_id',
                'correlation_id',
                'provider',
                'model'
            ]
        },
        export: {
            platform: c.env.OTEL_EXPORTER_PLATFORM || 'none', // 'grafana', 'honeycomb', 'axiom', 'none'
            endpoint: c.env.OTEL_EXPORTER_OTLP_ENDPOINT || null,
            // Never expose the authentication headers!
            hasCredentials: !!c.env.OTEL_EXPORTER_OTLP_HEADERS
        },
        dashboard: {
            grafana: {
                embedded: c.env.GRAFANA_EMBEDDED_URL || null,
                iframeUrl: c.env.GRAFANA_EMBEDDED_URL || null
            },
            // Query API endpoints for dashboard to use
            queryApi: {
                honeycomb: c.env.OTEL_EXPORTER_PLATFORM === 'honeycomb' ? {
                    baseUrl: 'https://api.honeycomb.io/1',
                    dataset: 'gateway-traces'
                } : null,
                axiom: c.env.OTEL_EXPORTER_PLATFORM === 'axiom' ? {
                    baseUrl: `https://api.axiom.co/v1/datasets/${c.env.AXIOM_DATASET || 'gateway-traces'}/query`
                } : null
            }
        },
        // Fallback: Query D1 directly for business metrics
        businessMetrics: {
            directQuery: true,
            available: true
        }
    };

    return c.json(config);
});

/**
 * GET /api/admin/observability/metrics
 *
 * Fallback endpoint for business metrics (costs, tokens) from D1.
 * Traces handle request metrics, but business metrics still come from D1.
 *
 * Protected by admin authentication.
 */
app.get('/api/admin/observability/metrics', adminAuth, async (c) => {
    try {
        const hours = parseInt(c.req.query('hours') || '24');
        const projectId = c.req.query('projectId');

        // Business metrics from D1 (costs, tokens, etc.)
        const baseQuery = `
            SELECT
                COUNT(*) as total_requests,
                SUM(prompt_tokens) as total_prompt_tokens,
                SUM(completion_tokens) as total_completion_tokens,
                SUM(total_tokens) as total_tokens,
                SUM(cost_usd) as total_cost_usd,
                AVG(latency_ms) as avg_latency_ms,
                COUNT(DISTINCT project_id) as active_projects
            FROM request_logs
            WHERE created_at > datetime('now', '-' || ? || ' hours')
        `;

        let query = baseQuery;
        const params = [hours];

        if (projectId) {
            query += ` AND project_id = ?`;
            params.push(projectId);
        }

        const result = await c.env.DB.prepare(query).bind(...params).first();

        // Provider health from KV (stored by health check cron)
        const providers = ['openai', 'anthropic', 'google', 'deepseek', 'groq', 'together'];
        const providerHealth: Record<string, any> = {};

        for (const provider of providers) {
            try {
                const healthKey = `provider_health:${provider}`;
                const healthData = await c.env.RATE_LIMIT_KV.get(healthKey, 'json');

                if (healthData) {
                    providerHealth[provider] = healthData;
                } else {
                    providerHealth[provider] = {
                        status: 'unknown',
                        latency: 0,
                        errorRate: 0,
                        uptime: 100,
                        lastCheck: null
                    };
                }
            } catch (kvError) {
                console.error(`[Observability] Failed to get health for ${provider}:`, kvError);
                providerHealth[provider] = {
                    status: 'error',
                    latency: 0,
                    errorRate: 0,
                    uptime: 100,
                    lastCheck: null
                };
            }
        }

        return c.json({
            businessMetrics: {
                totalRequests: result?.total_requests || 0,
                totalPromptTokens: result?.total_prompt_tokens || 0,
                totalCompletionTokens: result?.total_completion_tokens || 0,
                totalTokens: result?.total_tokens || 0,
                totalCostUsd: result?.total_cost_usd || 0,
                avgLatencyMs: result?.avg_latency_ms || 0,
                activeProjects: result?.active_projects || 0
            },
            providerHealth,
            // Note: Request metrics (duration, error rate, etc.) come from traces
            // Use the observability platform UI or query API for those
            traceMetrics: {
                source: 'cloudflare_workers_traces',
                platform: c.env.OTEL_EXPORTER_PLATFORM || 'none',
                queryUrl: getQueryUrl(c.env)
            }
        });

    } catch (error) {
        console.error('[Observability] Error fetching business metrics:', error);
        return c.json({
            error: {
                message: 'Failed to fetch business metrics',
                type: 'internal_error',
                code: 'metrics_fetch_failed'
            }
        }, 500);
    }
});

function getQueryUrl(env: Env): string | null {
    const platform = env.OTEL_EXPORTER_PLATFORM;

    if (platform === 'grafana') {
        return env.GRAFANA_DASHBOARD_URL || null;
    } else if (platform === 'honeycomb') {
        return `https://ui.honeycomb.io/${env.HONEYCOMB_TEAM}/datasets/gateway-traces`;
    } else if (platform === 'axiom') {
        return `https://app.axiom.co/${env.AXIOM_ORG_ID}/datasets/gateway-traces`;
    }

    return null;
}

export default app;
