import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { requestTimeout } from './request-timeout';

describe('Request Timeout Middleware', () => {
    it('should set timeout deadline in context', async () => {
        const app = new Hono();
        app.use('*', requestTimeout({ timeout: 5000 }));

        app.get('/test', (c) => {
            const deadline = c.get('timeoutDeadline');
            expect(deadline).toBeDefined();
            expect(deadline).toBeInstanceOf(Date);
            return c.text('OK');
        });

        const res = await app.request('/test');

        expect(res.status).toBe(200);
    });

    it('should use default 30s timeout if not specified', async () => {
        const app = new Hono();
        app.use('*', requestTimeout());

        app.get('/test', (c) => {
            const deadline = c.get('timeoutDeadline');
            const now = new Date();
            const diff = deadline.getTime() - now.getTime();

            // Should be approximately 30 seconds (allow 1s tolerance)
            expect(diff).toBeGreaterThan(29000);
            expect(diff).toBeLessThan(31000);

            return c.text('OK');
        });

        const res = await app.request('/test');

        expect(res.status).toBe(200);
    });

    it('should enforce timeout and return 408 when deadline exceeded before fetch', async () => {
        const app = new Hono();

        app.use('*', requestTimeout({ timeout: 100 }));

        app.post('/test', async (c) => {
            // Simulate delay that exceeds timeout
            await new Promise(resolve => setTimeout(resolve, 150));

            // Check timeout deadline before making fetch
            const deadline = c.get('timeoutDeadline');
            if (deadline && new Date() >= deadline) {
                return c.json({
                    error: {
                        message: 'Request timeout',
                        type: 'timeout',
                        code: 'request_timeout'
                    }
                }, 408);
            }

            return c.text('OK');
        });

        const res = await app.request('/test', {
            method: 'POST',
            body: JSON.stringify({ test: 'data' })
        });

        expect(res.status).toBe(408);

        const body = await res.json();
        expect(body.error).toBeDefined();
        expect(body.error.type).toBe('timeout');
        expect(body.error.code).toBe('request_timeout');
    });

    it('should enforce timeout and return 408 when abort triggered during fetch', async () => {
        const app = new Hono();

        app.use('*', requestTimeout({ timeout: 100 }));

        app.post('/test', async (c) => {
            const deadline = c.get('timeoutDeadline');
            const timeout = deadline ? Math.max(0, deadline.getTime() - Date.now()) : 30000;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                // Simulate a slow fetch
                await fetch('https://httpbin.org/delay/5', {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                return c.text('OK');
            } catch (err: any) {
                clearTimeout(timeoutId);

                if (err.name === 'AbortError') {
                    return c.json({
                        error: {
                            message: 'Request timeout',
                            type: 'timeout',
                            code: 'request_timeout'
                        }
                    }, 408);
                }

                throw err;
            }
        });

        const res = await app.request('/test', {
            method: 'POST',
            body: JSON.stringify({ test: 'data' })
        });

        expect(res.status).toBe(408);

        const body = await res.json();
        expect(body.error).toBeDefined();
        expect(body.error.type).toBe('timeout');
        expect(body.error.code).toBe('request_timeout');
    });
});
