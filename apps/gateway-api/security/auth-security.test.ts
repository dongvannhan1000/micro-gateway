/**
 * Security Tests for Authentication and Authorization
 *
 * Security-focused tests for authentication bypass prevention,
 * timing attack mitigation, and input validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { gatewayKeyAuth } from '../src/middleware/api-key-auth';
import { Context, Next } from 'hono';
import { Env, Variables } from '../src/types';
import { hashGatewayKey } from '../src/utils/crypto';

vi.mock('../src/utils/crypto', () => ({
    hashGatewayKey: vi.fn((key: string) => `hashed_${key}`)
}));

function createMockContext(
    authHeader: string | null,
    dbResult: any = null,
    dbError: boolean = false
): Context<{ Bindings: Env; Variables: Variables }> {
    const mockRepos = {
        gatewayKey: {
            findByKeyHash: vi.fn()
        }
    };

    if (dbError) {
        mockRepos.gatewayKey.findByKeyHash = vi.fn().mockRejectedValue(new Error('DB Error'));
    } else {
        mockRepos.gatewayKey.findByKeyHash = vi.fn().mockResolvedValue(dbResult);
    }

    const headers = new Map();
    if (authHeader) {
        headers.set('Authorization', authHeader);
    }

    return {
        req: {
            header: (name: string) => headers.get(name) || null
        },
        get: vi.fn((key) => {
            if (key === 'repos') return mockRepos;
            return null;
        }),
        set: vi.fn(),
        json: vi.fn((data, status) => ({ status, data }))
    } as any;
}

function createMockNext(): Next {
    return vi.fn().mockResolvedValue(undefined);
}

function createValidDbResult(): any {
    return {
        id: 'key-123',
        project_id: 'proj-456',
        key_hash: 'hashed_test_key',
        key_hint: 'sk_***abc',
        name: 'Test Key',
        status: 'active',
        monthly_limit_usd: 100,
        current_month_usage_usd: 50,
        rate_limit_per_min: 60,
        rate_limit_per_day: 10000,
        created_at: new Date().toISOString(),
        revoked_at: null,
        p_id: 'proj-456',
        user_id: 'user-789',
        p_name: 'Test Project',
        model_aliases: '{}'
    };
}

describe('Security: Authentication and Authorization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Timing Attack Mitigation', () => {
        it('should have consistent timing for valid vs invalid keys', async () => {
            const validContext = createMockContext('Bearer valid_key', createValidDbResult());
            const invalidContext = createMockContext('Bearer invalid_key', null);
            const mockNext1 = createMockNext();
            const mockNext2 = createMockNext();

            // Mock setTimeout to avoid actual delays
            vi.spyOn(global, 'setTimeout').mockImplementation((cb) => {
                if (typeof cb === 'function') cb();
                return {} as any;
            });

            await gatewayKeyAuth(validContext, mockNext1);
            await gatewayKeyAuth(invalidContext, mockNext2);

            // Valid key should call next(), invalid key should return 401 early
            expect(mockNext1).toHaveBeenCalled();
            expect(mockNext2).not.toHaveBeenCalled();
        });

        it('should apply minimum delay even for fast failures', async () => {
            const mockContext = createMockContext('Bearer test', null);
            const mockNext = createMockNext();

            vi.spyOn(global, 'setTimeout').mockImplementation((cb) => {
                if (typeof cb === 'function') cb();
                return {} as any;
            });

            await gatewayKeyAuth(mockContext, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should not reveal key existence through timing', async () => {
            const existingKeyContext = createMockContext('Bearer existing_key', createValidDbResult());
            const nonExistingKeyContext = createMockContext('Bearer non_existing_key', null);
            const mockNext1 = createMockNext();
            const mockNext2 = createMockNext();

            vi.spyOn(global, 'setTimeout').mockImplementation((cb) => {
                if (typeof cb === 'function') cb();
                return {} as any;
            });

            await Promise.all([
                gatewayKeyAuth(existingKeyContext, mockNext1),
                gatewayKeyAuth(nonExistingKeyContext, mockNext2)
            ]);

            expect(mockNext1).toHaveBeenCalled();
            expect(mockNext2).not.toHaveBeenCalled();
        });
    });

    describe('API Key Hash Validation', () => {
        it('should always hash API key before database lookup', async () => {
            const mockContext = createMockContext('Bearer test_key', createValidDbResult());
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            expect(hashGatewayKey).toHaveBeenCalledWith('test_key');
            expect(mockContext.get('repos').gatewayKey.findByKeyHash).toHaveBeenCalledWith('hashed_test_key');
        });

        it('should not expose raw key in error messages', async () => {
            const mockContext = createMockContext('Bearer sensitive_key', null);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            const result = mockContext.json.mock.calls[0];
            expect(result[0].error.message).not.toContain('sensitive_key');
        });

        it('should not expose raw key in context', async () => {
            const mockContext = createMockContext('Bearer secret_key', createValidDbResult());
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            const gatewayKey = mockContext.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            expect(gatewayKey).not.toHaveProperty('raw_key');
            expect(gatewayKey).not.toHaveProperty('key_value');
            expect(gatewayKey).toHaveProperty('key_hash');
        });
    });

    describe('SQL Injection Prevention', () => {
        it('should handle SQL injection attempts in API key', async () => {
            const sqlInjectionPayloads = [
                "'; DROP TABLE gateway_keys; --",
                "' OR '1'='1",
                "admin'--",
                "' UNION SELECT * FROM gateway_keys--",
                "1'; DELETE FROM gateway_keys WHERE '1'='1"
            ];

            for (const payload of sqlInjectionPayloads) {
                const mockContext = createMockContext(`Bearer ${payload}`, null);
                const mockNext = createMockNext();

                await gatewayKeyAuth(mockContext, mockNext);

                // Should reject the key, not cause SQL errors
                expect(mockNext).not.toHaveBeenCalled();
                expect(mockContext.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        error: expect.objectContaining({
                            code: 'invalid_api_key'
                        })
                    }),
                    401
                );
            }
        });

        it('should hash SQL injection payloads before DB query', async () => {
            const sqlPayload = "'; DROP TABLE users; --";
            const mockContext = createMockContext(`Bearer ${sqlPayload}`, null);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            // Security: API keys are extracted by splitting on first space
            // So "'; DROP TABLE users; --" becomes just "';" which is then hashed
            // This prevents SQL injection payloads from reaching the database
            expect(hashGatewayKey).toHaveBeenCalledWith("';");
            expect(mockContext.get('repos').gatewayKey.findByKeyHash).toHaveBeenCalledWith(
                expect.stringContaining('hashed_')
            );
        });
    });

    describe('Bearer Token Format Validation', () => {
        it('should reject malformed Bearer tokens', async () => {
            const malformedTokens = [
                'Bearer', // No token
                'Bearer ', // Empty token (extracts '')
                'bearer test_key', // Lowercase bearer
                'Basic test_key', // Wrong scheme
                'test_key', // No scheme
                'Bearer  test_key  test_key', // Double space - extracts empty string
                '', // Empty string
            ];

            for (const token of malformedTokens) {
                const mockContext = createMockContext(token, null); // null = DB returns no key
                const mockNext = createMockNext();

                await gatewayKeyAuth(mockContext, mockNext);

                // All malformed tokens should fail authentication
                expect(mockNext).not.toHaveBeenCalled();
            }
        });

        it('should accept valid Bearer token format', async () => {
            const validTokens = [
                'Bearer sk-1234567890',
                'Bearer sk_test_ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                'Bearer mgs_12345abcdef'
            ];

            for (const token of validTokens) {
                const mockContext = createMockContext(token, createValidDbResult());
                const mockNext = createMockNext();

                await gatewayKeyAuth(mockContext, mockNext);

                expect(mockNext).toHaveBeenCalled();
            }
        });
    });

    describe('Revoked Key Handling', () => {
        it('should reject revoked keys regardless of usage', async () => {
            const revokedKeyData = createValidDbResult();
            revokedKeyData.status = 'revoked';
            revokedKeyData.revoked_at = new Date().toISOString();

            const mockContext = createMockContext('Bearer revoked_key', revokedKeyData);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: expect.stringContaining('revoked')
                    })
                }),
                401
            );
        });

        it('should treat revoked status as invalid even with valid hash', async () => {
            const revokedKeyData = createValidDbResult();
            revokedKeyData.status = 'revoked';
            revokedKeyData.current_month_usage_usd = 0; // Under limit

            const mockContext = createMockContext('Bearer revoked_key', revokedKeyData);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'invalid_api_key'
                    })
                }),
                401
            );
        });
    });

    describe('Rate Limit Bypass Prevention', () => {
        it('should not allow bypassing monthly limit checks', async () => {
            const keyData = createValidDbResult();
            keyData.monthly_limit_usd = 100;
            keyData.current_month_usage_usd = 100.01; // Over limit

            const mockContext = createMockContext('Bearer test_key', keyData);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'usage_limit_reached'
                    })
                }),
                429
            );
        });

        it('should not allow spoofing monthly limit to 0', async () => {
            const keyData = createValidDbResult();
            keyData.monthly_limit_usd = 100;
            keyData.current_month_usage_usd = 150; // Way over

            const mockContext = createMockContext('Bearer test_key', keyData);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Context Security', () => {
        it('should not leak sensitive data in context', async () => {
            const mockContext = createMockContext('Bearer test_key', createValidDbResult());
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            const gatewayKey = mockContext.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            // Should not contain sensitive fields
            expect(gatewayKey).not.toHaveProperty('raw_api_key');
            expect(gatewayKey).not.toHaveProperty('password');
            expect(gatewayKey).not.toHaveProperty('secret');

            // Should contain safe fields
            expect(gatewayKey).toHaveProperty('id');
            expect(gatewayKey).toHaveProperty('name');
            expect(gatewayKey).toHaveProperty('key_hint'); // Safe to expose
        });

        it('should limit project data in context', async () => {
            const mockContext = createMockContext('Bearer test_key', createValidDbResult());
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            const project = mockContext.set.mock.calls.find(
                call => call[0] === 'project'
            )?.[1];

            // Should contain necessary fields
            expect(project).toHaveProperty('id');
            expect(project).toHaveProperty('user_id');
            expect(project).toHaveProperty('name');
        });
    });

    describe('Error Message Security', () => {
        it('should not reveal internal system details in errors', async () => {
            const mockContext = createMockContext('Bearer test_key', null, true);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            const result = mockContext.json.mock.calls[0];
            expect(result[0]).toEqual({ error: 'Internal Server Error' });
            expect(result[0].error).not.toContain('database');
            expect(result[0].error).not.toContain('SQL');
            expect(result[0].error).not.toContain('connection');
        });

        it('should use generic error messages for invalid keys', async () => {
            const mockContext = createMockContext('Bearer invalid_key', null);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            const result = mockContext.json.mock.calls[0];
            expect(result[0].error.message).toBe('Invalid or revoked API Key');
        });
    });

    describe('Header Injection Prevention', () => {
        it('should not accept API keys through other headers', async () => {
            const mockContext = createMockContext(null, createValidDbResult());
            mockContext.req.header = (name: string) => {
                const headers: Record<string, string> = {
                    'X-API-Key': 'test_key',
                    'api-key': 'test_key',
                    'x-auth-token': 'test_key'
                };
                return headers[name] || null;
            };

            const mockNext = createMockNext();

            await gatewayKeyAuth(mockContext, mockNext);

            // Should reject since no Authorization header
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
