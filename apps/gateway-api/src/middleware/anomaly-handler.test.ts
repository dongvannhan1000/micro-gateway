import { describe, it, expect, beforeEach, vi } from 'vitest';
import { anomalyHandler } from './anomaly-handler';
import { Env, Variables } from '../types';

// Mock the anomaly detector service
vi.mock('../services/anomaly-detector', () => ({
    detectAnomaly: vi.fn()
}));

// Mock the error response utility
vi.mock('../utils/errors', () => ({
    openAiError: vi.fn((c, message, type, code, status) => {
        return c.json({ error: { message, type, code } }, status);
    })
}));

describe('anomalyHandler - Security Fixes', () => {
    let mockEnv: Env;
    let mockContext: any;
    let mockRepos: any;
    let { detectAnomaly } = require('../services/anomaly-detector');

    beforeEach(() => {
        mockEnv = {
            RATE_LIMIT_KV: {
                get: vi.fn(),
                put: vi.fn()
            }
        } as unknown as Env;

        mockRepos = {
            securityViolation: {
                create: vi.fn().mockResolvedValue({ id: 'violation-123' })
            }
        };

        mockContext = {
            env: mockEnv,
            req: {
                header: (name: string) => {
                    if (name === 'CF-Connecting-IP') return '192.168.1.1';
                    if (name === 'User-Agent') return 'test-agent';
                    return null;
                },
                path: '/v1/chat/completions',
                method: 'POST'
            },
            get: (key: string) => {
                if (key === 'project') return { id: 'project-123' };
                if (key === 'repos') return mockRepos;
                return null;
            },
            set: vi.fn(),
            json: vi.fn().mockReturnThis(),
            executionCtx: {
                waitUntil: vi.fn()
            }
        };

        // Reset mocks
        vi.clearAllMocks();
    });

    describe('Anomaly Blocking (CRITICAL FIX #2)', () => {
        it('should block requests when anomaly is detected', async () => {
            // Mock anomaly detection to return true
            detectAnomaly.mockResolvedValue({
                isAnomaly: true,
                reason: 'Sudden spike detected: 100 req/min vs 5-min avg of 10.0'
            });

            const nextMock = async () => {};
            await anomalyHandler(mockContext, nextMock);

            // Should NOT call next() (blocking behavior)
            expect(nextMock).not.toHaveBeenCalled();

            // Should return error response
            expect(mockContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: expect.stringContaining('Suspicious activity'),
                        type: 'security_violation',
                        code: 'anomaly_detected'
                    })
                }),
                403
            );

            // Should log security violation to database
            expect(mockRepos.securityViolation.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    project_id: 'project-123',
                    violation_type: 'anomaly',
                    severity: 'high'
                })
            );
        });

        it('should allow requests when no anomaly is detected', async () => {
            // Mock anomaly detection to return false
            detectAnomaly.mockResolvedValue({
                isAnomaly: false
            });

            const nextMock = async () => {};
            await anomalyHandler(mockContext, nextMock);

            // SHOULD call next() (allow through)
            expect(nextMock).toHaveBeenCalled();

            // Should NOT log security violation
            expect(mockRepos.securityViolation.create).not.toHaveBeenCalled();

            // Should NOT return error response
            expect(mockContext.json).not.toHaveBeenCalled();
        });

        it('should include request metadata in security violation log', async () => {
            detectAnomaly.mockResolvedValue({
                isAnomaly: true,
                reason: 'Prompt injection pattern detected'
            });

            const nextMock = async () => {};
            await anomalyHandler(mockContext, nextMock);

            // Should log with metadata
            expect(mockRepos.securityViolation.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.stringContaining('192.168.1.1') // IP address
                })
            );
        });

        it('should handle database logging errors gracefully', async () => {
            // Mock database error
            mockRepos.securityViolation.create.mockRejectedValue(
                new Error('Database connection failed')
            );

            detectAnomaly.mockResolvedValue({
                isAnomaly: true,
                reason: 'Suspicious pattern'
            });

            const nextMock = async () => {};
            await anomalyHandler(mockContext, nextMock);

            // Should still block request even if logging fails
            expect(nextMock).not.toHaveBeenCalled();
            expect(mockContext.json).toHaveBeenCalled();
        });
    });

    describe('Fail-Closed Behavior (CRITICAL FIX #2)', () => {
        it('should block requests when anomaly detector throws error', async () => {
            // Mock anomaly detector to throw error
            detectAnomaly.mockRejectedValue(
                new Error('Anomaly detector service unavailable')
            );

            const nextMock = async () => {};
            await anomalyHandler(mockContext, nextMock);

            // Should NOT call next() (fail closed)
            expect(nextMock).not.toHaveBeenCalled();

            // Should return error response
            expect(mockContext.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        message: expect.stringContaining('Security verification failed'),
                        type: 'security_error',
                        code: 'anomaly_check_failed'
                    })
                }),
                500
            );
        });

        it('should not leak detection details in error messages', async () => {
            detectAnomaly.mockResolvedValue({
                isAnomaly: true,
                reason: 'Internal detection algorithm details: threshold=5.0, score=9.5'
            });

            const nextMock = async () => {};
            await anomalyHandler(mockContext, nextMock);

            // Error message should be generic (not leak details)
            const callArgs = mockContext.json.mock.calls[0];
            const errorMessage = callArgs[0].error.message;

            expect(errorMessage).not.toContain('threshold');
            expect(errorMessage).not.toContain('score');
            expect(errorMessage).not.toContain('algorithm');
            expect(errorMessage).toBe('Suspicious activity detected. Your request has been blocked for security reasons.');
        });
    });

    describe('Edge Cases', () => {
        it('should handle requests without project context', async () => {
            mockContext.get = (key: string) => {
                if (key === 'project') return null; // No project
                return null;
            };

            const nextMock = async () => {};
            await anomalyHandler(mockContext, nextMock);

            // Should call next() (skip anomaly detection)
            expect(nextMock).toHaveBeenCalled();
        });

        it('should handle anomaly detection with empty reason', async () => {
            detectAnomaly.mockResolvedValue({
                isAnomaly: true,
                reason: undefined // No reason provided
            });

            const nextMock = async () => {};
            await anomalyHandler(mockContext, nextMock);

            // Should still block and log
            expect(nextMock).not.toHaveBeenCalled();
            expect(mockRepos.securityViolation.create).toHaveBeenCalled();
        });

        it('should handle anomaly detection timeout', async () => {
            // Mock timeout
            detectAnomaly.mockImplementation(() =>
                new Promise((resolve) => setTimeout(resolve, 10000))
            );

            const nextMock = async () => {};

            // Should timeout and handle gracefully
            // (implementation may vary - this documents expected behavior)
        });
    });

    describe('Security Violation Logging', () => {
        it('should log violation with correct severity', async () => {
            detectAnomaly.mockResolvedValue({
                isAnomaly: true,
                reason: 'Attack detected'
            });

            const nextMock = async () => {};
            await anomalyHandler(mockContext, nextMock);

            expect(mockRepos.securityViolation.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'high',
                    violation_type: 'anomaly'
                })
            );
        });

        it('should log violation with project ID', async () => {
            detectAnomaly.mockResolvedValue({
                isAnomaly: true,
                reason: 'Attack detected'
            });

            const nextMock = async () => {};
            await anomalyHandler(mockContext, nextMock);

            expect(mockRepos.securityViolation.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    project_id: 'project-123'
                })
            );
        });
    });
});
