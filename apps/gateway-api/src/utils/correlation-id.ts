import type { Context } from 'hono';

/**
 * Generate a unique correlation ID for request tracing
 * Uses UUID v4 format
 */
export function generateCorrelationId(): string {
    return crypto.randomUUID();
}

/**
 * Get or create correlation ID from Hono context
 * Stores in context.get('correlationId') for middleware access
 */
export function getCorrelationId(context: Map<string, unknown> | Context): string {
    // Handle Hono Context
    if ('get' in context && typeof context.get === 'function') {
        let id = context.get<string>('correlationId');
        if (!id) {
            id = generateCorrelationId();
            context.set('correlationId', id);
        }
        return id;
    }

    // Handle plain Map
    let id = context.get('correlationId') as string | undefined;
    if (!id) {
        id = generateCorrelationId();
        context.set('correlationId', id);
    }
    return id;
}