import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { sessionAuth } from '../middleware/session-auth';
import { generateGatewayKey, hashGatewayKey } from '../utils/crypto';
import { Project, GatewayKey, ProviderConfig } from '@ms-gateway/db';
import { syncPricingFromLiteLLM } from './sync-pricing';
import { alertRouter } from './alerts';
import { analyticsRouter } from './analytics';

const management = new Hono<{ Bindings: Env; Variables: Variables }>();

// All management routes require Supabase session authentication
management.use('*', sessionAuth);

// Pricing Sync (Admin/Internal)
management.post('/pricing/sync', syncPricingFromLiteLLM);

// Alerts (Nested)
management.route('/projects/:projectId/alerts', alertRouter);

// Analytics (Nested)
management.route('/projects/:projectId/analytics', analyticsRouter);

// --- Gateway Keys (Global) ---

management.get('/gateway-keys', async (c) => {
    const user = c.get('user')!;
    try {
        const { results } = await c.env.DB.prepare(`
      SELECT k.id, k.name, k.key_hint, k.status, k.monthly_limit_usd, k.current_month_usage_usd, k.rate_limit_per_min, k.rate_limit_per_day, k.created_at, p.name as project_name, p.id as project_id
      FROM gateway_keys k
      JOIN projects p ON k.project_id = p.id
      WHERE p.user_id = ? AND k.status = 'active'
      ORDER BY k.created_at DESC
    `).bind(user.id).all();
        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed to fetch global gateway keys' }, 500);
    }
});

// --- Projects ---
// ... (existing projects routes) ...
// (I will keep the existing routes but add the new ones after)

management.get('/projects', async (c) => {
    const user = c.get('user')!;
    try {
        const { results } = await c.env.DB.prepare(`
            SELECT 
                p.*,
                COUNT(r.id) as total_requests,
                TOTAL(r.cost_usd) as total_cost,
                AVG(r.latency_ms) as avg_latency,
                COUNT(CASE WHEN r.prompt_injection_score >= 0.7 OR r.status_code = 403 THEN 1 END) as security_events
            FROM projects p
            LEFT JOIN request_logs r ON p.id = r.project_id
            WHERE p.user_id = ?
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `).bind(user.id).all();
        return c.json(results);
    } catch (err: any) {
        console.error('[Management] Failed to fetch projects:', err);
        return c.json({ error: 'Failed' }, 500);
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
        return c.json({ error: 'Failed' }, 500);
    }
});

management.get('/projects/:id', async (c) => {
    const user = c.get('user')!;
    const id = c.req.param('id');
    try {
        const project = await c.env.DB.prepare(`
      SELECT 
        p.*,
        COUNT(r.id) as total_requests,
        TOTAL(r.cost_usd) as total_cost,
        AVG(r.latency_ms) as avg_latency,
        COUNT(CASE WHEN r.prompt_injection_score >= 0.7 OR r.status_code = 403 THEN 1 END) as security_events
      FROM projects p
      LEFT JOIN request_logs r ON p.id = r.project_id
      WHERE p.id = ? AND p.user_id = ?
      GROUP BY p.id
    `).bind(id, user.id).first();
        if (!project) return c.json({ error: 'Project not found' }, 404);
        return c.json(project);
    } catch (err) {
        console.error('[Management] Failed to fetch project detail:', err);
        return c.json({ error: 'Failed' }, 500);
    }
});

management.put('/projects/:id', async (c) => {
    const user = c.get('user')!;
    const id = c.req.param('id');
    const { name, description, model_aliases } = await c.req.json();

    try {
        const result = await c.env.DB.prepare(`
      UPDATE projects 
      SET name = COALESCE(?, name), 
          description = COALESCE(?, description),
          model_aliases = COALESCE(?, model_aliases),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(name, description, model_aliases, id, user.id).run();

        if (result.meta.changes === 0) return c.json({ error: 'Project not found' }, 404);
        return c.json({ success: true });
    } catch (err) {
        return c.json({ error: 'Failed to update project' }, 500);
    }
});

// --- Provider Configs ---

management.get('/projects/:id/provider-configs', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('id');
    try {
        const { results } = await c.env.DB.prepare(`
      SELECT provider, created_at, is_default 
      FROM provider_configs 
      WHERE project_id = ? AND project_id IN (SELECT id FROM projects WHERE user_id = ?)
    `).bind(projectId, user.id).all();
        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

management.post('/projects/:id/provider-configs', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('id');
    const { provider, api_key } = await c.req.json();

    if (!provider || !api_key) return c.json({ error: 'Missing provider or key' }, 400);

    // Encryption secret (should match the one in gateway proxy)
    const secret = c.env.ENCRYPTION_SECRET || 'dev-secret-key';
    const encryptedKey = await import('../utils/crypto').then(m => m.encryptProviderKey(api_key, secret));

    try {
        const id = crypto.randomUUID();

        // 1. Check if any provider is already set as default for this project
        const existingDefault = await c.env.DB.prepare(`
            SELECT id FROM provider_configs WHERE project_id = ? AND is_default = 1 LIMIT 1
        `).bind(projectId).first();

        const isDefault = existingDefault ? 0 : 1;

        // 2. UPSERT behavior for provider config per project
        await c.env.DB.prepare(`
            INSERT INTO provider_configs (id, project_id, provider, api_key_encrypted, is_default)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(project_id, provider) DO UPDATE SET
            api_key_encrypted = excluded.api_key_encrypted,
            created_at = CURRENT_TIMESTAMP
        `).bind(id, projectId, provider, encryptedKey, isDefault).run();

        return c.json({ success: true });
    } catch (err: any) {
        console.error(err);
        return c.json({ error: 'Failed to save provider config', details: err.message }, 500);
    }
});

// --- Gateway Keys ---

management.get('/projects/:id/gateway-keys', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('id');

    try {
        const { results } = await c.env.DB.prepare(`
      SELECT k.id, k.name, k.key_hint, k.status, k.monthly_limit_usd, k.current_month_usage_usd, k.rate_limit_per_min, k.rate_limit_per_day, k.created_at
      FROM gateway_keys k
      JOIN projects p ON k.project_id = p.id
      WHERE k.project_id = ? AND p.user_id = ? AND k.status = 'active'
    `).bind(projectId, user.id).all();
        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed to fetch project keys' }, 500);
    }
});

management.post('/projects/:id/gateway-keys', async (c) => {
    const user = c.get('user')!;
    const projectId = c.req.param('id');
    const { name, monthly_limit_usd, rate_limit_per_min, rate_limit_per_day } = await c.req.json();

    // Verify project ownership
    const project = await c.env.DB.prepare(`
    SELECT id FROM projects WHERE id = ? AND user_id = ?
  `).bind(projectId, user.id).first();

    if (!project) return c.json({ error: 'Unauthorized' }, 403);

    const rawKey = generateGatewayKey();
    const hashedKey = await hashGatewayKey(rawKey);
    const keyHint = `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`;
    const keyId = crypto.randomUUID();

    try {
        await c.env.DB.prepare(`
      INSERT INTO gateway_keys (id, project_id, key_hash, key_hint, name, monthly_limit_usd, rate_limit_per_min, rate_limit_per_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
            keyId,
            projectId,
            hashedKey,
            keyHint,
            name,
            monthly_limit_usd || 0,
            rate_limit_per_min || 60,
            rate_limit_per_day || 10000
        ).run();

        return c.json({
            id: keyId,
            name,
            key: rawKey, // ONLY shown once during creation
            key_hint: keyHint
        }, 201);
    } catch (err) {
        return c.json({ error: 'Failed to generate key' }, 500);
    }
});

management.delete('/projects/:projectId/gateway-keys/:keyId', async (c) => {
    const user = c.get('user')!;
    const { projectId, keyId } = c.req.param();

    try {
        const result = await c.env.DB.prepare(`
      UPDATE gateway_keys
      SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
      WHERE id = ? AND project_id = (SELECT id FROM projects WHERE id = ? AND user_id = ?)
    `).bind(keyId, projectId, user.id).run();

        if (result.meta.changes === 0) return c.json({ error: 'Not found' }, 404);
        return c.json({ success: true });
    } catch (err) {
        return c.json({ error: 'Failed to revoke key' }, 500);
    }
});

export { management as managementRouter };
