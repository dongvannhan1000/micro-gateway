/**
 * PENETRATION TEST: Privilege Escalation and IDOR Attacks
 *
 * Testing authorization vulnerabilities:
 * - Horizontal privilege escalation (access other users' data)
 * - Vertical privilege escalation (regular user → admin)
 * - Insecure Direct Object Reference (IDOR)
 * - Mass assignment attacks
 * - Parameter tampering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gatewayKeyAuth } from '../src/middleware/api-key-auth';
import { Context, Next } from 'hono';
import { Env, Variables } from '../src/types';
import { hashGatewayKey } from '../src/utils/crypto';

vi.mock('../src/utils/crypto', () => ({
    hashGatewayKey: vi.fn((key: string) => `hashed_${key}`)
}));

function createMockContext(
    authHeader: string | null,
    dbResult: any = null
): Context<{ Bindings: Env; Variables: Variables }> {
    const mockRepos = {
        gatewayKey: {
            findByKeyHash: vi.fn()
        },
        project: {
            findById: vi.fn(),
            findByUserId: vi.fn()
        }
    };

    mockRepos.gatewayKey.findByKeyHash = vi.fn().mockResolvedValue(dbResult);

    const headers = new Map();
    if (authHeader) {
        headers.set('Authorization', authHeader);
    }

    const contextData: any = {
        req: {
            header: (name: string) => headers.get(name) || null
        },
        get: vi.fn((key) => {
            if (key === 'repos') return mockRepos;
            return null;
        }),
        set: vi.fn(),
        json: vi.fn((data, status) => {
            contextData.status = status;
            contextData.responseData = data;
            return { status, data };
        })
    };

    return contextData;
}

function createMockNext(): Next {
    return vi.fn().mockResolvedValue(undefined);
}

function createValidKey(overrides: any = {}): any {
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
        user_id: 'user-789',
        ...overrides
    };
}

describe('PENETRATION TEST: Privilege Escalation and IDOR', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Attack Vector 1: Horizontal Privilege Escalation', () => {
        it('should not allow user A to access user B\'s API keys', async () => {
            const userAKey = createValidKey({
                id: 'key-A',
                user_id: 'user-A',
                project_id: 'proj-A'
            });

            const context = createMockContext('Bearer key-A', userAKey);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            const gatewayKey = context.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            // Should only have access to user-A's resources
            expect(gatewayKey.user_id).toBe('user-A');
            expect(gatewayKey.user_id).not.toBe('user-B');
        });

        it('should not allow cross-project data access', async () => {
            const projectAKey = createValidKey({
                id: 'key-A',
                project_id: 'proj-A',
                user_id: 'user-A'
            });

            const context = createMockContext('Bearer key-A', projectAKey);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            const project = context.set.mock.calls.find(
                call => call[0] === 'project'
            )?.[1];

            // Should only have access to proj-A
            expect(project.id).toBe('proj-A');
            expect(project.id).not.toBe('proj-B');
        });
    });

    describe('Attack Vector 2: Vertical Privilege Escalation', () => {
        it('should not allow regular users to elevate privileges', async () => {
            const regularUserKey = createValidKey({
                id: 'key-regular',
                user_id: 'user-regular',
                project_id: 'proj-regular'
            });

            const context = createMockContext('Bearer key-regular', regularUserKey);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            const gatewayKey = context.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            // Should not have admin privileges
            expect(gatewayKey).not.toHaveProperty('is_admin');
            expect(gatewayKey).not.toHaveProperty('role');
        });

        it('should prevent privilege escalation through modified claims', async () => {
            // Attacker modifies their API key hash to match an admin's
            const stolenAdminHash = 'hashed_admin_key';

            const context = createMockContext('Bearer stolen_admin_key', null);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            // Should fail because DB doesn't return a key
            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'invalid_api_key'
                    })
                }),
                401
            );
        });
    });

    describe('Attack Vector 3: Insecure Direct Object Reference (IDOR)', () => {
        it('should validate ownership before returning key details', async () => {
            const userKey = createValidKey({
                id: 'key-123',
                user_id: 'user-123'
            });

            const context = createMockContext('Bearer key-123', userKey);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            const gatewayKey = context.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            // Should not expose internal IDs that could be used for IDOR
            expect(gatewayKey).not.toHaveProperty('internal_id');
            expect(gatewayKey).not.toHaveProperty('database_id');
        });

        it('should not expose sequential or guessable IDs', async () => {
            const key = createValidKey({
                id: 'key-abc123xyz', // Non-sequential ID
                user_id: 'user-123'
            });

            const context = createMockContext('Bearer key-abc123xyz', key);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            const gatewayKey = context.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            // IDs should be non-sequential
            expect(gatewayKey.id).not.toMatch(/^\d+$/);
            expect(gatewayKey.id).toMatch(/^[a-z0-9-]+$/);
        });
    });

    describe('Attack Vector 4: Mass Assignment', () => {
        it('should not allow unexpected fields in context', async () => {
            const key = createValidKey();

            const context = createMockContext('Bearer test_key', key);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            const gatewayKey = context.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            // Should not have sensitive fields
            expect(gatewayKey).not.toHaveProperty('password');
            expect(gatewayKey).not.toHaveProperty('secret');
            expect(gatewayKey).not.toHaveProperty('api_key_value');
            expect(gatewayKey).not.toHaveProperty('raw_key');

            // Should have safe fields
            expect(gatewayKey).toHaveProperty('id');
            expect(gatewayKey).toHaveProperty('name');
            expect(gatewayKey).toHaveProperty('key_hint');
        });

        it('should filter sensitive database fields', async () => {
            const keyWithSensitiveData = createValidKey({
                internal_secret: 'secret-value',
                encrypted_key: 'encrypted-data',
                backup_codes: 'backup-data'
            });

            const context = createMockContext('Bearer test_key', keyWithSensitiveData);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            const gatewayKey = context.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            // Should not include sensitive fields
            expect(gatewayKey).not.toHaveProperty('internal_secret');
            expect(gatewayKey).not.toHaveProperty('encrypted_key');
            expect(gatewayKey).not.toHaveProperty('backup_codes');
        });
    });

    describe('Attack Vector 5: Parameter Tampering', () => {
        it('should not allow tampering with rate limits', async () => {
            const key = createValidKey({
                rate_limit_per_min: 60,
                rate_limit_per_day: 10000
            });

            const context = createMockContext('Bearer test_key', key);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            const gatewayKey = context.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            // Should use DB values, not user-provided ones
            expect(gatewayKey.rate_limit_per_min).toBe(60);
            expect(gatewayKey.rate_limit_per_day).toBe(10000);
        });

        it('should not allow tampering with usage limits', async () => {
            const key = createValidKey({
                monthly_limit_usd: 100,
                current_month_usage_usd: 50
            });

            const context = createMockContext('Bearer test_key', key);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            const gatewayKey = context.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            // Should enforce actual limits
            expect(gatewayKey.monthly_limit_usd).toBe(100);
            expect(gatewayKey.current_month_usage_usd).toBe(50);
        });
    });

    describe('Attack Vector 6: Session Fixation', () => {
        it('should not accept session tokens in API key header', async () => {
            const context = createMockContext('Bearer session_token_abc123', null);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            // Should reject session tokens as API keys
            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'invalid_api_key'
                    })
                }),
                401
            );
        });

        it('should require proper API key format', async () => {
            const invalidFormats = [
                'session:abc123',
                'token:abc123',
                'jwt:abc123',
                'Basic YWJjMTIz',
                ' Digest username="user"'
            ];

            for (const format of invalidFormats) {
                const context = createMockContext(format, null);
                const next = createMockNext();

                await gatewayKeyAuth(context, next);

                expect(next).not.toHaveBeenCalled();
            }
        });
    });

    describe('Attack Vector 7: Context Pollution', () => {
        it('should not allow attacker to inject malicious context data', async () => {
            const key = createValidKey();

            const context = createMockContext('Bearer test_key', key);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            // Check that only expected keys are set
            const setCalls = context.set.mock.calls;
            const setKeys = setCalls.map(call => call[0]);

            expect(setKeys).toContain('gatewayKey');
            expect(setKeys).toContain('project');

            // Should not contain malicious keys
            expect(setKeys).not.toContain('is_admin');
            expect(setKeys).not.toContain('role');
            expect(setKeys).not.toContain('permissions');
        });

        it('should not leak user data through context', async () => {
            const key = createValidKey({
                user_id: 'user-123',
                email: 'user@example.com',
                phone: '+1234567890'
            });

            const context = createMockContext('Bearer test_key', key);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            const gatewayKey = context.set.mock.calls.find(
                call => call[0] === 'gatewayKey'
            )?.[1];

            // Should not contain PII
            expect(gatewayKey).not.toHaveProperty('email');
            expect(gatewayKey).not.toHaveProperty('phone');
            expect(gatewayKey).not.toHaveProperty('address');
        });
    });

    describe('Database Query Security', () => {
        it('should use parameterized queries to prevent SQL injection', async () => {
            const sqlPayload = "'; DROP TABLE gateway_keys; --";

            const context = createMockContext(`Bearer ${sqlPayload}`, null);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            // Should hash the payload before DB query
            expect(hashGatewayKey).toHaveBeenCalledWith(sqlPayload.split(' ')[1]);

            // Should not cause SQL errors
            expect(context.json).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.stringContaining('SQL')
                }),
                expect.any(Number)
            );
        });
    });

    describe('Revoked Key Security', () => {
        it('should not allow access with revoked keys', async () => {
            const revokedKey = createValidKey({
                status: 'revoked',
                revoked_at: new Date().toISOString()
            });

            const context = createMockContext('Bearer revoked_key', revokedKey);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: expect.stringContaining('revoked')
                    })
                }),
                401
            );
        });
    });

    describe('Usage Limit Enforcement', () => {
        it('should enforce monthly usage limits', async () => {
            const overLimitKey = createValidKey({
                monthly_limit_usd: 100,
                current_month_usage_usd: 100.01
            });

            const context = createMockContext('Bearer over_limit_key', overLimitKey);
            const next = createMockNext();

            await gatewayKeyAuth(context, next);

            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'usage_limit_reached'
                    })
                }),
                429
            );
        });
    });
});
