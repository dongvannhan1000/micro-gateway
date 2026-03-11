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
    const requestId = crypto.randomUUID();

    try {
        await c.env.DB.prepare(`
            INSERT INTO request_logs (
                id, project_id, gateway_key_id, model, 
                prompt_tokens, completion_tokens, total_tokens, 
                cost_usd, latency_ms, status_code, 
                prompt_injection_score, request_id, created_at
            ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 403, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
            requestId, 
            project.id, 
            gatewayKey.id, 
            model || 'unknown',
            score,
            'blocked_by_gateway'
        ).run();
    } catch (err) {
        console.error('[Gateway] [Security] Failed to log security violation:', err);
    }
}
