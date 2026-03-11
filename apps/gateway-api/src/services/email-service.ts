export interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

/**
 * Service to send emails via Resend API.
 * Requires RESEND_API_KEY in environment variables.
 */
export async function sendEmail(options: EmailOptions, apiKey: string) {
    if (!apiKey) {
        console.error('[EmailService] RESEND_API_KEY not configured');
        return;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Micro Gateway <alerts@micro-gateway.dev>', // Should use a verified domain in prod
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[EmailService] Failed to send email:', error);
        } else {
            console.log(`[EmailService] Alert sent to ${options.to}`);
        }
    } catch (err) {
        console.error('[EmailService] Error:', err);
    }
}

export function generateAlertHtml(projectName: string, alertType: string, detail: string, dashboardUrl: string) {
    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #ef4444;">🚨 Security/Cost Alert</h2>
            <p><strong>Project:</strong> ${projectName}</p>
            <p><strong>Event:</strong> ${alertType}</p>
            <p style="background: #f8fafc; padding: 15px; border-radius: 4px; border-left: 4px solid #ef4444;">
                ${detail}
            </p>
            <div style="margin-top: 20px;">
                <a href="${dashboardUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    View Dashboard
                </a>
            </div>
            <hr style="margin-top: 30px; border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #64748b;">
                This is an automated alert from your Micro-Security Gateway instance.
            </p>
        </div>
    `;
}
