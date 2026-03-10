import { Context, Next } from 'hono';
import { Env, Variables } from '../types';

/**
 * Basic KV-based rate limiter (sliding window approximation)
 */
export async function rateLimiter(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const apiKey = c.get('apiKey');
    if (!apiKey) return next();

    // Simple fixed-window counter per minute
    const now = new Date();
    const minuteBucket = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    const kvKey = `rl:${apiKey.id}:${minuteBucket}`;

    try {
        const countStr = await c.env.RATE_LIMIT_KV.get(kvKey);
        const count = countStr ? parseInt(countStr) : 0;

        // Hardcoded default for Sprint 1: 60 req/min
        const limit = 60;

        if (count >= limit) {
            return c.json({
                error: {
                    message: 'Rate limit exceeded. Please try again later.',
                    type: 'requests',
                    code: 'rate_limit_exceeded'
                }
            }, 429, {
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': (60 - now.getSeconds()).toString()
            });
        }

        // Increment counter (async, don't block)
        c.executionCtx.waitUntil(c.env.RATE_LIMIT_KV.put(kvKey, (count + 1).toString(), { expirationTtl: 120 }));

        c.header('X-RateLimit-Limit', limit.toString());
        c.header('X-RateLimit-Remaining', (limit - count - 1).toString());

        await next();
    } catch (err) {
        console.error('[Gateway] [RateLimiter] KV Error:', err);
        // Fail open in case of KV issues (priority: availability)
        await next();
    }
}
