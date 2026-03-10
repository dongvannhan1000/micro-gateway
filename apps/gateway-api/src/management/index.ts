import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { sessionAuth } from '../middleware/session-auth';
import { generateApiKey, hashApiKey } from '../utils/crypto';

const management = new Hono<{ Bindings: Env; Variables: Variables }>();

// All management routes require Supabase session authentication
management.use('*', sessionAuth);

// --- Projects ---

management.get('/projects', async (c) => {
    const user = c.get('user')!;
    console.log(`[GatewayService] Action: fetch_projects_start (Metadata: userId=${user.id})`);

    try {
        const { results } = await c.env.DB.prepare(`
            SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC
        `).bind(user.id).all();

        console.log(`[GatewayService] Action: fetch_projects_success (Metadata: count=${results?.length || 0})`);
        return c.json(results);
    } catch (err: any) {
        console.error(`[GatewayService] Action: fetch_projects_error (Metadata: message=${err.message})`);
        console.error(err.stack);
        return c.json({ error: 'Failed to fetch projects', details: err.message }, 500);
    }
});

management.post('/projects', async (c) => {
    const user = c.get('user')!;
    const { name, description } = await c.req.json();
    const id = crypto.randomUUID();

    try {
        await c.env.DB.prepare(`
      INSERT INTO projects (id, user_id, name, description)
      VALUES (?, ?, ?, ?)
    `).bind(id, user.id, name, description).run();

        return c.json({ id, name, description }, 201);
    } catch (err) {
        return c.json({ error: 'Failed to create project' }, 500);
    }
});

management.get('/projects/:id', async (c) => {
    const user = c.get('user')!;
    const id = c.req.param('id');

    try {
        const project = await c.env.DB.prepare(`
      SELECT * FROM projects WHERE id = ? AND user_id = ?
    `).bind(id, user.id).first();

        if (!project) return c.json({ error: 'Project not found' }, 404);
        return c.json(project);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

// --- API Keys ---

management.get('/projects/:id/keys', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('id');

    try {
        const { results } = await c.env.DB.prepare(`
      SELECT k.id, k.name, k.key_hint, k.status, k.monthly_limit_usd, k.current_month_usage_usd, k.created_at
      FROM api_keys k
      JOIN projects p ON k.project_id = p.id
      WHERE k.project_id = ? AND p.user_id = ?
    `).bind(projectId, user.id).all();
        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

management.post('/projects/:id/keys', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('id');
    const { name, monthly_limit_usd } = await c.req.json();

    // Verify project ownership
    const project = await c.env.DB.prepare(`
    SELECT id FROM projects WHERE id = ? AND user_id = ?
  `).bind(projectId, user.id).first();

    if (!project) return c.json({ error: 'Unauthorized' }, 403);

    const rawKey = generateApiKey();
    const hashedKey = await hashApiKey(rawKey);
    const keyHint = `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`;
    const keyId = crypto.randomUUID();

    try {
        await c.env.DB.prepare(`
      INSERT INTO api_keys (id, project_id, key_hash, key_hint, name, monthly_limit_usd)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(keyId, projectId, hashedKey, keyHint, name, monthly_limit_usd || 0).run();

        return c.json({
            id: keyId,
            name,
            key: rawKey, // ONLY shown once during creation
            key_hint: keyHint
        }, 201);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

management.delete('/projects/:projectId/keys/:keyId', async (c) => {
    const user = c.get('user')!;
    const { projectId, keyId } = c.req.param();

    try {
        const result = await c.env.DB.prepare(`
      UPDATE api_keys
      SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
      WHERE id = ? AND project_id = (SELECT id FROM projects WHERE id = ? AND user_id = ?)
    `).bind(keyId, projectId, user.id).run();

        if (result.meta.changes === 0) return c.json({ error: 'Not found' }, 404);
        return c.json({ success: true });
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

export { management as managementRouter };
