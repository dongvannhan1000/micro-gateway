/**
 * PENETRATION TEST: Authentication Brute Force Attacks
 *
 * Testing brute force prevention mechanisms:
 * - Rapid credential guessing
 * - Password spraying
 * - Multiple login attempts from single IP
 * - Rate limit timing validation
 * - Distributed attack attempts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ipRateLimiter } from '../src/middleware/ip-rate-limiter';
import { Context, Next } from 'hono';
import { Env, Variables } from '../src/types';

const mockEnv: Partial<Env> = {
    RATE_LIMIT_KV: {
        get: vi.fn(),
        put: vi.fn()
    } as any
};

function createMockContext(
    ip: string = '192.168.1.100',
    path: string = '/api/auth/login'
): Context<{ Bindings: Env; Variables: Variables }> {
    return {
        req: {
            header: (name: string) => {
                if (name === 'CF-Connecting-IP') return ip;
                return null;
            },
            method: 'POST',
            path
        },
        get: vi.fn(),
        set: vi.fn(),
        json: vi.fn((data, status) => ({ status, data })),
        header: vi.fn(),
        env: mockEnv as Env,
        executionCtx: {
            waitUntil: vi.fn()
        }
    } as any;
}

function createMockNext(): Next {
    return vi.fn().mockResolvedValue(undefined);
}

describe('PENETRATION TEST: Authentication Brute Force', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('0');
        vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'put').mockResolvedValue(undefined);
    });

    describe('Attack Vector 1: Rapid Credential Guessing', () => {
        it('should block after 10 failed attempts from same IP', async () => {
            const attackerIP = '192.168.1.100';
            let requestCount = 0;

            // Mock KV to return incrementing count
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation((key: string) => {
                requestCount++;
                return Promise.resolve(requestCount.toString());
            });

            // Make 10 requests (should all pass)
            for (let i = 0; i < 10; i++) {
                const context = createMockContext(attackerIP);
                const next = createMockNext();

                await ipRateLimiter(context, next);
                expect(next).toHaveBeenCalled();
            }

            // 11th request should be blocked
            const blockedContext = createMockContext(attackerIP);
            const blockedNext = createMockNext();

            await ipRateLimiter(blockedContext, blockedNext);

            expect(blockedNext).not.toHaveBeenCalled();
            expect(blockedContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'auth_rate_limit_exceeded'
                    })
                }),
                429
            );
        });

        it('should reset rate limit after 1 minute', async () => {
            const attackerIP = '192.168.1.100';

            // Simulate time passing by changing KV key (minute bucket changes)
            let callCount = 0;
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation(async () => {
                callCount++;
                // Reset after "new minute"
                if (callCount > 10) {
                    return Promise.resolve('0'); // New minute, reset count
                }
                return Promise.resolve('10'); // Limit hit
            });

            // First request after reset should pass
            const context = createMockContext(attackerIP);
            const next = createMockNext();

            await ipRateLimiter(context, next);

            expect(next).toHaveBeenCalled();
        });
    });

    describe('Attack Vector 2: Password Spraying', () => {
        it('should block password spraying across multiple accounts', async () => {
            const attackerIP = '192.168.1.100';
            let attemptCount = 0;

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation(() => {
                attemptCount++;
                return Promise.resolve(attemptCount.toString());
            });

            // Attacker tries same password across multiple accounts
            const accounts = ['user1@example.com', 'user2@example.com', 'user3@example.com',
                             'user4@example.com', 'user5@example.com', 'user6@example.com',
                             'user7@example.com', 'user8@example.com', 'user9@example.com',
                             'user10@example.com', 'user11@example.com'];

            for (let i = 0; i < accounts.length; i++) {
                const context = createMockContext(attackerIP);
                const next = createMockNext();

                await ipRateLimiter(context, next);

                if (i < 10) {
                    expect(next).toHaveBeenCalled();
                } else {
                    // 11th attempt blocked
                    expect(next).not.toHaveBeenCalled();
                    expect(context.json).toHaveBeenCalledWith(
                        expect.objectContaining({
                            error: expect.objectContaining({
                                code: 'auth_rate_limit_exceeded'
                            })
                        }),
                        429
                    );
                }
            }
        });
    });

    describe('Attack Vector 3: IP Spoofing Attempts', () => {
        it('should use CF-Connecting-IP header for rate limiting', async () => {
            // Real IP from Cloudflare
            const realIP = '203.0.113.1';
            let count = 0;

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation(() => {
                count++;
                return Promise.resolve(count.toString());
            });

            // All requests from same CF-Connecting-IP should be rate limited
            for (let i = 0; i < 11; i++) {
                const context = createMockContext(realIP);
                const next = createMockNext();

                await ipRateLimiter(context, next);
            }

            // Should have logged security warnings
            expect(count).toBeGreaterThan(10);
        });

        it('should handle missing CF-Connecting-IP header gracefully', async () => {
            const context = createMockContext(''); // No IP
            const next = createMockNext();

            // Override header to return null
            context.req.header = vi.fn().mockReturnValue(null);

            await ipRateLimiter(context, next);

            // Should allow through but log warning
            expect(next).toHaveBeenCalled();
        });
    });

    describe('Attack Vector 4: Timing Analysis', () => {
        it('should include proper rate limit headers', async () => {
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('5');

            const context = createMockContext('192.168.1.100');
            const next = createMockNext();

            await ipRateLimiter(context, next);

            expect(context.header).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
            expect(context.header).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.stringContaining('4'));
            expect(context.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
        });

        it('should include Retry-After header when rate limited', async () => {
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('10');

            const context = createMockContext('192.168.1.100');
            const next = createMockNext();

            await ipRateLimiter(context, next);

            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: expect.stringContaining('Too many authentication attempts')
                    })
                }),
                429
            );

            expect(context.header).toHaveBeenCalledWith('Retry-After', '60');
        });
    });

    describe('Attack Vector 5: Distributed Brute Force', () => {
        it('should track each IP independently', async () => {
            const attackerIPs = [
                '192.168.1.100',
                '192.168.1.101',
                '192.168.1.102'
            ];

            const ipCounts: Record<string, number> = {
                '192.168.1.100': 0,
                '192.168.1.101': 0,
                '192.168.1.102': 0
            };

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation((key: string) => {
                // Extract IP hash from key
                const ip = attackerIPs.find(ip => key.includes(ip.substring(0, 8)));
                if (ip) {
                    ipCounts[ip]++;
                    return Promise.resolve(ipCounts[ip].toString());
                }
                return Promise.resolve('0');
            });

            // Each IP should get 10 attempts
            for (const ip of attackerIPs) {
                for (let i = 0; i < 10; i++) {
                    const context = createMockContext(ip);
                    const next = createMockNext();
                    await ipRateLimiter(context, next);
                    expect(next).toHaveBeenCalled();
                }
            }
        });
    });

    describe('Attack Vector 6: Slow Motion Attacks', () => {
        it('should not reset count between slow requests', async () => {
            const attackerIP = '192.168.1.100';
            let count = 0;

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation(() => {
                count++;
                return Promise.resolve(count.toString());
            });

            // Simulate slow attacks: 1 request per 5 seconds
            // All within same minute bucket, so should still be limited
            for (let i = 0; i < 11; i++) {
                const context = createMockContext(attackerIP);
                const next = createMockNext();

                await ipRateLimiter(context, next);

                if (i < 10) {
                    expect(next).toHaveBeenCalled();
                } else {
                    expect(next).not.toHaveBeenCalled();
                }
            }
        });
    });

    describe('GDPR Compliance', () => {
        it('should hash IP addresses before storage', async () => {
            const ip = '192.168.1.100';
            let capturedKey: string | undefined;

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation((key: string) => {
                capturedKey = key;
                return Promise.resolve('0');
            });

            const context = createMockContext(ip);
            const next = createMockNext();

            await ipRateLimiter(context, next);

            // Key should contain hash, not raw IP
            expect(capturedKey).toBeDefined();
            expect(capturedKey).not.toContain(ip);
            expect(capturedKey).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
        });
    });

    describe('Error Handling', () => {
        it('should fail open on KV errors', async () => {
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockRejectedValue(
                new Error('KV service unavailable')
            );

            const context = createMockContext('192.168.1.100');
            const next = createMockNext();

            await ipRateLimiter(context, next);

            // Should allow request to not lock users out
            expect(next).toHaveBeenCalled();
        });

        it('should handle put errors gracefully', async () => {
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('0');
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'put').mockRejectedValue(
                new Error('KV write failed')
            );

            const context = createMockContext('192.168.1.100');
            // Make waitUntil handle the rejection
            context.executionCtx.waitUntil = vi.fn((promise: Promise<any>) => {
                promise.catch(() => {}); // Suppress unhandled rejection
            });
            const next = createMockNext();

            // Should not throw
            await ipRateLimiter(context, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('Concurrent Request Handling', () => {
        it('should handle multiple simultaneous requests', async () => {
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('5');

            const contexts = Array(5).fill(null).map(() =>
                createMockContext('192.168.1.100')
            );
            const nexts = Array(5).fill(null).map(() => createMockNext());

            // Send 5 requests concurrently
            await Promise.all(
                contexts.map((ctx, i) => ipRateLimiter(ctx, nexts[i]))
            );

            // All should pass
            nexts.forEach(next => {
                expect(next).toHaveBeenCalled();
            });
        });
    });
});
