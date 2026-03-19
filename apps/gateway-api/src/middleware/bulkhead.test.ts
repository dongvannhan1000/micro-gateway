import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { bulkhead, _resetCounters } from './bulkhead';
import { Env } from '../types';
import type { Project } from '@ms-gateway/db';

describe('Bulkhead Middleware', () => {
    let mockEnv: Env;
    let mockProject: Project;

    beforeEach(() => {
        // Reset module-level state between tests
        _resetCounters();

        mockProject = {
            id: 'proj-123',
            name: 'Test Project',
            description: 'Test',
            user_id: 'user-123',
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
            total_requests: 0,
            total_cost: 0,
            avg_latency: 0,
            tier: 'free',
            concurrent_limit: 5
        };

        mockEnv = {
            DB: {
                prepare: vi.fn().mockReturnThis(),
                bind: vi.fn().mockReturnThis(),
                run: vi.fn().mockResolvedValue({ success: true }),
                first: vi.fn().mockResolvedValue({ concurrent_count: 3 })
            }
        } as unknown as Env;
    });

    it('should allow requests under concurrent limit', async () => {
        const app = new Hono<{ Bindings: Env; Variables: any }>();

        // Set the project BEFORE the middleware runs
        app.use('*', async (c, next) => {
            c.set('project', mockProject);
            await next();
        });

        app.use('*', bulkhead);

        app.get('/test', (c) => {
            return c.text('OK');
        });

        const res = await app.request('/test', {}, mockEnv);

        expect(res.status).toBe(200);
    });

    it('should block requests over concurrent limit', async () => {
        // Create a fresh mock env for this test
        const mockEnvBlocked = {
            DB: {
                prepare: vi.fn().mockReturnThis(),
                bind: vi.fn().mockReturnThis(),
                run: vi.fn().mockResolvedValue({ success: true }),
                first: vi.fn().mockResolvedValue({ concurrent_count: 5 })
            }
        } as unknown as Env;

        const app = new Hono<{ Bindings: Env; Variables: any }>();

        // Set the project BEFORE the middleware runs
        app.use('*', async (c, next) => {
            c.set('project', mockProject);
            await next();
        });

        app.use('*', bulkhead);

        app.get('/test', (c) => {
            return c.text('OK');
        });

        // First request will load from DB and see count=5 which is at limit
        const res = await app.request('/test', {}, mockEnvBlocked);

        expect(res.status).toBe(429);
        const data = await res.json();
        expect(data.error.message).toContain('Too many concurrent requests');
    });

    it('should decrement counter after request completes', async () => {
        const runSpy = vi.fn().mockResolvedValue({ success: true });

        mockEnv.DB = {
            prepare: vi.fn().mockReturnThis(),
            bind: vi.fn().mockReturnThis(),
            run: runSpy,
            first: vi.fn().mockResolvedValue({ concurrent_count: 3 })
        } as any;

        const app = new Hono<{ Bindings: Env; Variables: any }>();

        // Set the project BEFORE the middleware runs
        app.use('*', async (c, next) => {
            c.set('project', mockProject);
            await next();
        });

        app.use('*', bulkhead);

        app.get('/test', (c) => {
            return c.text('OK');
        });

        await app.request('/test', {}, mockEnv);

        // Should NOT have called run() since we removed the blocking D1 sync
        // Counter decrements are now in-memory only
        expect(runSpy).not.toHaveBeenCalled();
    });
});
