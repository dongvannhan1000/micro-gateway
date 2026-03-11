import { Hono } from 'hono';
import { Env, Variables } from '../types';

const analytics = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /projects/:projectId/analytics/summary
// Returns high-level metrics for the last 30 days
analytics.get('/summary', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('projectId');

    try {
        const stats = await c.env.DB.prepare(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(cost_usd) as total_cost,
                AVG(latency_ms) as avg_latency,
                COUNT(CASE WHEN prompt_injection_score >= 0.7 OR status_code = 403 THEN 1 END) as security_events
            FROM request_logs
            WHERE project_id = ? 
            AND created_at >= date('now', '-30 days')
            AND project_id IN (SELECT id FROM projects WHERE user_id = ?)
        `).bind(projectId, user.id).first() as any;

        return c.json({
            totalRequests: stats.total_requests || 0,
            totalCost: stats.total_cost || 0,
            avgLatency: stats.avg_latency || 0,
            securityEvents: stats.security_events || 0
        });
    } catch (err) {
        return c.json({ error: 'Failed to fetch summary' }, 500);
    }
});

// GET /projects/:projectId/analytics/usage
// Returns daily usage and cost data for the last 14 days
analytics.get('/usage', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('projectId');

    try {
        const { results } = await c.env.DB.prepare(`
            SELECT 
                date(created_at) as day,
                COUNT(*) as requests,
                SUM(cost_usd) as cost
            FROM request_logs
            WHERE project_id = ?
            AND created_at >= date('now', '-14 days')
            AND project_id IN (SELECT id FROM projects WHERE user_id = ?)
            GROUP BY day
            ORDER BY day ASC
        `).bind(projectId, user.id).all();

        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed to fetch usage data' }, 500);
    }
});

// GET /projects/:projectId/analytics/security
// Returns recent security-related logs (blocked requests)
analytics.get('/security', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('projectId');

    try {
        const { results } = await c.env.DB.prepare(`
            SELECT 
                id, model, status_code, prompt_injection_score, created_at
            FROM request_logs
            WHERE project_id = ?
            AND (prompt_injection_score >= 0.5 OR status_code = 403)
            AND project_id IN (SELECT id FROM projects WHERE user_id = ?)
            ORDER BY created_at DESC
            LIMIT 50
        `).bind(projectId, user.id).all();

        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed to fetch security logs' }, 500);
    }
});

export { analytics as analyticsRouter };
