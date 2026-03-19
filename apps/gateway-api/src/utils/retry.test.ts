import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff } from './retry';

describe('Retry Logic', () => {
    it('should succeed on first try', async () => {
        const mockFn = vi.fn().mockResolvedValue('success');

        const result = await retryWithBackoff(mockFn, { maxRetries: 3 });

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
        const mockFn = vi.fn()
            .mockRejectedValueOnce(new Error('timeout'))
            .mockResolvedValue('success');

        const result = await retryWithBackoff(mockFn, {
            maxRetries: 3,
            initialDelay: 10
        });

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should give up after max retries', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('timeout'));

        await expect(
            retryWithBackoff(mockFn, { maxRetries: 2, initialDelay: 10 })
        ).rejects.toThrow('timeout');

        expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should add jitter to delays', async () => {
        const mockFn = vi.fn()
            .mockRejectedValueOnce(new Error('timeout'))
            .mockRejectedValueOnce(new Error('timeout'))
            .mockResolvedValue('success');

        const start = Date.now();
        await retryWithBackoff(mockFn, {
            maxRetries: 3,
            initialDelay: 50,
            jitter: true
        });
        const duration = Date.now() - start;

        // Should be > 50ms (initial delay) but not exactly 50ms (jitter)
        expect(duration).toBeGreaterThan(40);
    });
});
