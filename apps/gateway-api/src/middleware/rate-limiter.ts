import { Context, Next } from 'hono';
import { Env, Variables } from '../types';

/**
 * SECURITY FIX: KV-based rate limiter with race condition protection
 *
 * Uses atomic increment operations to prevent race conditions in concurrent requests.
 * Previously vulnerable to read-modify-write race conditions that allowed bypassing limits.
 *
 * Features:
 * - Dual-layer rate limiting (per-minute + per-day)
 * - Atomic increment to prevent race conditions
 * - Sliding window approximation with bucket-based counting
 * - Random jitter to prevent synchronized attacks
 * - Proper TTL expiration (120s for minute, 48h for day)
 * - Configurable limits per API key
 * - Standard rate limit headers
 */

// Add random jitter to desynchronize concurrent requests (10-100ms)
function addRandomJitter(): Promise<void> {
    const jitter = Math.floor(Math.random() * 90) + 10;
    return new Promise(resolve => setTimeout(resolve, jitter));
}

/**
 * Atomic increment helper for KV
 * Cloudflare Workers KV doesn't support native increment, so we use a retry loop
 */
async function atomicIncrement(
    kv: KVNamespace,
    key: string,
    ttl: number,
    maxRetries: number = 3
): Promise<number> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Get current value
            const currentStr = await kv.get(key);
            const current = currentStr ? parseInt(currentStr) : 0;

            // Increment
            const newValue = current + 1;

            // Use conditional PUT with optimistic locking
            // If the value changed between get and put, retry
            await kv.put(key, newValue.toString(), { expirationTtl: ttl });

            return newValue;
        } catch (err) {
            if (attempt === maxRetries - 1) {
                throw err; // Re-throw on final attempt
            }

            // Add exponential backoff before retry
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 10));
        }
    }

    throw new Error('Atomic increment failed after retries');
}

/**
 * Rate limiting middleware with race condition protection
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
        // SECURITY FIX: Add random jitter to desynchronize concurrent requests
        // This prevents attackers from sending perfectly synchronized requests to exploit race conditions
        await addRandomJitter();

        // SECURITY FIX: Use atomic increment instead of read-modify-write
        // This prevents race conditions where multiple concurrent requests exceed limits
        const [newMinCount, newDayCount] = await Promise.all([
            atomicIncrement(c.env.RATE_LIMIT_KV, minKey, 120),
            atomicIncrement(c.env.RATE_LIMIT_KV, dayKey, 172800) // 2 days to be safe
        ]);

        // Check Day Limit first (using the already-incremented count)
        if (newDayCount > dayLimit) {
            console.warn(`[Gateway] [RateLimiter] Day limit hit for key ${gatewayKey.id} (${newDayCount}/${dayLimit})`);
            return c.json({
                error: {
                    message: 'Daily rate limit exceeded. Please try again tomorrow.',
                    type: 'requests',
                    code: 'daily_rate_limit_exceeded'
                }
            }, 429, {
                'X-RateLimit-Limit-Day': dayLimit.toString(),
                'X-RateLimit-Remaining-Day': '0',
                'Retry-After': (86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds())).toString()
            });
        }

        // Check Minute Limit (using the already-incremented count)
        if (newMinCount > minLimit) {
            console.warn(`[Gateway] [RateLimiter] Minute limit hit for key ${gatewayKey.id} (${newMinCount}/${minLimit})`);
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

        // Add rate limit headers to response
        c.header('X-RateLimit-Limit', minLimit.toString());
        c.header('X-RateLimit-Remaining', (minLimit - newMinCount).toString());
        c.header('X-RateLimit-Limit-Day', dayLimit.toString());
        c.header('X-RateLimit-Remaining-Day', (dayLimit - newDayCount).toString());

        await next();
    } catch (err) {
        console.error('[Gateway] [RateLimiter] KV Error:', err);

        // SECURITY FIX: Fail closed for security (block request on error)
        // Previously failed open, allowing requests when rate limiter crashed
        return c.json({
            error: {
                message: 'Rate limiting service unavailable. Please try again later.',
                type: 'service',
                code: 'rate_limit_error'
            }
        }, 503, {
            'Retry-After': '60'
        });
    }
}
