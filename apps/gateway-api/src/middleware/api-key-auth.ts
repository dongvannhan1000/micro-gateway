import { Context, Next } from 'hono';
import { Env, Variables } from '../types';
import { hashGatewayKey } from '../utils/crypto';
import { Project, GatewayKey } from '@ms-gateway/db';

/**
 * Middleware to validate Gateway API Key for proxy requests
 */
export async function gatewayKeyAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({
            error: {
                message: 'Invalid API Key',
                type: 'invalid_request_error',
                code: 'invalid_api_key'
            }
        }, 401);
    }

    const key = authHeader.split(' ')[1];
    const hashedKey = await hashGatewayKey(key);

    try {
        const { results } = await c.env.DB.prepare(`
      SELECT k.*, p.id as p_id, p.user_id, p.name as p_name, p.model_aliases
      FROM gateway_keys k
      JOIN projects p ON k.project_id = p.id
      WHERE k.key_hash = ? AND k.status = 'active'
      LIMIT 1
    `).bind(hashedKey).all();

        if (!results || results.length === 0) {
            return c.json({
                error: {
                    message: 'Invalid or revoked API Key',
                    type: 'invalid_request_error',
                    code: 'invalid_api_key'
                }
            }, 401);
        }

        const row = results[0] as any;

        // Enforcement: Check if monthly limit is exceeded
        if (row.monthly_limit_usd > 0 && row.current_month_usage_usd >= row.monthly_limit_usd) {
            return c.json({
                error: {
                    message: 'Monthly usage limit exceeded',
                    type: 'insufficient_quota',
                    code: 'usage_limit_reached'
                }
            }, 429);
        }

        // Attach current Gateway key and Project to context
        const gatewayKey: GatewayKey = {
            id: row.id,
            project_id: row.project_id,
            key_hash: row.key_hash,
            key_hint: row.key_hint,
            name: row.name,
            status: row.status,
            monthly_limit_usd: row.monthly_limit_usd,
            current_month_usage_usd: row.current_month_usage_usd,
            created_at: row.created_at,
            revoked_at: row.revoked_at
        };

        const project: Project = {
            id: row.p_id,
            user_id: row.user_id,
            name: row.p_name,
            model_aliases: row.model_aliases,
            created_at: row.created_at, // Approximate
            updated_at: row.created_at
        };

        c.set('gatewayKey', gatewayKey);
        c.set('project', project);

        await next();
    } catch (err) {
        console.error('[Gateway] [ApiKeyAuth] DB Error:', err);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
}
