import { Context, Next } from 'hono';
import { Env, Variables } from '../types';

/**
 * Basic KV-based rate limiter (sliding window approximation)
 */
export async function rateLimiter(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const gatewayKey = c.get('gatewayKey');
    if (!gatewayKey) return next();

    const now = new Date();

    // 1. Per-minute limit
    const minBucket = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    const minKey = `rl:min:${gatewayKey.id}:${minBucket}`;

    // 2. Per-day limit
    const dayBucket = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const dayKey = `rl:day:${gatewayKey.id}:${dayBucket}`;

    const minLimit = gatewayKey.rate_limit_per_min || 60;
    const dayLimit = gatewayKey.rate_limit_per_day || 10000;

    try {
        // Fetch both counters in parallel
        const [minCountStr, dayCountStr] = await Promise.all([
            c.env.RATE_LIMIT_KV.get(minKey),
            c.env.RATE_LIMIT_KV.get(dayKey)
        ]);

        const minCount = minCountStr ? parseInt(minCountStr) : 0;
        const dayCount = dayCountStr ? parseInt(dayCountStr) : 0;

        // Check Day Limit first
        if (dayCount >= dayLimit) {
            console.warn(`[Gateway] [RateLimiter] Day limit hit for key ${gatewayKey.id} (${dayCount}/${dayLimit})`);
            return c.json({
                error: {
                    message: 'Daily rate limit exceeded. Please try again tomorrow.',
                    type: 'requests',
                    code: 'daily_rate_limit_exceeded'
                }
            }, 429, {
                'X-RateLimit-Limit-Day': dayLimit.toString(),
                'X-RateLimit-Remaining-Day': '0',
                'Retry-After': (86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds())).toString()
            });
        }

        // Check Minute Limit
        if (minCount >= minLimit) {
            console.warn(`[Gateway] [RateLimiter] Minute limit hit for key ${gatewayKey.id} (${minCount}/${minLimit})`);
            return c.json({
                error: {
                    message: 'Rate limit exceeded. Please try again later.',
                    type: 'requests',
                    code: 'rate_limit_exceeded'
                }
            }, 429, {
                'X-RateLimit-Limit': minLimit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': (60 - now.getSeconds()).toString(),
                'Retry-After': (60 - now.getSeconds()).toString()
            });
        }

        // Increment both counters (async)
        c.executionCtx.waitUntil(Promise.all([
            c.env.RATE_LIMIT_KV.put(minKey, (minCount + 1).toString(), { expirationTtl: 120 }),
            c.env.RATE_LIMIT_KV.put(dayKey, (dayCount + 1).toString(), { expirationTtl: 172800 }) // 2 days to be safe
        ]));

        c.header('X-RateLimit-Limit', minLimit.toString());
        c.header('X-RateLimit-Remaining', (minLimit - minCount - 1).toString());
        c.header('X-RateLimit-Limit-Day', dayLimit.toString());
        c.header('X-RateLimit-Remaining-Day', (dayLimit - dayCount - 1).toString());

        await next();
    } catch (err) {
        console.error('[Gateway] [RateLimiter] KV Error:', err);
        await next();
    }
}
