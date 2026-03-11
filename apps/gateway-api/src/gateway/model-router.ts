export type ProviderType = 'openai' | 'anthropic' | 'google' | 'groq' | 'together' | 'deepseek';

export interface ModelRoute {
    provider: ProviderType;
    baseUrl: string;
}

const PROVIDER_BASE_URLS: Record<ProviderType, string> = {
    openai: 'https://api.openai.com/v1/',
    anthropic: 'https://api.anthropic.com/v1/',
    google: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    groq: 'https://api.groq.com/openai/v1/',
    together: 'https://api.together.xyz/v1/',
    deepseek: 'https://api.deepseek.com/v1/'
};

/**
 * Resolves the provider and base URL based on the model name prefix.
 */
export function resolveProvider(modelName: string): ModelRoute | null {
    const model = modelName.toLowerCase();

    if (model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('dall-e') || model.startsWith('text-embedding-')) {
        return { provider: 'openai', baseUrl: PROVIDER_BASE_URLS.openai };
    }

    if (model.startsWith('claude-')) {
        return { provider: 'anthropic', baseUrl: PROVIDER_BASE_URLS.anthropic };
    }

    if (model.startsWith('gemini-')) {
        return { provider: 'google', baseUrl: PROVIDER_BASE_URLS.google };
    }

    if (model.startsWith('deepseek-')) {
        return { provider: 'deepseek', baseUrl: PROVIDER_BASE_URLS.deepseek };
    }

    // Llama can be served by multiple providers, but we'll try to guess or use default
    if (model.startsWith('llama-')) {
        // Groq is a popular high-speed provider for Llama
        return { provider: 'groq', baseUrl: PROVIDER_BASE_URLS.groq };
    }

    return null;
}

export function getProviderBaseUrl(provider: string): string {
    return PROVIDER_BASE_URLS[provider as ProviderType] || PROVIDER_BASE_URLS.openai;
}
