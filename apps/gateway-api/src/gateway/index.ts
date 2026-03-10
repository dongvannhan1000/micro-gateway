import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { apiKeyAuth } from '../middleware/api-key-auth';
import { rateLimiter } from '../middleware/rate-limiter';
import { proxyHandler } from './proxy';

const gateway = new Hono<{ Bindings: Env; Variables: Variables }>();

// All /v1 requests require API Key and are rate limited
gateway.use('*', apiKeyAuth);
gateway.use('*', rateLimiter);

gateway.post('/chat/completions', proxyHandler);
gateway.post('/completions', proxyHandler); // Legacy support
gateway.post('/embeddings', proxyHandler);

gateway.get('/models', (c) => {
    return c.json({
        object: 'list',
        data: [
            { id: 'gemini-1.5-flash', object: 'model', created: 1715385600, owned_by: 'google' },
            { id: 'gemini-1.5-pro', object: 'model', created: 1715385600, owned_by: 'google' },
            { id: 'gemini-2.0-flash', object: 'model', created: 1715385600, owned_by: 'google' },
            { id: 'gpt-4o', object: 'model', created: 1715385600, owned_by: 'openai' },
            { id: 'gpt-4o-mini', object: 'model', created: 1715385600, owned_by: 'openai' },
        ]
    });
});

export { gateway as gatewayRouter };
