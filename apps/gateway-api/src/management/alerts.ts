import { Hono } from 'hono';
import { Env, Variables } from '../types';

const alerts = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /projects/:id/alerts
alerts.get('/', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('projectId')!;

    try {
        const results = await repos.alert.findRulesByProject(projectId, user.id);
        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

// POST /projects/:id/alerts
alerts.post('/', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('projectId')!;
    const { type, threshold, action, target } = await c.req.json();

    if (!type || !action) return c.json({ error: 'Missing required fields' }, 400);

    try {
        const id = crypto.randomUUID();
        await repos.alert.createRule({
            id,
            projectId,
            type,
            threshold: threshold || 0,
            action,
            target,
        });

        return c.json({ id, success: true }, 201);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

// DELETE /projects/:id/alerts/:alertId
alerts.delete('/:alertId', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('projectId')!;
    const alertId = c.req.param('alertId');

    try {
        const changes = await repos.alert.deleteRule(alertId, projectId, user.id);
        if (changes === 0) return c.json({ error: 'Not found' }, 404);
        return c.json({ success: true });
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

// GET /projects/:id/alerts/history
alerts.get('/history', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('projectId')!;

    try {
        const results = await repos.alert.findHistory(projectId, user.id);
        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

export { alerts as alertRouter };
