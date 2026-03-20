import { describe, it, expect, vi } from 'vitest';
import { AlertRepository } from '../repositories/alert.repository';
import { GatewayKeyRepository } from '../repositories/gateway-key.repository';

describe('Alerts API - Hybrid Scope Validation', () => {
    describe('validateGatewayKey', () => {
        it('should return true for valid gateway key in project', async () => {
            const mockDB = {
                execute: vi.fn().mockResolvedValue({
                    results: [{ id: 'key-123' }]
                })
            };

            const repo = new AlertRepository(mockDB as any);
            const isValid = await repo.validateGatewayKey('key-123', 'project-123');

            expect(isValid).toBe(true);
            expect(mockDB.execute).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM gateway_keys'),
                ['key-123', 'project-123']
            );
        });

        it('should return false for non-existent gateway key', async () => {
            const mockDB = {
                execute: vi.fn().mockResolvedValue({
                    results: []
                })
            };

            const repo = new AlertRepository(mockDB as any);
            const isValid = await repo.validateGatewayKey('nonexistent', 'project-123');

            expect(isValid).toBe(false);
        });

        it('should return false for gateway key in different project', async () => {
            const mockDB = {
                execute: vi.fn().mockResolvedValue({
                    results: []
                })
            };

            const repo = new AlertRepository(mockDB as any);
            const isValid = await repo.validateGatewayKey('key-123', 'different-project');

            expect(isValid).toBe(false);
        });
    });

    describe('createRule with scope', () => {
        it('should create project-scoped alert rule', async () => {
            const mockDB = {
                run: vi.fn().mockResolvedValue({ changes: 1 })
            };

            const repo = new AlertRepository(mockDB as any);
            await repo.createRule({
                id: 'rule-1',
                projectId: 'project-123',
                type: 'monthly_usage',
                scope: 'project',
                gateway_key_id: null,
                threshold: 100,
                action: 'email',
                target: 'admin@example.com',
            });

            expect(mockDB.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO alert_rules'),
                expect.arrayContaining([
                    'rule-1',
                    'project-123',
                    'monthly_usage',
                    'project',
                    null,
                    100,
                    'email',
                    'admin@example.com'
                ])
            );
        });

        it('should create key-scoped alert rule', async () => {
            const mockDB = {
                run: vi.fn().mockResolvedValue({ changes: 1 })
            };

            const repo = new AlertRepository(mockDB as any);
            await repo.createRule({
                id: 'rule-2',
                projectId: 'project-123',
                type: 'monthly_usage',
                scope: 'key',
                gateway_key_id: 'key-456',
                threshold: 50,
                action: 'email',
                target: 'admin@example.com',
            });

            expect(mockDB.run).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO alert_rules'),
                expect.arrayContaining([
                    'rule-2',
                    'project-123',
                    'monthly_usage',
                    'key',
                    'key-456',
                    50,
                    'email',
                    'admin@example.com'
                ])
            );
        });
    });
});

describe('GatewayKeyRepository - findById', () => {
    it('should find gateway key by ID in project', async () => {
        const mockKey = {
            id: 'key-123',
            project_id: 'project-123',
            name: 'Test Key',
            status: 'active'
        };

        const mockDB = {
            execute: vi.fn().mockResolvedValue({
                results: [mockKey]
            })
        };

        const repo = new GatewayKeyRepository(mockDB as any);
        const key = await repo.findById('key-123', 'project-123');

        expect(key).toEqual(mockKey);
        expect(mockDB.execute).toHaveBeenCalledWith(
            expect.stringContaining('SELECT k.*'),
            ['key-123', 'project-123']
        );
    });

    it('should return null for non-existent key', async () => {
        const mockDB = {
            execute: vi.fn().mockResolvedValue({
                results: []
            })
        };

        const repo = new GatewayKeyRepository(mockDB as any);
        const key = await repo.findById('nonexistent', 'project-123');

        expect(key).toBeNull();
    });

    it('should return null for key in different project', async () => {
        const mockDB = {
            execute: vi.fn().mockResolvedValue({
                results: []
            })
        };

        const repo = new GatewayKeyRepository(mockDB as any);
        const key = await repo.findById('key-123', 'different-project');

        expect(key).toBeNull();
    });
});
