import { Context, Next } from 'hono';
import { Env, Variables } from '../types';
import { scorePrompt } from '../security/injection-scorer';
import { openAiError } from '../gateway/errors';

/**
 * Middleware to detect and block prompt injection attempts.
 * Operates on the request body for /chat/completions and /completions.
 */
export async function contentFilter(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const gatewayKey = c.get('gatewayKey');
    const project = c.get('project');

    if (!gatewayKey || !project) return next();

    // Only filter POST requests with body
    if (c.req.method !== 'POST') return next();

    try {
        // Clone request as we need to read the body but also let it pass to proxy
        const body = await c.req.json().catch(() => null);
        if (!body) return next();

        // Extract prompt text from various formats
        let promptText = '';
        if (body.messages && Array.isArray(body.messages)) {
            // Concatenate all user/system messages to check the full context
            promptText = body.messages
                .map((m: any) => `${m.role}: ${m.content}`)
                .join('\n');
        } else if (body.prompt) {
            promptText = typeof body.prompt === 'string' ? body.prompt : JSON.stringify(body.prompt);
        }

        if (!promptText) return next();

        const { score, matches, isBlocked, blockReason } = scorePrompt(promptText);

        if (isBlocked) {
            const matchIds = matches.map(m => m.id).join(', ');
            console.warn(`[Gateway] [Security] Injection blocked for project ${project.id}. Reason: ${blockReason}. Patterns: ${matchIds}`);

            // Log security violation (async)
            c.executionCtx.waitUntil(logSecurityViolation(c, body.model, score));

            return openAiError(
                c,
                'Potential prompt injection detected. Your request has been blocked for security reasons.',
                'content_policy_violation',
                'prompt_injection_detected',
                403
            );
        }

        // Attach score to context for downstream logging in proxy.ts
        c.set('promptInjectionScore', score);

        await next();
    } catch (err) {
        console.error('[Gateway] [Security] Content Filter Error:', err);
        // Fail open to ensure availability, but log error
        await next();
    }
}

async function logSecurityViolation(
    c: Context<{ Bindings: Env; Variables: Variables }>,
    model: string,
    score: number
) {
    const project = c.get('project')!;
    const gatewayKey = c.get('gatewayKey')!;
    const repos = c.get('repos')!;
    const requestId = crypto.randomUUID();

    try {
        await repos.requestLog.create({
            id: requestId,
            projectId: project.id,
            gatewayKeyId: gatewayKey.id,
            model: model || 'unknown',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            costUsd: 0,
            latencyMs: 0,
            statusCode: 403,
            promptInjectionScore: score,
            requestId: 'blocked_by_gateway',
        });
    } catch (err) {
        console.error('[Gateway] [Security] Failed to log security violation:', err);
    }
}
