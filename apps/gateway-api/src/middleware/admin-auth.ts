import { MiddlewareHandler } from 'hono';
import { jwtVerify, decodeProtectedHeader } from 'jose';
import { Env, Variables } from '../types';

/**
 * Admin authentication middleware (Phase 1: Email-based)
 *
 * SECURITY IMPROVEMENTS:
 * - Proper JWT signature verification using jose library
 * - Validates expiration, issuer, audience, and maxTokenAge
 * - Admin emails configurable via environment variable
 * - Follows same security pattern as session-auth middleware
 *
 * Phase 2: Migrate to RBAC with role-based access control
 *
 * @param c - Hono context with environment bindings
 * @param next - Next middleware function
 * @returns 401 if auth missing/invalid, 403 if not admin, otherwise calls next()
 */
export const adminAuth: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
    // Get Authorization header
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({
            error: {
                message: 'Authentication required',
                type: 'authentication_error',
                code: 'unauthorized'
            }
        }, 401);
    }

    const token = authHeader.substring(7);

    try {
        // SECURITY FIX: Proper JWT signature verification (not just base64 decode)
        const header = decodeProtectedHeader(token);

        // Verify JWT signature and validate claims
        const secret = new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET);
        const supabaseUrl = c.env.SUPABASE_URL?.replace(/\/$/, '');

        const result = await jwtVerify(token, secret, {
            maxTokenAge: '1h', // Reject tokens older than 1 hour
            issuer: `${supabaseUrl}/auth/v1`, // Validate issuer
            audience: 'authenticated' // Validate audience
        });

        const payload = result.payload;

        // SECURITY: Ensure token has required claims
        if (!payload.exp) {
            throw new Error('Invalid payload: exp claim is required');
        }

        // Extract user email from token
        const userEmail = payload.email as string;

        if (!userEmail) {
            return c.json({
                error: {
                    message: 'Invalid token: missing email',
                    type: 'authentication_error',
                    code: 'unauthorized'
                }
            }, 401);
        }

        // SECURITY FIX: Load admin emails from environment variable
        const ADMIN_EMAILS = c.env.ADMIN_EMAILS?.split(',') || ['your-email@example.com'];

        // Check if user's email is in admin list
        if (!ADMIN_EMAILS.includes(userEmail)) {
            return c.json({
                error: {
                    message: 'Admin access required',
                    type: 'permission_error',
                    code: 'forbidden'
                }
            }, 403);
        }

        // User is admin, set user context and proceed
        c.set('user', { email: userEmail });
        c.set('isAdmin', true);

        await next();

    } catch (error: any) {
        console.error('[AdminAuth] JWT verification failed:', error.message);
        return c.json({
            error: {
                message: 'Invalid or expired token',
                type: 'authentication_error',
                code: 'unauthorized'
            }
        }, 401);
    }
};
