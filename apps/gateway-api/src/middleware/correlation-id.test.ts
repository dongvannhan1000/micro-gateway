import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { correlationId } from './correlation-id';

describe('Correlation ID Middleware', () => {
    it('should generate correlation ID for new request', async () => {
        const app = new Hono();
        app.use('*', correlationId);

        app.get('/test', (c) => {
            const id = c.get('correlationId');
            return c.json({ correlationId: id });
        });

        const res = await app.request('/test');
        const data = await res.json() as { correlationId: string };

        expect(data.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should include correlation ID in response header', async () => {
        const app = new Hono();
        app.use('*', correlationId);

        app.get('/test', (c) => c.text('OK'));

        const res = await app.request('/test');

        expect(res.headers.get('X-Correlation-ID')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should preserve existing correlation ID from request header', async () => {
        const app = new Hono();
        app.use('*', correlationId);

        app.get('/test', (c) => {
            const id = c.get('correlationId');
            return c.json({ correlationId: id });
        });

        const existingId = '12345678-1234-1234-1234-123456789abc';
        const res = await app.request('/test', {
            headers: {
                'X-Correlation-ID': existingId
            }
        });
        const data = await res.json() as { correlationId: string };

        expect(data.correlationId).toBe(existingId);
        expect(res.headers.get('X-Correlation-ID')).toBe(existingId);
    });
});
