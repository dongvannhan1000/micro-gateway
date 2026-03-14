import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ipRateLimiter } from './ip-rate-limiter';
import { Env, Variables } from '../types';

describe('ipRateLimiter - Security Fixes (CRITICAL FIX #3)', () => {
    let mockEnv: Env;
    let mockContext: any;
    let mockKV: any;

    beforeEach(() => {
        // Create KV mocks with proper spy tracking
        mockKV = {
            get: vi.fn(),
            put: vi.fn()
        };

        mockEnv = {
            RATE_LIMIT_KV: mockKV
        } as unknown as Env;

        mockContext = {
            env: mockEnv,
            req: {
                header: (name: string) => {
                    if (name === 'CF-Connecting-IP') return '192.168.1.1';
                    return null;
                }
            },
            json: vi.fn().mockReturnThis(),
            header: vi.fn(),
            executionCtx: {
                waitUntil: vi.fn()
            }
        };
    });

    describe('Rate Limiting Functionality', () => {
        it('should allow requests under rate limit', async () => {
            // Mock KV: 5 requests so far (under limit of 10)
            mockKV.get.mockResolvedValue('5');

            const nextMock = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock);

            // Should allow request (call next)
            expect(nextMock).toHaveBeenCalled();

            // Should NOT return error response
            expect(mockContext.json).not.toHaveBeenCalled();

            // Should increment counter asynchronously
            expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();

            // Should add rate limit headers
            expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
            expect(mockContext.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
        });

        it('should block requests exceeding rate limit', async () => {
            // Mock KV: 10 requests so far (at limit)
            mockKV.get.mockResolvedValue('10');

            const nextMock = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock);

            // Should NOT allow request (not call next)
            expect(nextMock).not.toHaveBeenCalled();

            // Should return 429 error with exact object match
            expect(mockContext.json).toHaveBeenCalledWith(
                {
                    error: {
                        message: 'Too many authentication attempts. Please try again later.',
                        type: 'authentication',
                        code: 'auth_rate_limit_exceeded'
                    }
                },
                429,
                expect.any(Object) // Headers object
            );
        });

        it('should track different IPs independently', async () => {
            // First IP: 10 requests (at limit)
            mockContext.req.header = (name: string) => '192.168.1.1';
            mockKV.get.mockResolvedValue('10');

            const nextMock1 = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock1);

            expect(nextMock1).not.toHaveBeenCalled(); // Blocked

            // Second IP: 0 requests (under limit)
            mockContext.req.header = (name: string) => '10.0.0.1';
            mockKV.get.mockResolvedValue('0');

            const nextMock2 = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock2);

            expect(nextMock2).toHaveBeenCalled(); // Allowed
        });
    });

    describe('IP Address Hashing (GDPR Compliance)', () => {
        it('should hash IP addresses before storage', async () => {
            mockKV.get.mockResolvedValue('0');

            const nextMock = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock);

            // Get the key that was used
            const putCall = mockKV.put.mock.calls[0];
            const key = putCall[0];

            // Key should be a hash (not plaintext IP)
            expect(key).not.toContain('192.168.1.1');
            expect(key).toMatch(/^auth:rl:[a-f0-9]{64}:/); // SHA-256 hash format

            // Key should contain auth:rl prefix
            expect(key).toMatch(/^auth:rl:/);
        });

        it('should hash different IPs to different values', async () => {
            const hashes: string[] = [];

            for (const ip of ['192.168.1.1', '192.168.1.2', '10.0.0.1']) {
                mockContext.req.header = (name: string) => ip;
                mockKV.get.mockResolvedValue('0');

                const nextMock = vi.fn().mockResolvedValue(undefined);
                await ipRateLimiter(mockContext, nextMock);

                const putCall = mockKV.put.mock.calls[hashes.length];
                hashes.push(putCall[0]);
            }

            // All hashes should be unique
            const uniqueHashes = new Set(hashes);
            expect(uniqueHashes.size).toBe(3);
        });

        it('should hash same IP to same value (deterministic)', async () => {
            const hashes: string[] = [];

            for (let i = 0; i < 3; i++) {
                mockContext.req.header = (name: string) => '192.168.1.1';
                mockKV.get.mockResolvedValue('0');

                const nextMock = vi.fn().mockResolvedValue(undefined);
                await ipRateLimiter(mockContext, nextMock);

                const putCall = mockKV.put.mock.calls[i];
                hashes.push(putCall[0]);
            }

            // All hashes should be identical
            expect(hashes[0]).toBe(hashes[1]);
            expect(hashes[1]).toBe(hashes[2]);
        });
    });

    describe('Rate Limit Key Format', () => {
        it('should use minute-based buckets', async () => {
            mockKV.get.mockResolvedValue('0');

            const nextMock = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock);

            const putCall = mockKV.put.mock.calls[0];
            const key = putCall[0];

            // Key should contain date/time components for minute bucket
            expect(key).toMatch(/\d{4}-\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2}$/);
        });
    });

    describe('Error Handling', () => {
        it('should allow request when CF-Connecting-IP header missing', async () => {
            mockContext.req.header = (name: string) => null;

            const nextMock = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock);

            // Should allow request (fail open for auth)
            expect(nextMock).toHaveBeenCalled();
        });

        it('should handle KV storage errors gracefully', async () => {
            mockKV.get.mockRejectedValue(
                new Error('KV storage unavailable')
            );

            const nextMock = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock);

            // Should allow request (fail open for auth endpoints)
            expect(nextMock).toHaveBeenCalled();
        });

        it('should handle invalid count values in KV', async () => {
            mockKV.get.mockResolvedValue('not-a-number');

            const nextMock = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock);

            // Should treat as 0 and allow
            expect(nextMock).toHaveBeenCalled();
        });
    });

    describe('Async Counter Increment', () => {
        it('should increment counter asynchronously', async () => {
            mockKV.get.mockResolvedValue('5');
            mockKV.put.mockResolvedValue(undefined); // Return a promise

            const nextMock = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock);

            // Should schedule increment with waitUntil
            expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();

            const waitUntilCall = mockContext.executionCtx.waitUntil.mock.calls[0];
            const scheduled = waitUntilCall ? waitUntilCall[0] : undefined;

            // waitUntil expects a void promise or undefined
            expect(scheduled).toBeDefined();
            expect(scheduled).toBeInstanceOf(Promise);
        });
    });

    describe('Rate Limit Reset', () => {
        it('should use appropriate TTL for counter expiration', async () => {
            mockKV.get.mockResolvedValue('0');

            const nextMock = vi.fn().mockResolvedValue(undefined);
            await ipRateLimiter(mockContext, nextMock);

            const putCall = mockKV.put.mock.calls[0];
            const options = putCall[2];

            // TTL should be slightly longer than rate limit window
            expect(options.expirationTtl).toBeGreaterThanOrEqual(70);
            expect(options.expirationTtl).toBeLessThanOrEqual(120);
        });
    });
});
