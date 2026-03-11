import { Context } from 'hono';
import { Env, Variables } from '../types';

export interface AnomalyResult {
    isAnomaly: boolean;
    reason?: string;
}

/**
 * Anomaly Detector
 * Tracks request volume in minutely buckets using KV.
 * Detects sudden spikes (> 500% increase over 5-min average).
 */
export async function detectAnomaly(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<AnomalyResult> {
    const project = c.get('project');
    if (!project || !c.env.RATE_LIMIT_KV) return { isAnomaly: false };

    const now = new Date();
    const currentMin = now.getMinutes();
    const currentHour = now.getHours();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentBucket = `${currentYear}-${currentMonth}-${currentDay}-${currentHour}-${currentMin}`;
    const keyPrefix = `anomaly:${project.id}:`;
    
    // We want to compare the current minute with the average of the last 4 minutes
    const buckets: string[] = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(now.getTime() - i * 60000);
        buckets.push(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`);
    }

    const keys = buckets.map(b => `${keyPrefix}${b}`);
    
    try {
        // Increment current bucket and get all values
        // Note: kv.get is eventually consistent, but for anomaly detection it's "good enough"
        const currentCountStr = await c.env.RATE_LIMIT_KV.get(keys[0]);
        let currentCount = parseInt(currentCountStr || '0') + 1;
        
        // Asynchronously increment current bucket (don't wait for write completion for detector logic)
        c.executionCtx.waitUntil(c.env.RATE_LIMIT_KV.put(keys[0], currentCount.toString(), { expirationTtl: 600 }));

        // Get past counts
        const pastCountsPromises = keys.slice(1).map(k => c.env.RATE_LIMIT_KV.get(k));
        const pastCountsValues = await Promise.all(pastCountsPromises);
        const pastCounts = pastCountsValues.map(v => parseInt(v || '0'));

        const avgPast = pastCounts.reduce((a, b) => a + b, 0) / pastCounts.length;

        // Anomaly Criteria:
        // 1. Minimum volume (e.g. at least 20 req/min) to avoid small-scale noise
        // 2. Spike factor (e.g. 5x increase = 500%)
        const MIN_VOLUME = 20;
        const SPIKE_FACTOR = 5.0;

        if (currentCount > MIN_VOLUME && avgPast > 0 && (currentCount / avgPast) >= SPIKE_FACTOR) {
            return {
                isAnomaly: true,
                reason: `Sudden spike detected: ${currentCount} req/min vs 5-min avg of ${avgPast.toFixed(1)}`
            };
        }

        return { isAnomaly: false };
    } catch (err) {
        console.error('[Gateway] [Anomaly] Detection error:', err);
        return { isAnomaly: false };
    }
}
