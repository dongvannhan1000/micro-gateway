import { describe, it, expect, beforeEach } from 'vitest';
import { jwtVerify, SignJWT } from 'jose';
import { sessionAuth } from './session-auth';
import { Env, Variables } from '../types';

describe('sessionAuth - Security Fixes', () => {
    let mockEnv: Env;
    let mockContext: any;

    beforeEach(() => {
        mockEnv = {
            SUPABASE_JWT_SECRET: 'test-secret-key-for-testing',
            SUPABASE_URL: 'https://test.supabase.co',
            ENVIRONMENT: 'test'
        } as unknown as Env;

        mockContext = {
            req: {
                header: (name: string) => {
                    if (name === 'Authorization') return 'Bearer test-token';
                    return null;
                },
                method: 'GET'
            },
            set: (key: string, value: any) => {},
            json: (data: any, status?: number) => ({
                status: status || 200,
                data
            })
        };
    });

    describe('JWT Expiration Validation (CRITICAL FIX #1)', () => {
        it('should reject expired tokens', async () => {
            // Create expired token (exp in the past)
            const expiredToken = await new SignJWT({ sub: 'user-123', email: 'test@example.com' })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 7200) // 2 hours ago
                .setExpirationTime(Date.now() / 1000 - 3600) // 1 hour ago
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET));

            mockContext.req.header = (name: string) => {
                if (name === 'Authorization') return `Bearer ${expiredToken}`;
                return null;
            };

            const nextMock = async () => {};
            const result = await sessionAuth(mockContext, nextMock);

            // Should return 401 for expired token
            expect(result.status).toBe(401);
            expect(result.data.error).toBe('Authentication failed');
        });

        it('should accept valid non-expired tokens', async () => {
            // Create valid token (exp in the future)
            const validToken = await new SignJWT({ sub: 'user-123', email: 'test@example.com' })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000)
                .setExpirationTime(Date.now() / 1000 + 3600) // 1 hour from now
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET));

            mockContext.req.header = (name: string) => {
                if (name === 'Authorization') return `Bearer ${validToken}`;
                return null;
            };

            let userSet = null;
            mockContext.set = (key: string, value: any) => {
                if (key === 'user') userSet = value;
            };

            const nextMock = async () => {};
            await sessionAuth(mockContext, nextMock);

            // Should set user context
            expect(userSet).toBeTruthy();
            expect(userSet.id).toBe('user-123');
        });

        it('should reject tokens older than 1 hour (maxTokenAge)', async () => {
            // Create token issued 2 hours ago but not expired
            const oldToken = await new SignJWT({ sub: 'user-123', email: 'test@example.com' })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt(Date.now() / 1000 - 7200) // 2 hours ago
                .setExpirationTime(Date.now() / 1000 + 3600) // Still valid
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET));

            mockContext.req.header = (name: string) => {
                if (name === 'Authorization') return `Bearer ${oldToken}`;
                return null;
            };

            const nextMock = async () => {};
            const result = await sessionAuth(mockContext, nextMock);

            // Should reject due to maxTokenAge validation
            expect(result.status).toBe(401);
        });
    });

    describe('JWT Issuer Validation (CRITICAL FIX #1)', () => {
        it('should reject tokens with invalid issuer', async () => {
            // Create token with wrong issuer
            const wrongIssuerToken = await new SignJWT({ sub: 'user-123', email: 'test@example.com' })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuer('https://malicious.com/auth/v1') // Wrong issuer
                .setIssuedAt(Date.now() / 1000)
                .setExpirationTime(Date.now() / 1000 + 3600)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET));

            mockContext.req.header = (name: string) => {
                if (name === 'Authorization') return `Bearer ${wrongIssuerToken}`;
                return null;
            };

            const nextMock = async () => {};
            const result = await sessionAuth(mockContext, nextMock);

            // Should reject due to issuer validation
            expect(result.status).toBe(401);
        });

        it('should accept tokens with correct issuer', async () => {
            // Create token with correct issuer
            const correctIssuerToken = await new SignJWT({ sub: 'user-123', email: 'test@example.com' })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuer(`${mockEnv.SUPABASE_URL}/auth/v1`) // Correct issuer
                .setIssuedAt(Date.now() / 1000)
                .setExpirationTime(Date.now() / 1000 + 3600)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET));

            mockContext.req.header = (name: string) => {
                if (name === 'Authorization') return `Bearer ${correctIssuerToken}`;
                return null;
            };

            let userSet = null;
            mockContext.set = (key: string, value: any) => {
                if (key === 'user') userSet = value;
            };

            const nextMock = async () => {};
            await sessionAuth(mockContext, nextMock);

            // Should accept and set user context
            expect(userSet).toBeTruthy();
            expect(userSet.id).toBe('user-123');
        });
    });

    describe('JWT Audience Validation (CRITICAL FIX #1)', () => {
        it('should reject tokens with invalid audience', async () => {
            // Create token with wrong audience
            const wrongAudienceToken = await new SignJWT({ sub: 'user-123', email: 'test@example.com' })
                .setProtectedHeader({ alg: 'HS256' })
                .setAudience('wrong-audience') // Wrong audience
                .setIssuedAt(Date.now() / 1000)
                .setExpirationTime(Date.now() / 1000 + 3600)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET));

            mockContext.req.header = (name: string) => {
                if (name === 'Authorization') return `Bearer ${wrongAudienceToken}`;
                return null;
            };

            const nextMock = async () => {};
            const result = await sessionAuth(mockContext, nextMock);

            // Should reject due to audience validation
            expect(result.status).toBe(401);
        });

        it('should accept tokens with correct audience', async () => {
            // Create token with correct audience
            const correctAudienceToken = await new SignJWT({ sub: 'user-123', email: 'test@example.com' })
                .setProtectedHeader({ alg: 'HS256' })
                .setAudience('authenticated') // Correct audience
                .setIssuedAt(Date.now() / 1000)
                .setExpirationTime(Date.now() / 1000 + 3600)
                .sign(new TextEncoder().encode(mockEnv.SUPABASE_JWT_SECRET));

            mockContext.req.header = (name: string) => {
                if (name === 'Authorization') return `Bearer ${correctAudienceToken}`;
                return null;
            };

            let userSet = null;
            mockContext.set = (key: string, value: any) => {
                if (key === 'user') userSet = value;
            };

            const nextMock = async () => {};
            await sessionAuth(mockContext, nextMock);

            // Should accept and set user context
            expect(userSet).toBeTruthy();
            expect(userSet.id).toBe('user-123');
        });
    });

    describe('Error Handling', () => {
        it('should handle missing Authorization header', async () => {
            mockContext.req.header = (name: string) => null;

            const nextMock = async () => {};
            const result = await sessionAuth(mockContext, nextMock);

            expect(result.status).toBe(401);
            expect(result.data.error).toContain('Unauthorized');
        });

        it('should handle malformed tokens', async () => {
            mockContext.req.header = (name: string) => 'Bearer not-a-valid-jwt';

            const nextMock = async () => {};
            const result = await sessionAuth(mockContext, nextMock);

            expect(result.status).toBe(401);
        });

        it('should handle tokens with invalid signature', async () => {
            const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';

            mockContext.req.header = (name: string) => `Bearer ${tamperedToken}`;

            const nextMock = async () => {};
            const result = await sessionAuth(mockContext, nextMock);

            expect(result.status).toBe(401);
        });
    });
});
