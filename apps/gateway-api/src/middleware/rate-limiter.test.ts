/**
 * Rate Limiter Middleware Tests
 *
 * Comprehensive unit tests for KV-based rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rateLimiter } from './rate-limiter';
import { Context, Next } from 'hono';
import { Env, Variables } from '../types';

function createMockContext(
    gatewayKey: any,
    minCount: number = 0,
    dayCount: number = 0,
    kvError: boolean = false
): Context<{ Bindings: Env; Variables: Variables }> {
    const mockKV = {
        get: vi.fn(),
        put: vi.fn()
    };

    if (kvError) {
        mockKV.get = vi.fn().mockRejectedValue(new Error('KV connection failed'));
        mockKV.put = vi.fn().mockRejectedValue(new Error('KV connection failed'));
    } else {
        mockKV.get = vi.fn((key: string) => {
            if (key.includes(':min:')) return Promise.resolve(minCount.toString());
            if (key.includes(':day:')) return Promise.resolve(dayCount.toString());
            return Promise.resolve(null);
        });
        mockKV.put = vi.fn().mockResolvedValue(undefined);
    }

    const mockExecutionContext = {
        waitUntil: vi.fn((promise) => promise)
    };

    return {
        get: vi.fn((key) => {
            if (key === 'gatewayKey') return gatewayKey;
            return null;
        }),
        env: {
            RATE_LIMIT_KV: mockKV
        },
        executionCtx: mockExecutionContext,
        header: vi.fn(),
        json: vi.fn((data, status, headers) => ({
            status,
            data,
            headers
        }))
    } as any;
}

function createMockNext(): Next {
    return vi.fn().mockResolvedValue(undefined);
}

function createMockGatewayKey(
    rateLimitPerMin: number = 60,
    rateLimitPerDay: number = 10000
): any {
    return {
        id: 'key-123',
        rate_limit_per_min: rateLimitPerMin,
        rate_limit_per_day: rateLimitPerDay
    };
}

describe('Rate Limiter Middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-13T10:30:45Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Per-Minute Rate Limiting', () => {
        it('should allow request under per-minute limit', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 100);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockCtx.json).not.toHaveBeenCalled();
        });

        it('should allow request exactly at per-minute limit', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 59, 100);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should block request over per-minute limit', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 60, 100);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCtx.json).toHaveBeenCalledWith(
                {
                    error: {
                        message: 'Rate limit exceeded. Please try again later.',
                        type: 'requests',
                        code: 'rate_limit_exceeded'
                    }
                },
                429,
                expect.objectContaining({
                    'X-RateLimit-Limit': '60',
                    'X-RateLimit-Remaining': '0'
                })
            );
        });

        it('should calculate correct Retry-After for minute limit', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 60, 100);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            const call = mockCtx.json.mock.calls[0];
            const headers = call[2];

            // At 45 seconds in minute, should have 15 seconds retry
            expect(headers['Retry-After']).toBe('15');
        });
    });

    describe('Per-Day Rate Limiting', () => {
        it('should allow request under per-day limit', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should allow request exactly at per-day limit', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 9999);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should block request over per-day limit', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 10000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockCtx.json).toHaveBeenCalledWith(
                {
                    error: {
                        message: 'Daily rate limit exceeded. Please try again tomorrow.',
                        type: 'requests',
                        code: 'daily_rate_limit_exceeded'
                    }
                },
                429,
                expect.objectContaining({
                    'X-RateLimit-Limit-Day': '10000',
                    'X-RateLimit-Remaining-Day': '0'
                })
            );
        });

        it('should calculate correct Retry-After for day limit', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 10000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            const call = mockCtx.json.mock.calls[0];
            const headers = call[2];

            // At 10:30:45 (37845 seconds into day), should retry in ~48555 seconds
            expect(parseInt(headers['Retry-After'])).toBeGreaterThan(48000);
        });
    });

    describe('Counter Increment and TTL', () => {
        it('should increment both minute and day counters', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            const mockKV = mockCtx.env.RATE_LIMIT_KV;
            expect(mockKV.put).toHaveBeenCalledWith(
                expect.stringContaining(':min:'),
                '31',
                expect.objectContaining({
                    expirationTtl: 120
                })
            );
            expect(mockKV.put).toHaveBeenCalledWith(
                expect.stringContaining(':day:'),
                '5001',
                expect.objectContaining({
                    expirationTtl: 172800
                })
            );
        });

        it('should increment counter asynchronously with waitUntil', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockCtx.executionCtx.waitUntil).toHaveBeenCalled();
        });

        it('should use 120 second TTL for minute counter', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            const minPutCall = mockCtx.env.RATE_LIMIT_KV.put.mock.calls.find(
                call => call[0].includes(':min:')
            );

            expect(minPutCall[2].expirationTtl).toBe(120);
        });

        it('should use 2 day TTL for day counter', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            const dayPutCall = mockCtx.env.RATE_LIMIT_KV.put.mock.calls.find(
                call => call[0].includes(':day:')
            );

            expect(dayPutCall[2].expirationTtl).toBe(172800); // 2 days
        });
    });

    describe('Response Headers', () => {
        it('should set X-RateLimit-Limit header', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(100, 10000), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockCtx.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
        });

        it('should set X-RateLimit-Remaining header', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockCtx.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '29');
        });

        it('should set X-RateLimit-Limit-Day header', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 5000), 30, 1000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockCtx.header).toHaveBeenCalledWith('X-RateLimit-Limit-Day', '5000');
        });

        it('should set X-RateLimit-Remaining-Day header', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockCtx.header).toHaveBeenCalledWith('X-RateLimit-Remaining-Day', '4999');
        });
    });

    describe('Edge Cases', () => {
        it('should allow request when no gateway key in context', async () => {
            const mockCtx = createMockContext(null);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockCtx.env.RATE_LIMIT_KV.get).not.toHaveBeenCalled();
        });

        it('should handle zero rate limits (use defaults)', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(0, 0), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            // Should use defaults: 60 per minute, 10000 per day
            expect(mockNext).toHaveBeenCalled();
        });

        it('should handle missing KV count values (treat as zero)', async () => {
            const mockKV = {
                get: vi.fn().mockResolvedValue(null),
                put: vi.fn().mockResolvedValue(undefined)
            };

            const mockCtx = {
                get: vi.fn((key) => key === 'gatewayKey' ? createMockGatewayKey() : null),
                env: { RATE_LIMIT_KV: mockKV },
                executionCtx: { waitUntil: vi.fn() },
                header: vi.fn()
            } as any;

            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockKV.put).toHaveBeenCalledWith(
                expect.any(String),
                '1', // Should increment from 0 to 1
                expect.any(Object)
            );
        });

        it('should handle invalid count values in KV', async () => {
            const mockKV = {
                get: vi.fn((key) => Promise.resolve('invalid_number')),
                put: vi.fn().mockResolvedValue(undefined)
            };

            const mockCtx = {
                get: vi.fn((key) => key === 'gatewayKey' ? createMockGatewayKey() : null),
                env: { RATE_LIMIT_KV: mockKV },
                executionCtx: { waitUntil: vi.fn() },
                header: vi.fn()
            } as any;

            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            // parseInt('invalid_number') returns NaN, which should fail the >= check
            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should fail open on KV connection errors', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(), 30, 5000, true);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            // Should still allow request
            expect(mockNext).toHaveBeenCalled();
        });

        it('should log KV errors', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockCtx = createMockContext(createMockGatewayKey(), 30, 5000, true);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[Gateway] [RateLimiter] KV Error:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });

        it('should log day limit warnings', async () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 30, 10000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[Gateway] [RateLimiter] Day limit hit')
            );
            consoleSpy.mockRestore();
        });

        it('should log minute limit warnings', async () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const mockCtx = createMockContext(createMockGatewayKey(60, 10000), 60, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[Gateway] [RateLimiter] Minute limit hit')
            );
            consoleSpy.mockRestore();
        });
    });

    describe('Concurrent Request Handling', () => {
        it('should handle concurrent requests correctly', async () => {
            const mockKV = {
                get: vi.fn().mockResolvedValue('59'),
                put: vi.fn().mockResolvedValue(undefined)
            };

            const mockCtx = {
                get: vi.fn((key) => key === 'gatewayKey' ? createMockGatewayKey(60, 10000) : null),
                env: { RATE_LIMIT_KV: mockKV },
                executionCtx: { waitUntil: vi.fn() },
                header: vi.fn()
            } as any;

            const mockNext = createMockNext();

            // Simulate 5 concurrent requests
            const promises = Array(5).fill(null).map(() =>
                rateLimiter(mockCtx, mockNext)
            );

            await Promise.all(promises);

            // All should see 59 and proceed (race condition in real scenario)
            expect(mockNext).toHaveBeenCalledTimes(5);
        });
    });

    describe('Bucket Key Generation', () => {
        it('should generate unique minute bucket keys', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            const minKey = mockCtx.env.RATE_LIMIT_KV.put.mock.calls[0][0];
            expect(minKey).toMatch(/rl:min:key-123:\d{4}-\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2}/);
        });

        it('should generate unique day bucket keys', async () => {
            const mockCtx = createMockContext(createMockGatewayKey(), 30, 5000);
            const mockNext = createMockNext();

            await rateLimiter(mockCtx, mockNext);

            const dayKey = mockCtx.env.RATE_LIMIT_KV.put.mock.calls[1][0];
            expect(dayKey).toMatch(/rl:day:key-123:\d{4}-\d{1,2}-\d{1,2}/);
        });
    });
});
