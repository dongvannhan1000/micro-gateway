import { describe, it, expect, vi } from 'vitest';
import { logger } from './logger';

describe('Logger', () => {
    it('should log info with correlation ID', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info({
            correlationId: 'test-id-123',
            event: 'test_event',
            message: 'Test message'
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('"correlationId":"test-id-123"')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('"event":"test_event"')
        );

        consoleSpy.mockRestore();
    });

    it('should log error with error details', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const error = new Error('Test error');
        logger.error({
            correlationId: 'test-id-123',
            error: error.message,
            stack: error.stack
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('"error":"Test error"')
        );

        consoleSpy.mockRestore();
    });

    it('should include timestamp in logs', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info({
            correlationId: 'test-id-123',
            event: 'test_event'
        });

        const loggedString = consoleSpy.mock.calls[0][0];
        const loggedData = JSON.parse(loggedString);
        expect(loggedData).toHaveProperty('timestamp');

        consoleSpy.mockRestore();
    });

    it('should log warn with correlation ID', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        logger.warn({
            correlationId: 'test-id-123',
            event: 'test_event',
            message: 'Warning message'
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('"correlationId":"test-id-123"')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('"event":"test_event"')
        );

        consoleSpy.mockRestore();
    });
});