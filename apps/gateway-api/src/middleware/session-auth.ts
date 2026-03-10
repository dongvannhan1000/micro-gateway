import { Context, Next } from 'hono';
import { decode, verify } from 'jose';
import { Env, Variables } from '../types';

/**
 * Middleware to verify Supabase JWT for management API access
 */
export async function sessionAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const secret = new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET);
        const { payload } = await verify(token, secret);

        if (!payload || !payload.sub) {
            throw new Error('Invalid payload');
        }

        c.set('user', {
            id: payload.sub,
            email: payload.email as string,
        });

        await next();
    } catch (err) {
        console.error('[Gateway] [SessionAuth] Error:', err);
        return c.json({ error: 'Unauthorized: Session expired or invalid' }, 401);
    }
}
