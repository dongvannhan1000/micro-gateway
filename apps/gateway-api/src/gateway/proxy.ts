import { Context } from 'hono';
import { Env, Variables } from '../types';
import { openAiError } from './errors';
import { calculateCost } from '@ms-gateway/db';
import { decryptProviderKey } from '../utils/crypto';
import { PricingService } from '../services/pricing-service';

const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

export async function proxyHandler(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const project = c.get('project');
    const gatewayKey = c.get('gatewayKey');

    if (!project || !gatewayKey) {
        return openAiError(c, 'Missing project or Gateway key context', 'server_error', null, 500);
    }

    const body = await c.req.json();
    const requestedModel = body.model;

    if (!requestedModel) {
        return openAiError(c, 'Missing model parameter', 'invalid_request_error', 'missing_model');
    }

    // 1. Model Aliasing Logic
    let targetModel = requestedModel;
    if (project.model_aliases) {
        try {
            const aliases = JSON.parse(project.model_aliases);
            targetModel = aliases[requestedModel] || requestedModel;
            console.log(`[Gateway] [Proxy] Aliasing: ${requestedModel} -> ${targetModel}`);
        } catch (e) {
            console.error('[Gateway] [Proxy] Error parsing aliases:', e);
        }
    }

    // 2. Resolve Provider & Key
    // Default to Gemini for Sprint 1 if no OpenAI key is configured
    let targetBaseUrl = GEMINI_OPENAI_BASE_URL;
    let providerKey = '';
    let providerName = 'default';
    try {
        const { results } = await c.env.DB.prepare(`
      SELECT * FROM provider_configs 
      WHERE project_id = ? 
      ORDER BY is_default DESC, created_at ASC 
      LIMIT 1
    `).bind(project.id).all();

        if (results && results.length > 0) {
            const config = results[0] as any;
            providerName = config.provider;
            providerKey = await decryptProviderKey(config.api_key_encrypted, c.env.ENCRYPTION_SECRET);

            if (config.provider === 'openai') {
                targetBaseUrl = 'https://api.openai.com/v1/';
            }
        } else {
            return openAiError(c, 'No AI provider configured for this project', 'invalid_request_error', 'no_provider_config');
        }
    } catch (err) {
        console.error('[Gateway] [Proxy] Provider lookup error:', err);
        return openAiError(c, 'Internal Server Error', 'server_error', null, 500);
    }

    // 3. Prepare Forward Request
    // Remove leading /v1/ and ensure no leading slash for relative URL construction
    let relativePath = c.req.path.replace(/^\/v1/, '');
    if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);

    // Ensure targetBaseUrl ends with /
    const baseUrl = targetBaseUrl.endsWith('/') ? targetBaseUrl : `${targetBaseUrl}/`;

    const forwardUrl = `${baseUrl}${relativePath}`;
    console.log(`[Gateway] [Proxy] Target: ${providerName} | URL: ${forwardUrl}`);

    // Only send clean headers to provider - do NOT forward original headers
    // Forwarding original headers (host, content-length, etc.) causes routing errors
    const forwardBody = JSON.stringify({ ...body, model: targetModel });
    const forwardRequest = new Request(forwardUrl, {
        method: c.req.method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${providerKey}`,
        },
        body: forwardBody,
    });

    const startTime = Date.now();

    try {
        const response = await fetch(forwardRequest);
        const latency = Date.now() - startTime;

        // 4. Handle Streaming
        if (body.stream) {
            // Passthrough SSE stream
            const { readable, writable } = new TransformStream();
            const writer = writable.getWriter();
            const reader = response.body?.getReader();

            if (reader) {
                c.executionCtx.waitUntil((async () => {
                    let totalCompletionTokens = 0; // Estimation for stream if usage is not provided
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        await writer.write(value);
                        // In a real implementation, we would parse chunks to find the final usage info
                    }
                    await writer.close();

                    // Log request (Simplified for streaming in Sprint 1)
                    await logRequest(c, requestedModel, targetModel, 200, latency, 0, 0);
                })());
            }

            return new Response(readable, {
                status: response.status,
                headers: {
                    ...Object.fromEntries(response.headers),
                    'X-MS-Latency-MS': latency.toString(),
                }
            });
        }

        // 5. Handle Non-Streaming
        const contentType = response.headers.get('content-type');
        let resData: any;

        if (contentType && contentType.includes('application/json')) {
            resData = await response.json();
        } else {
            const text = await response.text();
            console.error(`[Gateway] [Proxy] Unexpected non-JSON response (${response.status}):`, text);
            return openAiError(
                c,
                `AI provider returned an unexpected response format: ${response.status}`,
                'server_error'
            );
        }

        const usage = resData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        const cost = await PricingService.calculate(c, targetModel, providerName, usage.prompt_tokens, usage.completion_tokens);

        // Log request asynchronously
        c.executionCtx.waitUntil(logRequest(
            c,
            requestedModel,
            targetModel,
            response.status,
            latency,
            usage.prompt_tokens,
            usage.completion_tokens,
            cost,
            resData.id
        ));

        return c.json(resData, response.status as any, {
            'X-MS-Latency-MS': latency.toString(),
            'X-MS-Cost-USD': cost.toFixed(6)
        });

    } catch (err) {
        console.error('[Gateway] [Proxy] Fetch error:', err);
        return openAiError(c, 'Failed to connect to AI provider', 'server_error', null, 502);
    }
}

async function logRequest(
    c: Context<{ Bindings: Env; Variables: Variables }>,
    requestedModel: string,
    targetModel: string,
    statusCode: number,
    latency: number,
    promptTokens: number,
    completionTokens: number,
    cost: number = 0,
    providerRequestId: string = ''
) {
    const project = c.get('project')!;
    const gatewayKey = c.get('gatewayKey')!;
    const requestId = crypto.randomUUID();

    try {
        await c.env.DB.prepare(`
      INSERT INTO request_logs (
        id, project_id, gateway_key_id, model, 
        prompt_tokens, completion_tokens, total_tokens, 
        cost_usd, latency_ms, status_code, request_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
            requestId, project.id, gatewayKey.id, targetModel,
            promptTokens, completionTokens, promptTokens + completionTokens,
            cost, latency, statusCode, providerRequestId
        ).run();

        // Update Gateway Key usage stats
        await c.env.DB.prepare(`
      UPDATE gateway_keys 
      SET current_month_usage_usd = current_month_usage_usd + ?
      WHERE id = ?
    `).bind(cost, gatewayKey.id).run();

    } catch (err) {
        console.error('[Gateway] [Logger] Failed to log request:', err);
    }
}
