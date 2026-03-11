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
    const repos = c.get('repos')!;

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

    // 2. Resolve Provider & Key using Smart Routing
    const { resolveProvider, getProviderBaseUrl } = await import('./model-router');
    const resolved = resolveProvider(targetModel);

    let targetBaseUrl = '';
    let providerKey = '';
    let providerName = '';

    try {
        const configs = await repos.providerConfig.findAllByProject(project.id);

        if (!configs || configs.length === 0) {
            return openAiError(c, 'No AI providers configured for this project', 'invalid_request_error', 'no_provider_config');
        }

        let selectedConfig: any = null;
        if (resolved) {
            selectedConfig = configs.find((cfg: any) => cfg.provider === resolved.provider);
            if (selectedConfig) {
                targetBaseUrl = resolved.baseUrl;
                console.log(`[Gateway] [Router] Smart match found: ${resolved.provider}`);
            }
        }

        if (!selectedConfig) {
            selectedConfig = configs.find((cfg: any) => cfg.is_default === 1) || configs[0];
            targetBaseUrl = getProviderBaseUrl(selectedConfig.provider);
            console.log(`[Gateway] [Router] Using fallback: ${selectedConfig.provider}`);
        }

        providerName = selectedConfig.provider;
        providerKey = await decryptProviderKey(selectedConfig.api_key_encrypted, c.env.ENCRYPTION_SECRET);
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
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        await writer.write(value);
                    }
                    await writer.close();

                    // Log request (Simplified for streaming in Sprint 1)
                    await logRequest(repos, project.id, gatewayKey.id, requestedModel, targetModel, 200, latency, 0, 0);

                    // Check alerts
                    const { checkAlerts } = await import('../services/alert-engine');
                    await checkAlerts(c, project.id, 0);
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

        const injectionScore = c.get('promptInjectionScore') || 0;

        // Log request and check alerts asynchronously
        c.executionCtx.waitUntil((async () => {
            await logRequest(
                repos,
                project.id,
                gatewayKey.id,
                requestedModel,
                targetModel,
                response.status,
                latency,
                usage.prompt_tokens,
                usage.completion_tokens,
                cost,
                resData.id,
                injectionScore
            );

            // Update gateway key usage
            await repos.gatewayKey.addUsage(gatewayKey.id, cost);

            const { checkAlerts } = await import('../services/alert-engine');
            await checkAlerts(c, project.id, cost);
        })());

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
    repos: NonNullable<Variables['repos']>,
    projectId: string,
    gatewayKeyId: string,
    requestedModel: string,
    targetModel: string,
    statusCode: number,
    latency: number,
    promptTokens: number,
    completionTokens: number,
    cost: number = 0,
    providerRequestId: string = '',
    injectionScore: number = 0
) {
    const requestId = crypto.randomUUID();

    try {
        await repos.requestLog.create({
            id: requestId,
            projectId,
            gatewayKeyId,
            model: targetModel,
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            costUsd: cost,
            latencyMs: latency,
            statusCode,
            promptInjectionScore: injectionScore,
            requestId: providerRequestId,
        });
    } catch (err) {
        console.error('[Gateway] [Logger] Failed to log request:', err);
    }
}
