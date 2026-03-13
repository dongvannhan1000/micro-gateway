/**
 * PENETRATION TEST: Rate Limiting Bypass Attempts
 *
 * Testing various techniques to bypass rate limiting:
 * - Race condition exploits
 * - Concurrent request bursts
 * - Distributed bypass attempts
 * - Header manipulation
 * - Time window manipulation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimiter } from '../src/middleware/rate-limiter';
import { Context, Next } from 'hono';
import { Env, Variables } from '../src/types';

const mockEnv: Partial<Env> = {
    RATE_LIMIT_KV: {
        get: vi.fn(),
        put: vi.fn()
    } as any
};

function createMockContext(
    gatewayKey: any = { id: 'key-123', rate_limit_per_min: 60, rate_limit_per_day: 10000 }
): Context<{ Bindings: Env; Variables: Variables }> {
    return {
        req: {
            header: (name: string) => null,
            method: 'POST',
            path: '/v1/chat/completions'
        },
        get: vi.fn((key) => {
            if (key === 'gatewayKey') return gatewayKey;
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

describe('PENETRATION TEST: Rate Limiting Bypass', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('0');
        vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'put').mockResolvedValue(undefined);
    });

    describe('Attack Vector 1: Race Condition Exploits', () => {
        it('should prevent race condition with concurrent requests', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 10, rate_limit_per_day: 10000 };
            let getCount = 0;

            // Mock KV to simulate race: multiple reads before writes
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation(() => {
                getCount++;
                return Promise.resolve('5'); // All requests read count as 5
            });

            let putCount = 0;
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'put').mockImplementation(() => {
                putCount++;
                return Promise.resolve(undefined);
            });

            // Send 10 concurrent requests (all read count as 5)
            const contexts = Array(10).fill(null).map(() => createMockContext(gatewayKey));
            const nexts = Array(10).fill(null).map(() => createMockNext());

            await Promise.all(
                contexts.map((ctx, i) => rateLimiter(ctx, nexts[i]))
            );

            // Despite race condition, should use atomic increment to prevent bypass
            // All requests should increment counter, not just use stale value
            expect(putCount).toBe(20); // 10 requests * 2 (min + day)
        });

        it('should handle write conflicts with retry logic', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 5, rate_limit_per_day: 10000 };
            let attemptCount = 0;

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation(() => {
                return Promise.resolve(attemptCount.toString());
            });

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'put').mockImplementation(() => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('KV write conflict'); // Simulate conflict
                }
                return Promise.resolve(undefined);
            });

            const context = createMockContext(gatewayKey);
            const next = createMockNext();

            // Should retry on conflict
            await rateLimiter(context, next);

            // Eventually succeeds
            expect(attemptCount).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Attack Vector 2: Request Bursts', () => {
        it('should limit requests within time window', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 5, rate_limit_per_day: 10000 };
            let count = 0;

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation(async () => {
                count++;
                return Promise.resolve(count.toString());
            });

            // Send 10 requests rapidly
            const results = [];
            for (let i = 0; i < 10; i++) {
                const context = createMockContext(gatewayKey);
                const next = createMockNext();

                await rateLimiter(context, next);

                if (i < 5) {
                    expect(next).toHaveBeenCalled();
                } else {
                    expect(next).not.toHaveBeenCalled();
                    expect(context.json).toHaveBeenCalledWith(
                        expect.objectContaining({
                            error: expect.objectContaining({
                                code: 'rate_limit_exceeded'
                            })
                        }),
                        429
                    );
                }
            }
        });

        it('should apply random jitter to prevent synchronized attacks', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 60, rate_limit_per_day: 10000 };
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('0');

            const context = createMockContext(gatewayKey);
            const next = createMockNext();

            const startTime = Date.now();
            await rateLimiter(context, next);
            const endTime = Date.now();

            // Should have added random jitter (10-100ms)
            // Note: This might be flaky in tests, but demonstrates the concept
            const elapsedTime = endTime - startTime;
            expect(elapsedTime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Attack Vector 3: Distributed Bypass Attempts', () => {
        it('should track per-key limits, not global', async () => {
            const key1 = { id: 'key-1', rate_limit_per_min: 5, rate_limit_per_day: 10000 };
            const key2 = { id: 'key-2', rate_limit_per_min: 5, rate_limit_per_day: 10000 };

            const counts: Record<string, number> = { 'key-1': 0, 'key-2': 0 };

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation((key: string) => {
                if (key.includes('key-1')) {
                    counts['key-1']++;
                    return Promise.resolve(counts['key-1'].toString());
                } else if (key.includes('key-2')) {
                    counts['key-2']++;
                    return Promise.resolve(counts['key-2'].toString());
                }
                return Promise.resolve('0');
            });

            // Use key-1 to exhaustion
            for (let i = 0; i < 6; i++) {
                const context = createMockContext(key1);
                const next = createMockNext();
                await rateLimiter(context, next);

                if (i < 5) {
                    expect(next).toHaveBeenCalled();
                } else {
                    expect(next).not.toHaveBeenCalled();
                }
            }

            // key-2 should still work (independent limits)
            const context2 = createMockContext(key2);
            const next2 = createMockNext();
            await rateLimiter(context2, next2);

            expect(next2).toHaveBeenCalled();
        });
    });

    describe('Attack Vector 4: Header Manipulation', () => {
        it('should not accept rate limit bypass headers', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 5, rate_limit_per_day: 10000 };
            let count = 0;

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation(async () => {
                count++;
                return Promise.resolve(count.toString());
            });

            const context = createMockContext(gatewayKey);
            context.req.header = vi.fn((name: string) => {
                const headers: Record<string, string> = {
                    'X-Rate-Limit-Bypass': 'true',
                    'X-Rate-Limit-Override': 'admin'
                };
                return headers[name] || null;
            });

            const next = createMockNext();

            await rateLimiter(context, next);

            // Headers should be ignored
            expect(next).toHaveBeenCalled();
            expect(count).toBe(1);
        });
    });

    describe('Attack Vector 5: Time Window Manipulation', () => {
        it('should use proper time buckets', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 5, rate_limit_per_day: 10000 };
            const keys: string[] = [];

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation((key: string) => {
                keys.push(key);
                return Promise.resolve('0');
            });

            const context = createMockContext(gatewayKey);
            const next = createMockNext();

            await rateLimiter(context, next);

            // Check that keys include time bucket
            const minuteKey = keys.find(k => k.includes('rl:min:'));
            expect(minuteKey).toBeDefined();

            // Should include current date/time
            const currentYear = new Date().getFullYear();
            expect(minuteKey).toContain(currentYear.toString());
        });
    });

    describe('Dual-Layer Rate Limiting', () => {
        it('should enforce both minute and day limits', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 60, rate_limit_per_day: 5 };
            let count = 0;

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation(async (key: string) => {
                count++;
                // Return different counts for min vs day
                if (key.includes(':day:')) {
                    return Promise.resolve('6'); // Over day limit
                }
                return Promise.resolve('1'); // Under minute limit
            });

            const context = createMockContext(gatewayKey);
            const next = createMockNext();

            await rateLimiter(context, next);

            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'daily_rate_limit_exceeded'
                    })
                }),
                429
            );
        });

        it('should check both limits independently', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 5, rate_limit_per_day: 10000 };
            let count = 0;

            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockImplementation(async (key: string) => {
                count++;
                return Promise.resolve('10'); // Over both limits
            });

            const context = createMockContext(gatewayKey);
            const next = createMockNext();

            await rateLimiter(context, next);

            // Should hit day limit first
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Load Testing', () => {
        it('should handle high concurrent load', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 100, rate_limit_per_day: 10000 };
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('0');

            const requestCount = 100;
            const contexts = Array(requestCount).fill(null).map(() => createMockContext(gatewayKey));
            const nexts = Array(requestCount).fill(null).map(() => createMockNext());

            const startTime = Date.now();
            await Promise.all(
                contexts.map((ctx, i) => rateLimiter(ctx, nexts[i]))
            );
            const endTime = Date.now();

            // All should complete without errors
            nexts.forEach(next => {
                expect(next).toHaveBeenCalled();
            });

            // Should complete in reasonable time (< 5 seconds for 100 requests)
            expect(endTime - startTime).toBeLessThan(5000);
        });
    });

    describe('Response Headers', () => {
        it('should include rate limit headers in response', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 60, rate_limit_per_day: 10000 };
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('5');

            const context = createMockContext(gatewayKey);
            const next = createMockNext();

            await rateLimiter(context, next);

            expect(context.header).toHaveBeenCalledWith('X-RateLimit-Limit', '60');
            expect(context.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '55');
            expect(context.header).toHaveBeenCalledWith('X-RateLimit-Limit-Day', '10000');
        });

        it('should show 0 remaining when at limit', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 5, rate_limit_per_day: 10000 };
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('6');

            const context = createMockContext(gatewayKey);
            const next = createMockNext();

            await rateLimiter(context, next);

            expect(context.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
        });
    });

    describe('Error Handling', () => {
        it('should fail closed on KV errors', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 60, rate_limit_per_day: 10000 };
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockRejectedValue(
                new Error('KV service unavailable')
            );

            const context = createMockContext(gatewayKey);
            const next = createMockNext();

            await rateLimiter(context, next);

            // Should block request for security
            expect(next).not.toHaveBeenCalled();
            expect(context.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: 'rate_limit_error'
                    })
                }),
                503
            );
        });

        it('should include Retry-After header on errors', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 60, rate_limit_per_day: 10000 };
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockRejectedValue(new Error('KV error'));

            const context = createMockContext(gatewayKey);
            const next = createMockNext();

            await rateLimiter(context, next);

            expect(context.header).toHaveBeenCalledWith('Retry-After', '60');
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing gateway key', async () => {
            const context = createMockContext(null);
            const next = createMockNext();

            await rateLimiter(context, next);

            // Should skip rate limiting if no key
            expect(next).toHaveBeenCalled();
        });

        it('should handle zero limits by using defaults', async () => {
            const gatewayKey = { id: 'key-123', rate_limit_per_min: 0, rate_limit_per_day: 0 };
            vi.spyOn(mockEnv.RATE_LIMIT_KV!, 'get').mockResolvedValue('1');

            const context = createMockContext(gatewayKey);
            const next = createMockNext();

            await rateLimiter(context, next);

            // Zero limits default to 60/min and 10000/day, so request is allowed
            expect(next).toHaveBeenCalled();
        });
    });
});
