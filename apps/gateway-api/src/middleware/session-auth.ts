import { Context, Next } from 'hono';
import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from 'jose';
import { Env, Variables } from '../types';

let jwks: any = null;

/**
 * Middleware to verify Supabase JWT for management API access
 */
export async function sessionAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const authHeader = c.req.header('Authorization');

    console.log(`[Nest] [GatewayService] Action: sessionAuth start (Metadata: hasHeader=${!!authHeader})`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[Nest] [GatewayService] Action: sessionAuth failed (Metadata: reason=missing_token)`);
        return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const header = decodeProtectedHeader(token);
        console.log(`[Nest] [GatewayService] Action: decoding_token (Metadata: alg=${header.alg})`);

        let payload;
        if (header.alg === 'HS256') {
            console.log(`[Nest] [GatewayService] Action: verifying_hs256`);
            const secret = new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET);
            const result = await jwtVerify(token, secret);
            payload = result.payload;
        } else if (header.alg === 'RS256' || header.alg === 'ES256') {
            console.log(`[Nest] [GatewayService] Action: verifying_asymmetric (Metadata: alg=${header.alg})`);
            if (!jwks) {
                const url = c.env.SUPABASE_URL?.replace(/\/$/, '');
                if (!url) throw new Error('SUPABASE_URL is not defined in environment');

                const jwksUrl = `${url}/auth/v1/.well-known/jwks.json`;
                console.log(`[Nest] [GatewayService] Action: fetching_jwks (Metadata: url=${jwksUrl})`);
                jwks = createRemoteJWKSet(new URL(jwksUrl));
            }
            const result = await jwtVerify(token, jwks);
            payload = result.payload;
        } else {
            throw new Error(`Unsupported algorithm: ${header.alg}`);
        }

        if (!payload || !payload.sub) {
            throw new Error('Invalid payload: sub field missing');
        }

        console.log(`[Nest] [GatewayService] Action: sessionAuth success (Metadata: userId=${payload.sub})`);

        c.set('user', {
            id: payload.sub as string,
            email: payload.email as string,
        });

        await next();
    } catch (err: any) {
        console.error(`[Nest] [GatewayService] Action: sessionAuth error (Metadata: message=${err.message})`);
        console.error(err.stack);
        return c.json({
            error: 'Authentication failed',
            details: err.message,
            tip: 'Check if SUPABASE_JWT_SECRET matches or if JWKS is reachable'
        }, 500);
    }
}
