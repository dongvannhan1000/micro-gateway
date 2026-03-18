import { Context, Next } from 'hono';
import { Env, Variables } from '../types';
import { hashGatewayKey } from '../utils/crypto';
import { Project, GatewayKey } from '@ms-gateway/db';

/**
 * Middleware to validate Gateway API Key for proxy requests
 *
 * IMPORTANT: Gateway Key Monthly Limit uses CALENDAR MONTH (different from User Monthly Requests)
 *
 * Gateway Key Limit Behavior:
 * - Resets on 1st of each month at 00:00 UTC (calendar month)
 * - Applied per individual key (each key has its own limit)
 * - Enforced HARD BLOCK when exceeded (returns 403)
 *
 * User Monthly Requests (for comparison):
 * - Rolling 30-day period from first request (personalized)
 * - Applied at user level (all keys combined)
 * - See: /api/management/user/quotas
 *
 * Example:
 * - Gateway Key created March 15: Resets April 1, May 1, June 1...
 * - User first request March 17: Period ends April 16, May 16...
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
    
    // Phase 3: Artificial delay to mitigate timing attacks
    await new Promise(resolve => setTimeout(resolve, 5));
    
    const hashedKey = await hashGatewayKey(key);
    const repos = c.get('repos')!;

    try {
        const row = await repos.gatewayKey.findByKeyHash(hashedKey);

        if (!row) {
            return c.json({
                error: {
                    message: 'Invalid or revoked API Key',
                    type: 'invalid_request_error',
                    code: 'invalid_api_key'
                }
            }, 401);
        }

        // Security: Check if key has been revoked
        if (row.revoked_at || row.status === 'revoked') {
            return c.json({
                error: {
                    message: 'Invalid or revoked API Key',
                    type: 'invalid_request_error',
                    code: 'invalid_api_key'
                }
            }, 401);
        }

        // Enforcement: Check if monthly limit is exceeded (allow when usage exactly equals limit)
        if (row.monthly_limit_usd > 0 && row.current_month_usage_usd > row.monthly_limit_usd) {
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
            rate_limit_per_min: row.rate_limit_per_min,
            rate_limit_per_day: row.rate_limit_per_day,
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
