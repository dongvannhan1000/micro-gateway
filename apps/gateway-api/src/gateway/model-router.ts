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
 * Supports comprehensive model detection across multiple providers.
 */
export function resolveProvider(modelName: string): ModelRoute | null {
    const model = modelName.toLowerCase();

    // OpenAI Models
    // GPT series: gpt-4, gpt-3.5, gpt-4o, etc.
    if (model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('dall-e') || model.startsWith('text-embedding-') || model.startsWith('tts-') || model.startsWith('whisper-')) {
        return { provider: 'openai', baseUrl: PROVIDER_BASE_URLS.openai };
    }

    // Anthropic Models
    // Claude series: claude-3-opus, claude-3-sonnet, claude-3-haiku, etc.
    if (model.startsWith('claude-')) {
        return { provider: 'anthropic', baseUrl: PROVIDER_BASE_URLS.anthropic };
    }

    // Google Models
    // Gemini series: gemini-pro, gemini-1.5, gemini-2.0, etc.
    if (model.startsWith('gemini-')) {
        return { provider: 'google', baseUrl: PROVIDER_BASE_URLS.google };
    }

    // DeepSeek Models
    // DeepSeek series: deepseek-chat, deepseek-coder, etc.
    if (model.startsWith('deepseek-')) {
        return { provider: 'deepseek', baseUrl: PROVIDER_BASE_URLS.deepseek };
    }

    // Together AI Models (check before Groq since together models may have 'llama' in name)
    // Various open-source models hosted by Together
    if (model.startsWith('together-') || model.endsWith('-together')) {
        return { provider: 'together', baseUrl: PROVIDER_BASE_URLS.together };
    }

    // Groq Models (Llama, Mixtral, etc.)
    if (model.startsWith('llama-') || model.startsWith('llama3-') || model.startsWith('mixtral-') || model.startsWith('gemma-')) {
        return { provider: 'groq', baseUrl: PROVIDER_BASE_URLS.groq };
    }

    return null;
}

export function getProviderBaseUrl(provider: string): string {
    return PROVIDER_BASE_URLS[provider as ProviderType] || PROVIDER_BASE_URLS.openai;
}
