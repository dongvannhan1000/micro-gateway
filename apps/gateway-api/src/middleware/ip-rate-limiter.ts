import { Context, Next } from 'hono';
import { Env, Variables } from '../types';

/**
 * SECURITY FIX: IP-based rate limiting for authentication endpoints.
 * Prevents brute force attacks, credential stuffing, and DoS on auth endpoints.
 *
 * Features:
 * - Tracks request counts by IP address using Cloudflare KV
 * - Limits: 10 requests per minute per IP
 * - SHA-256 IP hashing for GDPR compliance
 * - Uses CF-Connecting-IP header to get client IP
 * - Returns 429 Too Many Requests with Retry-After header
 */

// Rate limit configuration
const AUTH_RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60; // seconds (1 minute)
const KV_TTL = RATE_LIMIT_WINDOW + 10; // TTL slightly longer than window

/**
 * Hash IP address using SHA-256 for GDPR compliance
 * GDPR: IP addresses are PII and must be protected
 */
async function hashIP(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * IP-based rate limiting middleware
 * Apply to authentication endpoints only
 */
export async function ipRateLimiter(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    // Get client IP from Cloudflare header
    const clientIP = c.req.header('CF-Connecting-IP');

    if (!clientIP) {
        // If we can't get IP, allow request but log warning
        console.warn('[Gateway] [IPRateLimiter] No CF-Connecting-IP header found');
        return next();
    }

    try {
        // Hash IP for GDPR compliance (IP addresses are PII)
        const ipHash = await hashIP(clientIP);

        // Create rate limit key based on current minute
        const now = new Date();
        const minuteBucket = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
        const rateLimitKey = `auth:rl:${ipHash}:${minuteBucket}`;

        // Get current count
        const countStr = await c.env.RATE_LIMIT_KV.get(rateLimitKey);
        const count = countStr ? parseInt(countStr) : 0;

        // Check rate limit
        if (count >= AUTH_RATE_LIMIT) {
            console.warn(`[Gateway] [IPRateLimiter] Rate limit exceeded for IP (hash=${ipHash.substring(0, 8)}...)`);

            return c.json({
                error: {
                    message: 'Too many authentication attempts. Please try again later.',
                    type: 'authentication',
                    code: 'auth_rate_limit_exceeded'
                }
            }, 429, {
                'Retry-After': RATE_LIMIT_WINDOW.toString(),
                'X-RateLimit-Limit': AUTH_RATE_LIMIT.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': (60 - now.getSeconds()).toString()
            });
        }

        // Increment counter asynchronously
        c.executionCtx.waitUntil(
            c.env.RATE_LIMIT_KV.put(rateLimitKey, (count + 1).toString(), {
                expirationTtl: KV_TTL
            })
        );

        // Add rate limit headers to response
        c.header('X-RateLimit-Limit', AUTH_RATE_LIMIT.toString());
        c.header('X-RateLimit-Remaining', (AUTH_RATE_LIMIT - count - 1).toString());
        c.header('X-RateLimit-Reset', (60 - now.getSeconds()).toString());

        await next();
    } catch (err) {
        console.error('[Gateway] [IPRateLimiter] Error:', err);

        // Fail open for auth endpoints (don't lock users out on error)
        // In production, you might want to fail closed for security
        await next();
    }
}
