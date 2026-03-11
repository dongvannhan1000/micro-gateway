import { Context, Next } from 'hono';
import { Env, Variables } from '../types';
import { detectAnomaly } from '../services/anomaly-detector';

/**
 * Middleware to detect request spikes and other anomalies.
 * Flags the request for alerting but does not block by default.
 */
export async function anomalyHandler(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
    const project = c.get('project');
    if (!project) return next();

    try {
        const { isAnomaly, reason } = await detectAnomaly(c);

        if (isAnomaly) {
            console.warn(`[Gateway] [Anomaly] Detected for project ${project.id}: ${reason}`);
            c.set('anomalyDetected', true);
            
            // In a future WS, we will trigger an actual alert rule check here
            // For now, it's flagged for the downstream to see
        }

        await next();
    } catch (err) {
        console.error('[Gateway] [Anomaly] Handler Error:', err);
        await next();
    }
}
