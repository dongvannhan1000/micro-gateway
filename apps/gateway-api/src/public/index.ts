import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { injectDatabase } from '../middleware/inject-db';

const publicAPI = new Hono<{ Bindings: Env; Variables: Variables }>();

// Inject database repositories (no authentication required)
publicAPI.use('*', injectDatabase);

// --- CORS Preflight Handler ---

/**
 * OPTIONS /api/waitlist
 * Handle CORS preflight requests for waitlist endpoint
 */
publicAPI.options('/waitlist', (c) => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': c.req.header('Origin') || '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        }
    });
});

// --- Waitlist (Managed Version) ---

/**
 * POST /api/waitlist
 * Add user to waitlist for managed version
 * No auth required (publicAPI endpoint)
 */
publicAPI.post('/waitlist', async (c) => {
    const repos = c.get('repos')!;

    try {
        const { name, email, useCase } = await c.req.json();

        // Validate
        if (!name || !email) {
            return c.json({ error: 'Name and email are required' }, 400);
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return c.json({ error: 'Invalid email format' }, 400);
        }

        // Check if already on waitlist
        const existing = await repos.waitlist.findByEmail(email);
        if (existing) {
            return c.json({
                success: true,
                message: "You're already on the waitlist! We'll notify you when we launch.",
                alreadyOnList: true
            });
        }

        // Add to waitlist
        const id = crypto.randomUUID();
        await repos.waitlist.create({
            id,
            name,
            email,
            useCase
        });

        console.log('[Public] [Waitlist] New signup:', { id, name, email });

        return c.json({
            success: true,
            message: 'Thanks for joining the waitlist! We\'ll notify you when we launch the managed version.',
            alreadyOnList: false
        });

    } catch (error: any) {
        // Handle unique constraint violation
        if (error.code === 'D1_ERROR' && error.message.includes('UNIQUE')) {
            return c.json({
                success: true,
                message: "You're already on the waitlist! We'll notify you when we launch.",
                alreadyOnList: true
            });
        }

        console.error('[Public] [Waitlist] Error:', error);
        return c.json({ error: 'Failed to join waitlist' }, 500);
    }
});

// --- Health Check ---

/**
 * GET /api/health
 * Health check endpoint that returns the service status and version.
 * This endpoint is publicly accessible (no authentication required) and can be used
 * by monitoring systems, load balancers, or the dashboard UI to verify gateway availability.
 * Returns a simple JSON response with status and version information.
 */
publicAPI.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        version: '1.0.0'
    });
});

export { publicAPI as publicAPIRouter };
