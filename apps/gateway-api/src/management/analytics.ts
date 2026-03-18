import { Hono } from 'hono';
import { Env, Variables } from '../types';

const analytics = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /projects/:projectId/analytics/summary
// Returns high-level metrics from user's first request to now
analytics.get('/summary', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('projectId')!;

    try {
        const stats: any = await repos.requestLog.getAnalyticsSummary(projectId, user.id);

        if (!stats) return c.json({ totalRequests: 0, totalCost: 0, avgLatency: 0, securityEvents: 0 });

        return c.json({
            totalRequests: stats.total_requests || 0,
            totalCost: stats.total_cost || 0,
            avgLatency: stats.avg_latency || 0,
            totalPromptTokens: stats.total_prompt_tokens || 0,
            totalCompletionTokens: stats.total_completion_tokens || 0,
            totalTokens: stats.total_tokens || 0,
            securityEvents: stats.security_events || 0
        });
    } catch (err: any) {
        console.error('[Analytics] Summary Error:', err.message, err.stack);
        return c.json({ error: 'Failed to fetch summary' }, 500);
    }
});

// GET /projects/:projectId/analytics/usage
// Returns daily usage and cost data from user's first request to now
analytics.get('/usage', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('projectId')!;

    try {
        const results = await repos.requestLog.getDailyUsage(projectId, user.id);
        return c.json(results);
    } catch (err: any) {
        console.error('[Analytics] Usage Error:', err.message, err.stack);
        return c.json({ error: 'Failed to fetch usage data' }, 500);
    }
});

// GET /projects/:projectId/analytics/security
// Returns recent security-related logs (blocked requests)
analytics.get('/security', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('projectId')!;

    try {
        const results = await repos.requestLog.getSecurityLogs(projectId, user.id, 50);
        return c.json(results);
    } catch (err: any) {
        console.error('[Analytics] Security Error:', err.message, err.stack);
        return c.json({ error: 'Failed to fetch security logs' }, 500);
    }
});

export { analytics as analyticsRouter };
