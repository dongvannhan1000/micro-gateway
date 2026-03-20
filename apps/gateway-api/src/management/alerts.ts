import { Hono } from 'hono';
import { Env, Variables } from '../types';

const alerts = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /projects/:id/alerts
alerts.get('/', async (c) => {
    console.log('[Alerts] GET / called with path:', c.req.path);
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('projectId')!;
    console.log('[Alerts] Project ID:', projectId);

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
    const { type, scope, gateway_key_id, threshold, action, target } = await c.req.json();

    // Validate required fields
    if (!type || !scope || !action) {
        return c.json({ error: 'Missing required fields: type, scope, action' }, 400);
    }

    // Validate scope value
    if (!['project', 'key'].includes(scope)) {
        return c.json({ error: 'Invalid scope. Must be "project" or "key"' }, 400);
    }

    // Validate gateway_key_id when scope='key'
    if (scope === 'key') {
        if (!gateway_key_id) {
            return c.json({ error: 'gateway_key_id is required when scope="key"' }, 400);
        }

        // Verify gateway_key_id belongs to this project
        const isValidKey = await repos.alert.validateGatewayKey(gateway_key_id, projectId);
        if (!isValidKey) {
            return c.json({ error: 'Invalid gateway_key_id or key does not belong to this project' }, 400);
        }
    }

    // Ensure gateway_key_id is null when scope='project'
    if (scope === 'project' && gateway_key_id) {
        return c.json({ error: 'gateway_key_id must be null when scope="project"' }, 400);
    }

    try {
        const id = crypto.randomUUID();
        await repos.alert.createRule({
            id,
            projectId,
            type,
            scope,
            gateway_key_id,
            threshold: threshold || 0,
            action,
            target,
        });

        return c.json({ id, success: true, scope, gateway_key_id }, 201);
    } catch (err) {
        console.error('[Alerts] Failed to create rule:', err);
        return c.json({ error: 'Failed to create alert rule' }, 500);
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
