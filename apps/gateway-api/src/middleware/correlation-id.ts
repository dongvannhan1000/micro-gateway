import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';
import { getCorrelationId } from '../utils/correlation-id';

/**
 * Correlation ID middleware - MUST BE FIRST
 * Generates unique ID for each request and adds to context + response header
 * Enables end-to-end request tracing across all middleware
 */
export const correlationId: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
    // Use existing correlation ID from request header, or generate new one
    const existingId = c.req.header('X-Correlation-ID');
    const id = existingId || getCorrelationId(c);

    // Store in context for other middleware
    c.set('correlationId', id);

    // Add to response header for debugging
    c.header('X-Correlation-ID', id);

    await next();
};
