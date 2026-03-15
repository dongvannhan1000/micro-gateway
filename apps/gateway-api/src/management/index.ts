import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { sessionAuth } from '../middleware/session-auth';
import { ipRateLimiter } from '../middleware/ip-rate-limiter';
import { generateGatewayKey, hashGatewayKey } from '../utils/crypto';
import { syncPricingFromLiteLLM } from './sync-pricing';
import { alertRouter } from './alerts';
import { analyticsRouter } from './analytics';

const management = new Hono<{ Bindings: Env; Variables: Variables }>();

// SECURITY FIX: Apply IP-based rate limiting to prevent brute force attacks on authentication
// Limits: 10 requests per minute per IP address
management.use('*', ipRateLimiter);

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
    const repos = c.get('repos')!;
    try {
        const results = await repos.gatewayKey.findAllByUser(user.id);
        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed to fetch global gateway keys' }, 500);
    }
});

// --- Projects ---

management.get('/projects', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    try {
        const results = await repos.project.findAllByUser(user.id);
        return c.json(results);
    } catch (err: any) {
        console.error('[Management] Failed to fetch projects:', err);
        return c.json({ error: 'Failed' }, 500);
    }
});

management.post('/projects', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const { name, description } = await c.req.json();
    const id = crypto.randomUUID();
    try {
        await repos.project.create(id, user.id, name, description);
        return c.json({ id, name, description }, 201);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

management.get('/projects/:id', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const id = c.req.param('id');
    try {
        const project = await repos.project.findByIdAndUser(id, user.id);
        if (!project) return c.json({ error: 'Project not found' }, 404);
        return c.json(project);
    } catch (err) {
        console.error('[Management] Failed to fetch project detail:', err);
        return c.json({ error: 'Failed' }, 500);
    }
});

management.put('/projects/:id', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const id = c.req.param('id');
    const { name, description, model_aliases, pii_scrubbing_level, pii_scrubbing_enabled } = await c.req.json();

    // Validate pii_scrubbing_level if provided
    if (pii_scrubbing_level && !['low', 'medium', 'high'].includes(pii_scrubbing_level)) {
        return c.json({ error: 'Invalid pii_scrubbing_level. Must be one of: low, medium, high' }, 400);
    }

    try {
        const changes = await repos.project.update(id, user.id, {
            name,
            description,
            model_aliases,
            pii_scrubbing_level,
            pii_scrubbing_enabled
        });
        if (changes === 0) return c.json({ error: 'Project not found' }, 404);
        return c.json({ success: true });
    } catch (err) {
        console.error('[Management] Failed to update project:', err);
        return c.json({ error: 'Failed to update project' }, 500);
    }
});

// --- Provider Configs ---

management.get('/projects/:id/provider-configs', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('id');
    try {
        const results = await repos.providerConfig.findByProject(projectId, user.id);
        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed' }, 500);
    }
});

management.post('/projects/:id/provider-configs', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('id');
    const { provider, api_key } = await c.req.json();

    if (!provider || !api_key) return c.json({ error: 'Missing provider or key' }, 400);

    // Encryption secret (should match the one in gateway proxy)
    const secret = c.env.ENCRYPTION_SECRET;

    if (!secret) {
        console.error('[Management] Action: save_provider_config failed (Metadata: reason=ENCRYPTION_SECRET_missing)');
        return c.json({ error: 'Internal Server Error: Encryption not configured' }, 500);
    }

    const encryptedKey = await import('../utils/crypto').then(m => m.encryptProviderKey(api_key, secret));

    try {
        const id = crypto.randomUUID();

        // Check if any provider is already set as default for this project
        const hasDefault = await repos.providerConfig.hasDefault(projectId);
        const isDefault = hasDefault ? 0 : 1;

        // UPSERT behavior for provider config per project
        await repos.providerConfig.upsert({
            id,
            projectId,
            provider,
            apiKeyEncrypted: encryptedKey,
            isDefault,
        });

        return c.json({ success: true });
    } catch (err: any) {
        console.error('[Management] Action: save_provider_config error (Metadata: message=' + err.message + ')');
        return c.json({ error: 'Failed to save provider config' }, 500);
    }
});

management.delete('/projects/:id/provider-configs/:provider', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const { id: projectId, provider } = c.req.param();

    try {
        const changes = await repos.providerConfig.delete(projectId, provider, user.id);
        if (changes === 0) return c.json({ error: 'Not found' }, 404);
        return c.json({ success: true, message: 'Provider config deleted' });
    } catch (err) {
        console.error('[Management] Failed to delete provider config:', err);
        return c.json({ error: 'Failed to delete' }, 500);
    }
});

// --- Gateway Keys ---

management.get('/projects/:id/gateway-keys', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('id');

    try {
        const results = await repos.gatewayKey.findByProject(projectId, user.id);
        return c.json(results);
    } catch (err) {
        return c.json({ error: 'Failed to fetch project keys' }, 500);
    }
});

management.post('/projects/:id/gateway-keys', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const projectId = c.req.param('id');
    const { name, monthly_limit_usd, rate_limit_per_min, rate_limit_per_day } = await c.req.json();

    // Verify project ownership
    const exists = await repos.project.existsForUser(projectId, user.id);
    if (!exists) return c.json({ error: 'Unauthorized' }, 403);

    const rawKey = generateGatewayKey();
    const hashedKey = await hashGatewayKey(rawKey);
    const keyHint = `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`;
    const keyId = crypto.randomUUID();

    try {
        await repos.gatewayKey.create({
            id: keyId,
            projectId,
            keyHash: hashedKey,
            keyHint: keyHint,
            name,
            monthlyLimitUsd: monthly_limit_usd || 0,
            rateLimitPerMin: rate_limit_per_min || 60,
            rateLimitPerDay: rate_limit_per_day || 10000,
        });

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
    const repos = c.get('repos')!;
    const { projectId, keyId } = c.req.param();

    try {
        const changes = await repos.gatewayKey.revoke(keyId, projectId, user.id);
        if (changes === 0) return c.json({ error: 'Not found' }, 404);
        return c.json({ success: true });
    } catch (err) {
        return c.json({ error: 'Failed to revoke key' }, 500);
    }
});

// --- Security Maintenance ---

/**
 * Migration endpoint to re-encrypt legacy provider keys with new HKDF-based derivation.
 * Only accessible to authenticated managers.
 */
management.post('/security/migrate-keys', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;
    const secret = c.env.ENCRYPTION_SECRET;

    const { decryptProviderKey, encryptProviderKey } = await import('../utils/crypto');

    try {
        // 1. Fetch all provider configs for this user
        const configs = await repos.providerConfig.findAllByUser(user.id);

        let updatedCount = 0;
        let failCount = 0;

        for (const config of configs as any[]) {
            try {
                const encryptedBase64 = config.api_key_encrypted;
                const binary = atob(encryptedBase64);
                
                // If it doesn't start with 0x01 (HKDF version marker), it's legacy
                if (binary.charCodeAt(0) !== 0x01) {
                    console.log(`[Management] [Security] Migrating legacy key for provider: ${config.provider}`);
                    
                    // Decrypt using legacy fallback (built into decryptProviderKey)
                    const plainKey = await decryptProviderKey(encryptedBase64, secret);
                    
                    // Re-encrypt using new HKDF format
                    const newEncrypted = await encryptProviderKey(plainKey, secret);
                    
                    // Update DB
                    await repos.providerConfig.updateEncryptedKey(config.id, newEncrypted);
                    
                    updatedCount++;
                }
            } catch (err: any) {
                console.error(`[Management] [Security] Failed to migrate key ${config.id}:`, err.message);
                failCount++;
            }
        }

        return c.json({
            success: true,
            migrated: updatedCount,
            failed: failCount,
            message: `Security migration complete. ${updatedCount} keys upgraded to HKDF-AES-256-GCM.`
        });

    } catch (err: any) {
        console.error('[Management] [Security] Migration error:', err);
        return c.json({ error: 'Security migration failed' }, 500);
    }
});

// --- Waitlist Admin (Managed Version) ---

/**
 * GET /api/waitlist/export
 * Export waitlist as CSV (Admin only)
 * Requires authentication
 */
management.get('/waitlist/export', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;

    // TODO: Add admin check (you can add a field to users table: is_admin)
    // For now, anyone authenticated can export

    try {
        const csv = await repos.waitlist.getCSV();

        c.header('Content-Type', 'text/csv');
        c.header('Content-Disposition', `attachment; filename="waitlist-${Date.now()}.csv"`);

        return c.body(csv);

    } catch (error: any) {
        console.error('[Management] [Waitlist] Export error:', error);
        return c.json({ error: 'Failed to export waitlist' }, 500);
    }
});

/**
 * GET /api/waitlist/stats
 * Get waitlist statistics (Admin only)
 */
management.get('/waitlist/stats', async (c) => {
    const user = c.get('user')!;
    const repos = c.get('repos')!;

    try {
        const count = await repos.waitlist.count();
        const recent = await repos.waitlist.findAll();

        return c.json({
            total: count,
            recent: recent.slice(0, 10), // Last 10 signups
            exportUrl: '/api/waitlist/export'
        });

    } catch (error: any) {
        console.error('[Management] [Waitlist] Stats error:', error);
        return c.json({ error: 'Failed to fetch stats' }, 500);
    }
});

export { management as managementRouter };
