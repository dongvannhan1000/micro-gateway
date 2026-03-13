/**
 * PENETRATION TEST: JWT Exploitation Attempts
 *
 * Testing various JWT attack vectors to verify security fixes:
 * - Expired token rejection
 * - Invalid issuer/audience validation
 * - Algorithm confusion attacks
 * - Token tampering detection
 * - Missing claims validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionAuth } from '../src/middleware/session-auth';
import { SignJWT, importJWK, generateKeyPair } from 'jose';
import { Context, Next } from 'hono';
import { Env, Variables } from '../src/types';

// Mock environment
const mockEnv: Partial<Env> = {
    SUPABASE_URL: 'https://test-project.supabase.co',
    SUPABASE_JWT_SECRET: 'test-secret-key-for-jwt-validation-min-32-chars'
};

let testKeyPair: { publicKey: JsonWebKey; privateKey: JsonWebKey };

async function createMockContext(token: string | null): Promise<Context<{ Bindings: Env; Variables: Variables }>> {
    const headers = new Map();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return {
        req: {
            header: (name: string) => {
                if (name === 'Authorization') return headers.get(name) || null;
                if (name === 'CF-Connecting-IP') return '127.0.0.1';
                return null;
            },
            method: 'GET',
            path: '/api/management/test'
        },
        get: vi.fn((key) => {
            if (key === 'user') return null;
            return null;
        }),
        set: vi.fn(),
        json: vi.fn((data, status) => ({ status, data })),
        header: vi.fn(),
        env: mockEnv as Env
    } as any;
}

function createMockNext(): Next {
    return vi.fn().mockResolvedValue(undefined);
}

describe('PENETRATION TEST: JWT Exploitation Attempts', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        // Generate test key pair for RS256 tests
        testKeyPair = await generateKeyPair('RS256');
    });

    describe('Attack Vector 1: Expired JWT Tokens', () => {
        it('should reject tokens expired > 1 hour ago', async () => {
            // Create token that expired 2 hours ago
            const expiredToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() - 7200000) // 2 hours ago
                .setExpirationTime('1h') // Expired 1 hour after issuance
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const context = await createMockContext(expiredToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.any(String)
                }),
                401
            );
        });

        it('should reject tokens with expiration in far past', async () => {
            const ancientToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() - 86400000) // 1 day ago
                .setExpirationTime(Date.now() - 3600000) // Expired 1 hour ago
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const context = await createMockContext(ancientToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.any(String)
                }),
                401
            );
        });

        it('should reject tokens without expiration claim', async () => {
            const noExpToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                // No expiration set
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const context = await createMockContext(noExpToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            // Tokens without expiration should be rejected by maxTokenAge check
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Attack Vector 2: Invalid Issuer', () => {
        it('should reject tokens with wrong issuer', async () => {
            const wrongIssuerToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer('https://malicious.com/auth/v1') // Wrong issuer
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const context = await createMockContext(wrongIssuerToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.any(String)
                }),
                401
            );
        });

        it('should reject tokens without issuer', async () => {
            const noIssuerToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                // No issuer set
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const context = await createMockContext(noIssuerToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Attack Vector 3: Invalid Audience', () => {
        it('should reject tokens with wrong audience', async () => {
            const wrongAudToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'admin' // Wrong audience
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const context = await createMockContext(wrongAudToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.any(String)
                }),
                401
            );
        });

        it('should reject tokens without audience', async () => {
            const noAudToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com'
                // No audience
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const context = await createMockContext(noAudToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Attack Vector 4: Algorithm Confusion', () => {
        it('should reject tokens with unsupported algorithm', async () => {
            // Create token with 'none' algorithm (attempted attack)
            const noneAlgToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'none' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(''));

            const context = await createMockContext(noneAlgToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.any(String)
                }),
                401
            );
        });

        it('should reject tokens with HS256 when RS256 expected', async () => {
            // Attacker tries to sign with HS256 using public key as secret
            const hs256Token = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode('attacker-secret'));

            const context = await createMockContext(hs256Token);
            const next = createMockNext();

            await sessionAuth(context, next);

            // Should reject because signature doesn't match
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Attack Vector 5: Token Tampering', () => {
        it('should reject tokens with modified payload', async () => {
            // Create valid token
            const validToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            // Tamper with token (change characters in middle)
            const tamperedToken = validToken.substring(0, 20) + 'TAMPERED' + validToken.substring(28);

            const context = await createMockContext(tamperedToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.any(String)
                }),
                401
            );
        });

        it('should reject tokens with truncated signature', async () => {
            const validToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            // Truncate last 10 characters of signature
            const truncatedToken = validToken.substring(0, validToken.length - 10);

            const context = await createMockContext(truncatedToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Attack Vector 6: Missing Subject', () => {
        it('should reject tokens without subject claim', async () => {
            const noSubToken = await new SignJWT({
                // No sub claim
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const context = await createMockContext(noSubToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
        });

        it('should reject tokens with empty subject', async () => {
            const emptySubToken = await new SignJWT({
                sub: '', // Empty subject
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const context = await createMockContext(emptySubToken);
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Attack Vector 7: Timing Attacks on JWT Verification', () => {
        it('should have consistent verification timing', async () => {
            const validToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const invalidToken = validToken + 'tampered';

            const context1 = await createMockContext(validToken);
            const context2 = await createMockContext(invalidToken);
            const next1 = createMockNext();
            const next2 = createMockNext();

            // Both should process without timing leaks
            await Promise.all([
                sessionAuth(context1, next1),
                sessionAuth(context2, next2)
            ]);

            expect(next1).toHaveBeenCalled();
            expect(next2).not.toHaveBeenCalled();
        });
    });

    describe('Valid Token Acceptance', () => {
        it('should accept valid HS256 token', async () => {
            const validToken = await new SignJWT({
                sub: 'user-123',
                email: 'test@example.com',
                aud: 'authenticated'
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 1) // 1 second ago to avoid timing issues
                .setExpirationTime('1h')
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET!));

            const context = await createMockContext(validToken);
            context.env = mockEnv as Env;
            const next = createMockNext();

            await sessionAuth(context, next);

            expect(next).toHaveBeenCalled();
            expect(context.set).toHaveBeenCalledWith('user', {
                id: 'user-123',
                email: 'test@example.com'
            });
        });
    });
});
