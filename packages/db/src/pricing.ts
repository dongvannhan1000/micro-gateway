export interface ModelPrice {
    input_per_1m: number;
    output_per_1m: number;
}

export const PRICING: Record<string, ModelPrice> = {
    // Gemini Models (Google AI Studio)
    'gemini-1.5-flash': {
        input_per_1m: 0.075,
        output_per_1m: 0.3
    },
    'gemini-1.5-pro': {
        input_per_1m: 3.5,
        output_per_1m: 10.5
    },
    'gemini-2.0-flash': {
        input_per_1m: 0.1,
        output_per_1m: 0.4
    },

    // OpenAI Models (for aliasing comparison)
    'gpt-4o': {
        input_per_1m: 2.5,
        output_per_1m: 10.0
    },
    'gpt-4o-mini': {
        input_per_1m: 0.15,
        output_per_1m: 0.6
    }
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const price = PRICING[model] || PRICING['gemini-1.5-flash'];
    const inputCost = (inputTokens / 1_000_000) * price.input_per_1m;
    const outputCost = (outputTokens / 1_000_000) * price.output_per_1m;
    return inputCost + outputCost;
}
