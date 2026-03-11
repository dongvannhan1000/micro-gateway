import { Hono } from 'hono';
import { Env, Variables } from '../types';

const alerts = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /projects/:id/alerts
alerts.get('/', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('projectId');

    try {
        const { results } = await c.env.DB.prepare(`
            SELECT * FROM alert_rules 
            WHERE project_id = ? AND project_id IN (SELECT id FROM projects WHERE user_id = ?)
            ORDER BY created_at DESC
        `).bind(projectId, user.id).all();

        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

// POST /projects/:id/alerts
alerts.post('/', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('projectId');
    const { type, threshold, action, target } = await c.req.json();

    if (!type || !action) return c.json({ error: 'Missing required fields' }, 400);

    try {
        const id = crypto.randomUUID();
        await c.env.DB.prepare(`
            INSERT INTO alert_rules (id, project_id, type, threshold, action, target, is_enabled)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        `).bind(id, projectId, type, threshold || 0, action, target).run();

        return c.json({ id, success: true }, 201);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

// DELETE /projects/:id/alerts/:alertId
alerts.delete('/:alertId', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('projectId');
    const alertId = c.req.param('alertId');

    try {
        const result = await c.env.DB.prepare(`
            DELETE FROM alert_rules 
            WHERE id = ? AND project_id = ? AND project_id IN (SELECT id FROM projects WHERE user_id = ?)
        `).bind(alertId, projectId, user.id).run();

        if (result.meta.changes === 0) return c.json({ error: 'Not found' }, 404);
        return c.json({ success: true });
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

// GET /projects/:id/alerts/history
alerts.get('/history', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('projectId');

    try {
        const { results } = await c.env.DB.prepare(`
            SELECT h.*, r.type as rule_type
            FROM alert_history h
            JOIN alert_rules r ON h.rule_id = r.id
            WHERE h.project_id = ? AND h.project_id IN (SELECT id FROM projects WHERE user_id = ?)
            ORDER BY h.triggered_at DESC
            LIMIT 50
        `).bind(projectId, user.id).all();

        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

export { alerts as alertRouter };
