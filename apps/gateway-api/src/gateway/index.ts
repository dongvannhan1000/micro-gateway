import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { gatewayKeyAuth } from '../middleware/api-key-auth';
import { rateLimiter } from '../middleware/rate-limiter';
import { bulkhead } from '../middleware/bulkhead';
import { contentFilter } from '../middleware/content-filter';
import { anomalyHandler } from '../middleware/anomaly-handler';
import { piiScrubber } from '../middleware/pii-scrub';
import { proxyHandler } from './proxy';

const gateway = new Hono<{ Bindings: Env; Variables: Variables }>();

// All /v1 requests require Gateway Key and are rate limited
gateway.use('*', gatewayKeyAuth);
gateway.use('*', rateLimiter);
gateway.use('*', bulkhead); // Limit concurrent requests per project
gateway.use('*', piiScrubber); // PII scrubbing before anomaly detection and content filtering
gateway.use('*', anomalyHandler);
gateway.use('*', contentFilter);

gateway.post('/chat/completions', proxyHandler);
gateway.post('/completions', proxyHandler); // Legacy support
gateway.post('/embeddings', proxyHandler);

gateway.get('/models', async (c) => {
    const project = c.get('project');
    const repos = c.get('repos')!;
    if (!project) return c.json({ object: 'list', data: [] });

    try {
        const providerList = await repos.providerConfig.findProvidersByProject(project.id);
        const providers = new Set(providerList);
        const allModels = [];

        if (providers.has('google')) {
            allModels.push(
                { id: 'gemini-1.5-flash', object: 'model', created: 1715385600, owned_by: 'google' },
                { id: 'gemini-1.5-pro', object: 'model', created: 1715385600, owned_by: 'google' },
                { id: 'gemini-2.0-flash', object: 'model', created: 1715385600, owned_by: 'google' }
            );
        }

        if (providers.has('openai')) {
            allModels.push(
                { id: 'gpt-4o', object: 'model', created: 1715385600, owned_by: 'openai' },
                { id: 'gpt-4o-mini', object: 'model', created: 1715385600, owned_by: 'openai' },
                { id: 'o1-preview', object: 'model', created: 1715385600, owned_by: 'openai' }
            );
        }

        if (providers.has('anthropic')) {
            allModels.push(
                { id: 'claude-3-5-sonnet-latest', object: 'model', created: 1715385600, owned_by: 'anthropic' },
                { id: 'claude-3-opus-latest', object: 'model', created: 1715385600, owned_by: 'anthropic' }
            );
        }

        if (providers.has('deepseek')) {
            allModels.push(
                { id: 'deepseek-chat', object: 'model', created: 1715385600, owned_by: 'deepseek' },
                { id: 'deepseek-coder', object: 'model', created: 1715385600, owned_by: 'deepseek' }
            );
        }

        return c.json({
            object: 'list',
            data: allModels
        });
    } catch (err) {
        return c.json({ object: 'list', data: [] });
    }
});

export { gateway as gatewayRouter };
