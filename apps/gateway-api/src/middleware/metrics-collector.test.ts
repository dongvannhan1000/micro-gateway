import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { metricsCollector } from './metrics-collector';
import { Env, Variables } from '../types';

describe('Metrics Collector Middleware', () => {
    let mockEnv: Env;

    beforeEach(() => {
        mockEnv = {
            DB: {
                prepare: vi.fn().mockReturnThis(),
                bind: vi.fn().mockReturnThis(),
                run: vi.fn().mockResolvedValue({ success: true }),
                first: vi.fn()
            }
        } as unknown as Env;
    });

    it('should collect metrics on successful request', async () => {
        // Mock Math.random to always pass the 10% sampling check
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05);

        const app = new Hono<{ Bindings: Env; Variables: Variables }>();

        // Add a middleware to set context values before metrics collector runs
        app.use('*', async (c, next) => {
            c.set('correlationId', 'corr-123');
            c.set('project', { id: 'proj-123' } as any);
            c.set('gatewayKey', { id: 'key-123' } as any);
            await next();
        });

        app.use('*', metricsCollector);

        app.get('/test', (c) => {
            return c.text('OK');
        });

        const res = await app.request('/test', {}, mockEnv);

        expect(res.status).toBe(200);
        expect(mockEnv.DB.prepare).toHaveBeenCalled();

        randomSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
        const mockEnvFail = {
            DB: {
                prepare: vi.fn().mockImplementation(() => {
                    throw new Error('DB error');
                })
            }
        } as unknown as Env;

        const app = new Hono<{ Bindings: Env; Variables: Variables }>();
        app.use('*', metricsCollector);

        app.get('/test', (c) => c.text('OK'));

        const res = await app.request('/test', {}, mockEnvFail);

        // Should not block request even if metrics collection fails
        expect(res.status).toBe(200);
    });
});
