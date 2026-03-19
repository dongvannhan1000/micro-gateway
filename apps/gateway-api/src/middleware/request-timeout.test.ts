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
});
