import { INJECTION_PATTERNS } from './injection-patterns';

export interface ScoreResult {
    score: number;
    matches: string[];
    isBlocked: boolean;
}

/**
 * Heuristic scoring engine for prompt injections.
 * Calculates a score between 0.0 and 1.0 based on matched patterns.
 */
export function scorePrompt(text: string, threshold: number = 0.7): ScoreResult {
    if (!text) return { score: 0, matches: [], isBlocked: false };

    let totalWeight = 0;
    const matches: string[] = [];

    for (const { pattern, weight, description } of INJECTION_PATTERNS) {
        if (pattern.test(text)) {
            // Heuristic: Take the highest weight found, plus a fraction of others
            // This prevents many low-weight matches from easily triggering high score
            // while allowing high-weight matches to dominate.
            totalWeight = Math.max(totalWeight, weight);
            
            // Incrementally add a small portion of other weights to account for combined risk
            if (totalWeight < 1.0 && weight > 0) {
                totalWeight += (weight * 0.1);
            }

            matches.push(description);
        }
    }

    // Clamp score to 1.0
    const finalScore = Math.min(totalWeight, 1.0);

    return {
        score: finalScore,
        matches: Array.from(new Set(matches)), // Unique matches only
        isBlocked: finalScore >= threshold
    };
}
