import { Context } from 'hono';
import { Env, Variables } from '../types';
import { sendEmail, generateAlertHtml } from './email-service';

/**
 * Alert Engine
 * Checks configured alert rules against current request context.
 * Implements cooldown logic to prevent notification spam.
 */
export async function checkAlerts(
    c: Context<{ Bindings: Env; Variables: Variables }>,
    projectId: string,
    currentCost: number
) {
    try {
        // 1. Fetch active alert rules for this project
        const { results: rules } = await c.env.DB.prepare(`
            SELECT * FROM alert_rules 
            WHERE project_id = ? AND is_enabled = 1
        `).bind(projectId).all();

        if (!rules || rules.length === 0) return;

        // 2. Fetch project details (for name and total usage)
        const project = await c.env.DB.prepare(`
            SELECT name FROM projects WHERE id = ?
        `).bind(projectId).first() as any;

        const totalUsage = c.get('gatewayKey')?.current_month_usage_usd || 0;

        for (const rule of rules as any[]) {
            let shouldTrigger = false;
            let message = '';

            // Handle Cost Threshold Alerts
            if (rule.type === 'cost_threshold' && totalUsage >= rule.threshold) {
                shouldTrigger = true;
                message = `Project "${project.name}" has reached its spending threshold of $${rule.threshold}. Current usage: $${totalUsage.toFixed(4)}.`;
            }

            // Handle Prompt Injection Alerts
            const injectionScore = c.get('promptInjectionScore') || 0;
            if (rule.type === 'injection_detected' && injectionScore >= 0.7) {
                shouldTrigger = true;
                message = `High-risk prompt injection attempt detected on project "${project.name}". Score: ${injectionScore}. Request blocked.`;
            }

            if (shouldTrigger) {
                await processTrigger(c, rule, project.name, message);
            }
        }
    } catch (err) {
        console.error('[AlertEngine] Error checking alerts:', err);
    }
}

async function processTrigger(
    c: Context<{ Bindings: Env; Variables: Variables }>,
    rule: any,
    projectName: string,
    message: string
) {
    // Cooldown check (prevent same alert from firing multiple times in 1 hour)
    const cooldownKey = `alert_cooldown:${rule.id}`;
    const isCooldown = await c.env.RATE_LIMIT_KV.get(cooldownKey);
    if (isCooldown) return;

    console.log(`[AlertEngine] Triggering alert ${rule.id} for project ${projectName}`);

    // Log to history
    const historyId = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO alert_history (id, project_id, rule_id, message, triggered_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(historyId, rule.project_id, rule.id, message).run();

    // Set cooldown (1 hour)
    await c.env.RATE_LIMIT_KV.put(cooldownKey, '1', { expirationTtl: 3600 });

    // Execute actions
    if (rule.action === 'email' && rule.target) {
        const html = generateAlertHtml(
            projectName,
            rule.type.replace('_', ' ').toUpperCase(),
            message,
            'https://micro-gateway.dev/dashboard' // Configurable in prod
        );

        c.executionCtx.waitUntil(sendEmail({
            to: rule.target,
            subject: `[ALERT] ${projectName}: ${rule.type}`,
            text: message,
            html
        }, c.env.RESEND_API_KEY));
    }

    // Webhook support could be added here
}
