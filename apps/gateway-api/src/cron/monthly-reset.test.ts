/**
 * Monthly Usage Reset Cron Tests
 *
 * Unit tests for the monthly usage reset functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { monthlyUsageReset } from './monthly-reset';

// Mock environment
function createMockEnv(keysReset: number = 5) {
  return {
    DB: {
      prepare: vi.fn(() => ({
        run: vi.fn().mockResolvedValue({
          success: true,
          meta: { changes: keysReset }
        })
      }))
    }
  } as any;
}

describe('Monthly Usage Reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset usage for all active keys', async () => {
    const mockEnv = createMockEnv(10);
    const result = await monthlyUsageReset(mockEnv);

    expect(result.success).toBe(true);
    expect(result.keysReset).toBe(10);
    expect(result.error).toBeUndefined();
  });

  it('should handle zero keys case', async () => {
    const mockEnv = createMockEnv(0);
    const result = await monthlyUsageReset(mockEnv);

    expect(result.success).toBe(true);
    expect(result.keysReset).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it('should handle database errors', async () => {
    const mockEnv = {
      DB: {
        prepare: vi.fn(() => ({
          run: vi.fn().mockResolvedValue({
            success: false
          })
        }))
      }
    } as any;

    const result = await monthlyUsageReset(mockEnv);

    expect(result.success).toBe(false);
    expect(result.keysReset).toBe(0);
    expect(result.error).toBe('Database update failed');
  });

  it('should log structured output', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockEnv = createMockEnv(5);

    await monthlyUsageReset(mockEnv);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[CronJob] Action: monthly_usage_reset_started')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[CronJob] Action: monthly_usage_reset_completed')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('keys_reset=5')
    );

    consoleSpy.mockRestore();
  });
});
