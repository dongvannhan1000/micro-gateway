import { Env } from '../types';

export interface RequestMetrics {
    requestId: string;
    timestamp: string;
    projectId: string;
    apiKeyId: string;
    provider?: string;
    model?: string;
    duration: number;
    status: 'success' | 'error';
    error?: string;
    tokens?: { input: number; output: number };
    cost?: number;
}

/**
 * Store metrics in D1 database for long-term retention
 * Sampling: Only store 10% of requests to stay within free tier
 */
export async function storeMetrics(
    env: Env,
    metrics: RequestMetrics
): Promise<void> {
    // Sample 10% of requests to reduce D1 usage
    if (Math.random() > 0.1) {
        return;
    }

    try {
        await env.DB.prepare(`
            INSERT INTO metrics (request_id, timestamp, project_id, api_key_id, provider, model, duration, status, error, input_tokens, output_tokens, cost)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            metrics.requestId,
            metrics.timestamp,
            metrics.projectId,
            metrics.apiKeyId,
            metrics.provider || null,
            metrics.model || null,
            metrics.duration,
            metrics.status,
            metrics.error || null,
            metrics.tokens?.input || null,
            metrics.tokens?.output || null,
            metrics.cost || null
        ).run();
    } catch (error) {
        // Fail gracefully - don't block requests if metrics storage fails
        console.error('[Metrics] Failed to store metrics:', error);
    }
}

/**
 * Get aggregated metrics for a project
 */
export async function getProjectMetrics(
    env: Env,
    projectId: string,
    hours: number = 24
): Promise<{
    totalRequests: number;
    avgDuration: number;
    errorRate: number;
    totalCost: number;
}> {
    try {
        const result = await env.DB.prepare(`
            SELECT
                COUNT(*) as total_requests,
                AVG(duration) as avg_duration,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
                SUM(cost) as total_cost
            FROM metrics
            WHERE project_id = ?
            AND timestamp > datetime('now', '-' || ? || ' hours')
        `).bind(projectId, hours).first();

        return {
            totalRequests: result?.total_requests as number || 0,
            avgDuration: result?.avg_duration as number || 0,
            errorRate: result?.total_requests > 0
                ? (result?.errors as number || 0) / (result?.total_requests as number)
                : 0,
            totalCost: result?.total_cost as number || 0
        };
    } catch (error) {
        console.error('[Metrics] Failed to get project metrics:', error);
        return {
            totalRequests: 0,
            avgDuration: 0,
            errorRate: 0,
            totalCost: 0
        };
    }
}
