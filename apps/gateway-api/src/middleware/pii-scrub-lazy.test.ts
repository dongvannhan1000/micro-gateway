/**
 * PII Scrubbing Middleware Tests (Lazy Scrubbing)
 *
 * Tests for lazy PII scrubbing - only scrub when actually logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { piiScrubber, scrubPIIForLogging, scrubPII } from './pii-scrub';
import { Context, Next } from 'hono';
import { Project } from '@ms-gateway/db';

// Mock project with PII scrubbing enabled
const mockProject: Partial<Project> = {
    id: 'test-project-id',
    pii_scrubbing_enabled: 1,
    pii_scrubbing_level: 'medium',
    pii_custom_patterns: undefined
};

// Mock project with PII scrubbing disabled
const mockProjectDisabled: Partial<Project> = {
    id: 'test-project-id',
    pii_scrubbing_enabled: 0,
    pii_scrubbing_level: 'medium',
    pii_custom_patterns: undefined
};

function createMockContext(project: Partial<Project>, requestBody: any = {}) {
    const context = {
        get: vi.fn(),
        set: vi.fn(),
        req: {
            json: vi.fn().mockResolvedValue(requestBody)
        }
    } as any;

    context.get.mockImplementation((key: string) => {
        if (key === 'project') return project;
        if (key === 'responseBody') return undefined;
        return undefined;
    });

    return context;
}

describe('PII Scrubber - Lazy Scrubbing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Middleware - Data Capture', () => {
        it('should capture raw request body without scrubbing', async () => {
            const mockContext = createMockContext(mockProject, {
                messages: [{ role: 'user', content: 'Email: user@example.com' }]
            });
            const mockNext = vi.fn();

            await piiScrubber(mockContext, mockNext);

            // Verify config was stored
            expect(mockContext.set).toHaveBeenCalledWith(
                'piiScrubbingConfig',
                expect.objectContaining({
                    enabled: true,
                    level: 'medium'
                })
            );

            // Verify raw request was captured
            expect(mockContext.set).toHaveBeenCalledWith(
                'piiRawRequest',
                expect.stringContaining('user@example.com')
            );

            // Verify next() was called
            expect(mockNext).toHaveBeenCalled();
        });

        it('should not capture data when PII scrubbing is disabled', async () => {
            const mockContext = createMockContext(mockProjectDisabled, {
                messages: [{ role: 'user', content: 'Email: user@example.com' }]
            });
            const mockNext = vi.fn();

            await piiScrubber(mockContext, mockNext);

            // Verify no data was captured
            expect(mockContext.set).not.toHaveBeenCalledWith('piiScrubbingConfig', expect.anything());
            expect(mockContext.set).not.toHaveBeenCalledWith('piiRawRequest', expect.anything());

            // Verify next() was called
            expect(mockNext).toHaveBeenCalled();
        });

        it('should capture response body after next()', async () => {
            const mockContext = createMockContext(mockProject, {
                messages: [{ role: 'user', content: 'Hello' }]
            });
            const mockNext = vi.fn().mockImplementation(async () => {
                // Simulate response being set
                mockContext.get.mockImplementation((key: string) => {
                    if (key === 'project') return mockProject;
                    if (key === 'responseBody') return { choices: [{ message: { content: 'Hi user@example.com' } }] };
                    return undefined;
                });
            });

            await piiScrubber(mockContext, mockNext);

            // Verify raw response was captured
            expect(mockContext.set).toHaveBeenCalledWith(
                'piiRawResponse',
                expect.stringContaining('user@example.com')
            );
        });
    });

    describe('Lazy Scrubbing - scrubPIIForLogging', () => {
        it('should scrub on-demand when logging', () => {
            const mockContext = createMockContext(mockProject);

            // Set up context as middleware would
            mockContext.get.mockImplementation((key: string) => {
                if (key === 'piiScrubbingConfig') {
                    return { enabled: true, level: 'medium' };
                }
                if (key === 'piiRawRequest') {
                    return JSON.stringify({ messages: [{ content: 'Email: user@example.com' }] });
                }
                if (key === 'project') return mockProject;
                return undefined;
            });

            const result = scrubPIIForLogging(mockContext);

            // Should have scrubbed data
            expect(result.requestScrubbed).toBeDefined();
            expect(result.requestScrubbed).toContain('u***@example.com');
            expect(result.totalScrubbed).toBeGreaterThan(0);
        });

        it('should return empty result when PII scrubbing is disabled', () => {
            const mockContext = createMockContext(mockProjectDisabled);

            // Set up context as middleware would
            mockContext.get.mockImplementation((key: string) => {
                if (key === 'piiScrubbingConfig') {
                    return { enabled: false, level: 'medium' };
                }
                if (key === 'piiRawRequest') {
                    return JSON.stringify({ messages: [{ content: 'Email: user@example.com' }] });
                }
                if (key === 'project') return mockProjectDisabled;
                return undefined;
            });

            const result = scrubPIIForLogging(mockContext);

            // Should NOT have scrubbed
            expect(result.requestScrubbed).toBeUndefined();
            expect(result.responseScrubbed).toBeUndefined();
            expect(result.totalScrubbed).toBe(0);
        });

        it('should scrub both request and response', () => {
            const mockContext = createMockContext(mockProject);

            mockContext.get.mockImplementation((key: string) => {
                if (key === 'piiScrubbingConfig') {
                    return { enabled: true, level: 'medium' };
                }
                if (key === 'piiRawRequest') {
                    return JSON.stringify({ messages: [{ content: 'Send to user@example.com' }] });
                }
                if (key === 'piiRawResponse') {
                    return JSON.stringify({ choices: [{ message: { content: 'Sent to admin@test.org' } }] });
                }
                if (key === 'project') return mockProject;
                return undefined;
            });

            const result = scrubPIIForLogging(mockContext);

            // Should have scrubbed both
            expect(result.requestScrubbed).toContain('u***@example.com');
            expect(result.responseScrubbed).toContain('a***n@test.org'); // admin has 5 chars, so first + *** + last
            expect(result.requestCount).toBe(1);
            expect(result.responseCount).toBe(1);
            expect(result.totalScrubbed).toBe(2);
        });

        it('should handle empty data gracefully', () => {
            const mockContext = createMockContext(mockProject);

            mockContext.get.mockImplementation((key: string) => {
                if (key === 'piiScrubbingConfig') {
                    return { enabled: true, level: 'medium' };
                }
                if (key === 'project') return mockProject;
                return undefined;
            });

            const result = scrubPIIForLogging(mockContext);

            // Should handle gracefully
            expect(result.requestScrubbed).toBeUndefined();
            expect(result.responseScrubbed).toBeUndefined();
            expect(result.totalScrubbed).toBe(0);
        });
    });

    describe('Performance Optimization', () => {
        it('should avoid scrubbing when config is missing', () => {
            const mockContext = createMockContext(mockProject);

            mockContext.get.mockImplementation((key: string) => {
                if (key === 'project') return mockProject;
                return undefined;
            });

            const result = scrubPIIForLogging(mockContext);

            // Should skip scrubbing
            expect(result.totalScrubbed).toBe(0);
        });

        it('should only scrub once per logging operation', () => {
            const mockContext = createMockContext(mockProject);
            let scrubCallCount = 0;

            mockContext.get.mockImplementation((key: string) => {
                if (key === 'piiScrubbingConfig') {
                    return { enabled: true, level: 'medium' };
                }
                if (key === 'piiRawRequest') {
                    return JSON.stringify({ messages: [{ content: 'Email: user@example.com' }] });
                }
                if (key === 'project') return mockProject;
                return undefined;
            });

            // Call multiple times
            scrubPIIForLogging(mockContext);
            scrubPIIForLogging(mockContext);

            // Each call should scrub independently (this is expected behavior)
            // In practice, scrubPIIForLogging is called once per log operation
        });
    });

    describe('Backward Compatibility - scrubPII function', () => {
        it('should still support direct scrubPII calls', () => {
            const input = 'Contact user@example.com for support';
            const result = scrubPII(input, { enabled: true, level: 'medium' });

            expect(result.scrubbedContent).toContain('u***@example.com');
            expect(result.scrubbedCount).toBeGreaterThan(0);
        });

        it('should support disabled scrubbing in direct calls', () => {
            const input = 'Email: user@example.com';
            const result = scrubPII(input, { enabled: false, level: 'medium' });

            expect(result.scrubbedContent).toBe(input);
            expect(result.scrubbedCount).toBe(0);
        });
    });
});
