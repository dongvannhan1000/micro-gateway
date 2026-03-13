import { Context, Next } from 'hono';
import { Env, Variables } from '../types';
import { detectAnomaly } from '../services/anomaly-detector';
import { openAiError } from '../utils/errors';

/**
 * SECURITY: Middleware to detect and BLOCK request anomalies.
 * Detects sudden spikes and suspicious activity patterns.
 *
 * SECURITY FIX: Now blocks anomalies instead of just logging them.
 * Prevents prompt injection attacks and abuse attempts.
 */
export async function anomalyHandler(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const project = c.get('project');
    if (!project) return next();

    try {
        const { isAnomaly, reason } = await detectAnomaly(c);

        // SECURITY FIX: Block requests when anomaly detected
        if (isAnomaly) {
            console.warn(`[Gateway] [Anomaly] BLOCKED for project ${project.id}: ${reason}`);

            // Log security violation to database for dashboard review
            try {
                const repos = c.get('repos');
                if (repos) {
                    await repos.securityViolation.create({
                        project_id: project.id,
                        violation_type: 'anomaly',
                        severity: 'high',
                        description: reason || 'Anomalous activity pattern detected',
                        metadata: JSON.stringify({
                            ip: c.req.header('CF-Connecting-IP'),
                            userAgent: c.req.header('User-Agent'),
                            path: c.req.path,
                            method: c.req.method
                        })
                    });
                }
            } catch (logErr) {
                // Don't fail the block if logging fails
                console.error('[Gateway] [Anomaly] Failed to log security violation:', logErr);
            }

            // SECURITY FIX: Return 403 Forbidden instead of allowing through
            return openAiError(
                c,
                'Suspicious activity detected. Your request has been blocked for security reasons.',
                'security_violation',
                'anomaly_detected',
                403
            );
        }

        await next();
    } catch (err) {
        console.error('[Gateway] [Anomaly] Handler Error:', err);
        // Fail closed for security: block on error
        return openAiError(
            c,
            'Security verification failed. Please try again later.',
            'security_error',
            'anomaly_check_failed',
            500
        );
    }
}
