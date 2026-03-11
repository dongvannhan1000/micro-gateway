import { INJECTION_PATTERNS, Severity } from './injection-patterns';

export interface ScoreResult {
    score: number;
    matches: { id: string; description: string; severity: Severity }[];
    isBlocked: boolean;
    blockReason: string | null;
}

/**
 * Prompt Injection Scorer (v2)
 * 
 * Blocking Logic:
 * - 1 critical match → auto-block
 * - 2+ high matches → block  
 * - high + medium → block
 * - medium alone → flag only (never block)
 * 
 * Score is 0.0–1.0 for analytics/logging, NOT used for blocking decisions.
 */
export function scorePrompt(text: string): ScoreResult {
    if (!text) return { score: 0, matches: [], isBlocked: false, blockReason: null };

    const matches: ScoreResult['matches'] = [];
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    for (const { id, pattern, severity, description } of INJECTION_PATTERNS) {
        if (pattern.test(text)) {
            matches.push({ id, description, severity });

            if (severity === 'critical') criticalCount++;
            else if (severity === 'high') highCount++;
            else if (severity === 'medium') mediumCount++;
        }
    }

    // Blocking logic
    let isBlocked = false;
    let blockReason: string | null = null;

    if (criticalCount >= 1) {
        isBlocked = true;
        blockReason = `Critical injection pattern detected: ${matches.filter(m => m.severity === 'critical').map(m => m.id).join(', ')}`;
    } else if (highCount >= 2) {
        isBlocked = true;
        blockReason = `Multiple high-severity injection patterns: ${matches.filter(m => m.severity === 'high').map(m => m.id).join(', ')}`;
    } else if (highCount >= 1 && mediumCount >= 1) {
        isBlocked = true;
        blockReason = `Combined injection signals: ${matches.map(m => m.id).join(', ')}`;
    }

    // Score for analytics (0.0–1.0) — purely informational
    const score = Math.min(
        (criticalCount * 0.8) + (highCount * 0.3) + (mediumCount * 0.1),
        1.0
    );

    return { score, matches, isBlocked, blockReason };
}
