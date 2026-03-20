import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkAlerts } from './alert-engine';
import type { Env, Variables } from '../types';

describe('AlertEngine - Hybrid Scope', () => {
    let mockContext: any;
    let mockRepos: any;
    let mockDB: any;
    let mockKV: any;

    beforeEach(() => {
        // Mock KV
        mockKV = {
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue(undefined)
        };

        // Mock DB
        mockDB = {
            prepare: vi.fn().mockReturnThis(),
            bind: vi.fn().mockReturnThis(),
            first: vi.fn()
        };

        // Mock database
        mockRepos = {
            alert: {
                findActiveRules: vi.fn().mockResolvedValue([
                    {
                        id: 'rule-1',
                        type: 'cost_threshold',
                        scope: 'project',
                        threshold: 10,
                        action: 'email',
                        target: 'test@example.com',
                        project_id: 'project-123'
                    }
                ]),
                createHistory: vi.fn().mockResolvedValue(undefined)
            },
            project: {
                findNameById: vi.fn().mockResolvedValue({ name: 'Test Project' })
            },
            gatewayKey: {
                findById: vi.fn()
            }
        };

        // Mock context
        mockContext = {
            get: vi.fn((key) => {
                if (key === 'repos') return mockRepos;
                if (key === 'gatewayKey') return { current_month_usage_usd: 5 };
                return null;
            }),
            env: {
                DB: mockDB,
                RATE_LIMIT_KV: mockKV,
                RESEND_API_KEY: 'test-key'
            },
            executionCtx: {
                waitUntil: vi.fn()
            }
        };
    });

    it('should sum all keys usage when scope=project', async () => {
        // Setup: Project has 3 keys with $5, $3, $8 usage (total: $16)
        mockDB.first.mockResolvedValue({ total_usage: 16 });

        // Rule: scope='project', threshold=10
        // Expect alert to trigger ($16 > $10)
        await checkAlerts(mockContext, 'project-123', 5);

        // Verify SUM query was called
        expect(mockDB.prepare).toHaveBeenCalledWith(
            expect.stringContaining('SUM(current_month_usage_usd)')
        );
        expect(mockDB.bind).toHaveBeenCalledWith('project-123');
        expect(mockRepos.alert.createHistory).toHaveBeenCalled();
        expect(mockKV.put).toHaveBeenCalled(); // Cooldown set
    });

    it('should check specific key usage when scope=key', async () => {
        // Setup: Key with $8 usage
        mockRepos.gatewayKey.findById.mockResolvedValue({
            id: 'key-123',
            current_month_usage_usd: 8
        });

        mockRepos.alert.findActiveRules.mockResolvedValueOnce([
            {
                id: 'rule-2',
                type: 'cost_threshold',
                scope: 'key',
                gateway_key_id: 'key-123',
                threshold: 10,
                action: 'email',
                target: 'test@example.com',
                project_id: 'project-123'
            }
        ]);

        // Rule: scope='key', threshold=10
        // Expect NO alert ($8 < $10)
        await checkAlerts(mockContext, 'project-123', 5);

        expect(mockRepos.gatewayKey.findById).toHaveBeenCalledWith('key-123');
        expect(mockRepos.alert.createHistory).not.toHaveBeenCalled();
    });

    it('should trigger alert when key scope exceeds threshold', async () => {
        // Setup: Key with $12 usage
        mockRepos.gatewayKey.findById.mockResolvedValue({
            id: 'key-456',
            current_month_usage_usd: 12
        });

        mockRepos.alert.findActiveRules.mockResolvedValueOnce([
            {
                id: 'rule-3',
                type: 'cost_threshold',
                scope: 'key',
                gateway_key_id: 'key-456',
                threshold: 10,
                action: 'email',
                target: 'test@example.com',
                project_id: 'project-123'
            }
        ]);

        // Rule: scope='key', threshold=10
        // Expect alert ($12 > $10)
        await checkAlerts(mockContext, 'project-123', 5);

        expect(mockRepos.gatewayKey.findById).toHaveBeenCalledWith('key-456');
        expect(mockRepos.alert.createHistory).toHaveBeenCalled();
        expect(mockKV.put).toHaveBeenCalled(); // Cooldown set
    });

    it('should not trigger alert when project scope below threshold', async () => {
        // Setup: Project has total usage of $8
        mockDB.first.mockResolvedValue({ total_usage: 8 });

        // Rule: scope='project', threshold=10
        // Expect NO alert ($8 < $10)
        await checkAlerts(mockContext, 'project-123', 5);

        expect(mockDB.prepare).toHaveBeenCalledWith(
            expect.stringContaining('SUM(current_month_usage_usd)')
        );
        expect(mockRepos.alert.createHistory).not.toHaveBeenCalled();
    });

    it('should handle injection_detected alerts unchanged', async () => {
        // Setup: High injection score
        mockContext.get.mockImplementation((key) => {
            if (key === 'repos') return mockRepos;
            if (key === 'gatewayKey') return { current_month_usage_usd: 5 };
            if (key === 'promptInjectionScore') return 0.8;
            return null;
        });

        mockRepos.alert.findActiveRules.mockResolvedValueOnce([
            {
                id: 'rule-injection',
                type: 'injection_detected',
                scope: 'project',
                threshold: 0.7,
                action: 'email',
                target: 'test@example.com',
                project_id: 'project-123'
            }
        ]);

        // Expect alert (0.8 > 0.7)
        await checkAlerts(mockContext, 'project-123', 5);

        expect(mockRepos.alert.createHistory).toHaveBeenCalled();
        expect(mockKV.put).toHaveBeenCalled(); // Cooldown set
    });
});
