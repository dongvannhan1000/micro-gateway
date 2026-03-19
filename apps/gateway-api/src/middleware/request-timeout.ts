import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';

interface RequestTimeoutOptions {
    timeout?: number; // milliseconds, default 30000 (30s)
}

/**
 * Request timeout middleware
 * Sets a deadline in context for request timeout enforcement
 * Downstream handlers should check the deadline and abort if exceeded
 */
export const requestTimeout = (options: RequestTimeoutOptions = {}): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> => {
    const timeout = options.timeout || 30000; // Default 30 seconds

    return async (c, next) => {
        // Calculate deadline as Date object
        const deadline = new Date(Date.now() + timeout);

        // Store in context for downstream handlers
        c.set('timeoutDeadline', deadline);

        await next();
    };
};
