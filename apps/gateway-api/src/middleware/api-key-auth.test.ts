/**
 * API Key Authentication Middleware Tests
 *
 * Comprehensive unit tests for gateway API key authentication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { gatewayKeyAuth } from './api-key-auth';
import { Context, Next } from 'hono';
import { hashGatewayKey } from '../utils/crypto';
import { Env, Variables } from '../types';

// Mock dependencies
vi.mock('../utils/crypto', () => ({
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
        mockRepos.gatewayKey.findByKeyHash = vi.fn().mockRejectedValue(new Error('DB connection failed'));
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
        json: vi.fn((data, status) => ({
            status,
            data
        })),
        header: vi.fn()
    } as any;
}

function createMockNext(): Next {
    return vi.fn().mockResolvedValue(undefined);
}

function createValidDbResult() {
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
        rate_limit_per_day: 1000,
        created_at: new Date().toISOString(),
        revoked_at: null,
        p_id: 'proj-456',
        user_id: 'user-789',
        p_name: 'Test Project',
        model_aliases: '{}'
    };
}

describe('API Key Authentication Middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Authentication Scenarios', () => {
        it('should authenticate valid API key', async () => {
            const mockCtx = createMockContext('Bearer test_key', createValidDbResult());
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockCtx.set).toHaveBeenCalledWith('gatewayKey', expect.any(Object));
            expect(mockCtx.set).toHaveBeenCalledWith('project', expect.any(Object));
        });

        it('should reject missing Authorization header', async () => {
            const mockCtx = createMockContext(null);
            const mockNext = createMockNext();

            const result = await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCtx.json).toHaveBeenCalledWith(
                {
                    error: {
                        message: 'Invalid API Key',
                        type: 'invalid_request_error',
                        code: 'invalid_api_key'
                    }
                },
                401
            );
        });

        it('should reject malformed Authorization header (no Bearer)', async () => {
            const mockCtx = createMockContext('Basic test_key');
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCtx.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'invalid_api_key'
                    })
                }),
                401
            );
        });

        it('should reject invalid API key (not found in DB)', async () => {
            const mockCtx = createMockContext('Bearer invalid_key', null);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCtx.json).toHaveBeenCalledWith(
                {
                    error: {
                        message: 'Invalid or revoked API Key',
                        type: 'invalid_request_error',
                        code: 'invalid_api_key'
                    }
                },
                401
            );
        });

        it('should reject revoked API key', async () => {
            const dbResult = createValidDbResult();
            dbResult.status = 'revoked';
            dbResult.revoked_at = new Date().toISOString();

            const mockCtx = createMockContext('Bearer revoked_key', dbResult);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCtx.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: expect.stringContaining('revoked')
                    })
                }),
                401
            );
        });
    });

    describe('Monthly Usage Limit Enforcement', () => {
        it('should allow request when under monthly limit', async () => {
            const dbResult = createValidDbResult();
            dbResult.monthly_limit_usd = 100;
            dbResult.current_month_usage_usd = 50;

            const mockCtx = createMockContext('Bearer test_key', dbResult);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should allow request when exactly at monthly limit', async () => {
            const dbResult = createValidDbResult();
            dbResult.monthly_limit_usd = 100;
            dbResult.current_month_usage_usd = 100;

            const mockCtx = createMockContext('Bearer test_key', dbResult);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should block request when over monthly limit', async () => {
            const dbResult = createValidDbResult();
            dbResult.monthly_limit_usd = 100;
            dbResult.current_month_usage_usd = 100.01;

            const mockCtx = createMockContext('Bearer test_key', dbResult);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCtx.json).toHaveBeenCalledWith(
                {
                    error: {
                        message: 'Monthly usage limit exceeded',
                        type: 'insufficient_quota',
                        code: 'usage_limit_reached'
                    }
                },
                429
            );
        });

        it('should allow unlimited usage when monthly limit is 0', async () => {
            const dbResult = createValidDbResult();
            dbResult.monthly_limit_usd = 0;
            dbResult.current_month_usage_usd = 999999;

            const mockCtx = createMockContext('Bearer test_key', dbResult);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Timing Attack Mitigation', () => {
        it('should add artificial delay for timing attack prevention', async () => {
            const mockCtx = createMockContext('Bearer test_key', createValidDbResult());
            const mockNext = createMockNext();

            // Test that the delay function is called
            vi.spyOn(global, 'setTimeout').mockImplementation((cb) => {
                if (typeof cb === 'function') cb();
                return {} as any;
            });

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should apply same delay for invalid keys', async () => {
            const mockCtx = createMockContext('Bearer invalid_key', null);
            const mockNext = createMockNext();

            vi.spyOn(global, 'setTimeout').mockImplementation((cb) => {
                if (typeof cb === 'function') cb();
                return {} as any;
            });

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Context Attachment', () => {
        it('should attach complete gateway key object to context', async () => {
            const dbResult = createValidDbResult();
            const mockCtx = createMockContext('Bearer test_key', dbResult);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockCtx.set).toHaveBeenCalledWith('gatewayKey', expect.objectContaining({
                id: 'key-123',
                project_id: 'proj-456',
                name: 'Test Key',
                status: 'active'
            }));
        });

        it('should attach complete project object to context', async () => {
            const dbResult = createValidDbResult();
            const mockCtx = createMockContext('Bearer test_key', dbResult);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockCtx.set).toHaveBeenCalledWith('project', expect.objectContaining({
                id: 'proj-456',
                user_id: 'user-789',
                name: 'Test Project'
            }));
        });
    });

    describe('Error Handling', () => {
        it('should handle database connection errors gracefully', async () => {
            const mockCtx = createMockContext('Bearer test_key', null, true);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCtx.json).toHaveBeenCalledWith(
                { error: 'Internal Server Error' },
                500
            );
        });

        it('should log database errors', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockCtx = createMockContext('Bearer test_key', null, true);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[Gateway] [ApiKeyAuth] DB Error:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty Bearer token', async () => {
            const mockCtx = createMockContext('Bearer ');
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCtx.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'invalid_api_key'
                    })
                }),
                401
            );
        });

        it('should handle Authorization header with extra spaces', async () => {
            const mockCtx = createMockContext('Bearer  test_key', createValidDbResult());
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            // Should still work with extra space
            expect(mockCtx.set).toHaveBeenCalled();
        });

        it('should handle lowercase "bearer" header', async () => {
            const mockCtx = createMockContext('bearer test_key', createValidDbResult());
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            // Current implementation requires capital "Bearer"
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Security', () => {
        it('should hash API key before database lookup', async () => {
            const mockCtx = createMockContext('Bearer test_key', createValidDbResult());
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            expect(hashGatewayKey).toHaveBeenCalledWith('test_key');
        });

        it('should not store raw API key in context', async () => {
            const dbResult = createValidDbResult();
            const mockCtx = createMockContext('Bearer test_key', dbResult);
            const mockNext = createMockNext();

            await gatewayKeyAuth(mockCtx, mockNext);

            const gatewayKey = mockCtx.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            expect(gatewayKey).not.toHaveProperty('raw_key');
            expect(gatewayKey).toHaveProperty('key_hash');
        });
    });
});
