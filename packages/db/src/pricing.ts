export interface ModelPrice {
    input_per_1m: number;
    output_per_1m: number;
}

export const PRICING: Record<string, ModelPrice> = {
    // OpenAI Models
    'gpt-4o': {
        input_per_1m: 2.5,
        output_per_1m: 10.0
    },
    'gpt-4o-mini': {
        input_per_1m: 0.15,
        output_per_1m: 0.6
    },
    'gpt-4-turbo': {
        input_per_1m: 10.0,
        output_per_1m: 30.0
    },
    'gpt-4': {
        input_per_1m: 30.0,
        output_per_1m: 60.0
    },
    'gpt-3.5-turbo': {
        input_per_1m: 0.5,
        output_per_1m: 1.5
    },
    'o1-preview': {
        input_per_1m: 15.0,
        output_per_1m: 60.0
    },
    'o1-mini': {
        input_per_1m: 3.0,
        output_per_1m: 12.0
    },

    // Anthropic Models
    'claude-3-opus-20240229': {
        input_per_1m: 15.0,
        output_per_1m: 75.0
    },
    'claude-3-sonnet-20240229': {
        input_per_1m: 3.0,
        output_per_1m: 15.0
    },
    'claude-3-haiku-20240307': {
        input_per_1m: 0.25,
        output_per_1m: 1.25
    },
    'claude-3-5-sonnet-20241022': {
        input_per_1m: 3.0,
        output_per_1m: 15.0
    },
    'claude-3-5-haiku-20241022': {
        input_per_1m: 0.8,
        output_per_1m: 4.0
    },

    // Google Models
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
    'gemini-pro': {
        input_per_1m: 0.5,
        output_per_1m: 1.5
    },
    'gemini-pro-vision': {
        input_per_1m: 0.5,
        output_per_1m: 1.5
    },

    // DeepSeek Models
    'deepseek-chat': {
        input_per_1m: 0.14,
        output_per_1m: 0.28
    },
    'deepseek-coder': {
        input_per_1m: 0.14,
        output_per_1m: 0.28
    }
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const price = PRICING[model] || PRICING['gemini-1.5-flash'];
    const inputCost = (inputTokens / 1_000_000) * price.input_per_1m;
    const outputCost = (outputTokens / 1_000_000) * price.output_per_1m;
    return inputCost + outputCost;
}
