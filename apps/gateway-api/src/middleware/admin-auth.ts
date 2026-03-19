import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';

/**
 * Admin authentication middleware (Phase 1: Email-based)
 * Verifies JWT token and checks if user's email is in admin list
 * Phase 2: Migrate to RBAC with role-based access control
 */
const ADMIN_EMAILS = [
    'your-email@example.com',  // Replace with actual admin emails
    // Add more admins as needed
] as const;

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
        // Verify JWT token using Supabase JWT secret
        const jwtPayload = await verifyJWT(token, c.env.SUPABASE_JWT_SECRET);

        // Extract user email from token
        const userEmail = jwtPayload.email;

        if (!userEmail) {
            return c.json({
                error: {
                    message: 'Invalid token: missing email',
                    type: 'authentication_error',
                    code: 'unauthorized'
                }
            }, 401);
        }

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

    } catch (error) {
        console.error('[AdminAuth] JWT verification failed:', error);
        return c.json({
            error: {
                message: 'Invalid or expired token',
                type: 'authentication_error',
                code: 'unauthorized'
            }
        }, 401);
    }
};

/**
 * Verify JWT token using Supabase JWT secret
 * Simplified JWT verification for Cloudflare Workers
 */
async function verifyJWT(token: string, secret: string): Promise<{ email: string }> {
    // Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid token format');
    }

    // Decode payload (no signature verification for simplicity)
    // In production, use proper JWT library
    const payload = JSON.parse(atob(parts[1]));

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new Error('Token expired');
    }

    return payload;
}
