import { Context, Next } from 'hono';
import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from 'jose';
import { Env, Variables } from '../types';

let jwks: any = null;

/**
 * Middleware to verify Supabase JWT for management API access
 */
export async function sessionAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    // Skip auth for OPTIONS requests (CORS preflight)
    if (c.req.method === 'OPTIONS') {
        return next();
    }

    const authHeader = c.req.header('Authorization');

    console.log(`[GatewayService] Action: sessionAuth start (Metadata: hasHeader=${!!authHeader})`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[GatewayService] Action: sessionAuth failed (Metadata: reason=missing_token)`);
        return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const header = decodeProtectedHeader(token);
        console.log(`[GatewayService] Action: decoding_token (Metadata: alg=${header.alg})`);

        let payload;
        if (header.alg === 'HS256') {
            console.log(`[GatewayService] Action: verifying_hs256`);
            const secret = new TextEncoder().encode(c.env.SUPABASE_JWT_SECRET);

            // SECURITY FIX: Validate JWT expiration, issuer, and audience
            const supabaseUrl = c.env.SUPABASE_URL?.replace(/\/$/, '');
            const result = await jwtVerify(token, secret, {
                maxTokenAge: '1h', // Reject tokens older than 1 hour
                issuer: `${supabaseUrl}/auth/v1`, // Validate issuer
                audience: 'authenticated' // Validate audience
            });

            payload = result.payload;
        } else if (header.alg === 'RS256' || header.alg === 'ES256') {
            console.log(`[GatewayService] Action: verifying_asymmetric (Metadata: alg=${header.alg})`);
            if (!jwks) {
                const url = c.env.SUPABASE_URL?.replace(/\/$/, '');
                if (!url) throw new Error('SUPABASE_URL is not defined in environment');

                const jwksUrl = `${url}/auth/v1/.well-known/jwks.json`;
                console.log(`[GatewayService] Action: fetching_jwks (Metadata: url=${jwksUrl})`);
                jwks = createRemoteJWKSet(new URL(jwksUrl));
            }

            // SECURITY FIX: Validate JWT expiration, issuer, and audience
            const supabaseUrl = c.env.SUPABASE_URL?.replace(/\/$/, '');
            const result = await jwtVerify(token, jwks, {
                maxTokenAge: '1h', // Reject tokens older than 1 hour
                issuer: `${supabaseUrl}/auth/v1`, // Validate issuer
                audience: 'authenticated' // Validate audience
            });

            payload = result.payload;
        } else {
            throw new Error(`Unsupported algorithm: ${header.alg}`);
        }

        // SECURITY: Ensure token has expiration claim
        if (!payload.exp) {
            throw new Error('Invalid payload: exp claim is required');
        }

        if (!payload || !payload.sub) {
            throw new Error('Invalid payload: sub field missing');
        }

        console.log(`[GatewayService] Action: sessionAuth success (Metadata: userId=${payload.sub})`);

        c.set('user', {
            id: payload.sub as string,
            email: payload.email as string,
        });

        await next();
    } catch (err: any) {
        console.error(`[GatewayService] Action: sessionAuth error (Metadata: message=${err.message})`);
        console.error(err.stack);
        return c.json({
            error: 'Authentication failed'
        }, 401);
    }
}
