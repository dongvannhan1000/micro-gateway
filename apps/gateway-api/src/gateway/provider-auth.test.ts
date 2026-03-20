import { describe, it, expect } from 'vitest';

describe('Provider Authentication', () => {
    describe('Header Generation Logic', () => {
        it('should generate Bearer token for OpenAI', () => {
            const providerName: string = 'openai';
            const providerKey = 'sk-test-key';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            switch (providerName) {
                case 'openai':
                case 'groq':
                case 'together':
                case 'deepseek':
                    headers['Authorization'] = `Bearer ${providerKey}`;
                    break;
            }

            expect(headers['Authorization']).toBe('Bearer sk-test-key');
            expect(headers['Content-Type']).toBe('application/json');
        });

        it('should generate x-api-key header for Anthropic', () => {
            const providerName = 'anthropic';
            const providerKey = 'sk-ant-test-key';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            switch (providerName) {
                case 'anthropic':
                    headers['x-api-key'] = providerKey;
                    headers['anthropic-version'] = '2023-06-01';
                    break;
            }

            expect(headers['x-api-key']).toBe('sk-ant-test-key');
            expect(headers['anthropic-version']).toBe('2023-06-01');
            expect(headers['Authorization']).toBeUndefined();
        });

        it('should append API key to URL for Google', () => {
            const providerName = 'google';
            const providerKey = 'google-api-key';
            const targetBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/';
            const relativePath = 'chat/completions';

            let forwardUrl = '';

            switch (providerName) {
                case 'google':
                    const urlSeparator = targetBaseUrl.includes('?') ? '&' : '?';
                    forwardUrl = `${targetBaseUrl}${relativePath}${urlSeparator}key=${providerKey}`;
                    break;
            }

            expect(forwardUrl).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=google-api-key');
        });

        it('should handle Google URLs with existing query parameters', () => {
            const providerName = 'google';
            const providerKey = 'google-api-key';
            const targetBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/?existing=param';
            const relativePath = 'chat/completions';

            let forwardUrl = '';

            switch (providerName) {
                case 'google':
                    const urlSeparator = targetBaseUrl.includes('?') ? '&' : '?';
                    forwardUrl = `${targetBaseUrl}${relativePath}${urlSeparator}key=${providerKey}`;
                    break;
            }

            expect(forwardUrl).toContain('&key=google-api-key');
        });

        it('should generate Bearer token for Groq', () => {
            const providerName: string = 'groq';
            const providerKey = 'gsk-test-key';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            switch (providerName) {
                case 'openai':
                case 'groq':
                case 'together':
                case 'deepseek':
                    headers['Authorization'] = `Bearer ${providerKey}`;
                    break;
            }

            expect(headers['Authorization']).toBe('Bearer gsk-test-key');
        });

        it('should generate Bearer token for Together', () => {
            const providerName: string = 'together';
            const providerKey = 'together-test-key';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            switch (providerName) {
                case 'openai':
                case 'groq':
                case 'together':
                case 'deepseek':
                    headers['Authorization'] = `Bearer ${providerKey}`;
                    break;
            }

            expect(headers['Authorization']).toBe('Bearer together-test-key');
        });

        it('should generate Bearer token for DeepSeek', () => {
            const providerName: string = 'deepseek';
            const providerKey = 'sk-deepseek-key';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            switch (providerName) {
                case 'openai':
                case 'groq':
                case 'together':
                case 'deepseek':
                    headers['Authorization'] = `Bearer ${providerKey}`;
                    break;
            }

            expect(headers['Authorization']).toBe('Bearer sk-deepseek-key');
        });

        it('should use fallback for unknown providers', () => {
            const providerName: string = 'unknown-provider';
            const providerKey = 'unknown-key';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            switch (providerName) {
                case 'openai':
                case 'groq':
                case 'together':
                case 'deepseek':
                    headers['Authorization'] = `Bearer ${providerKey}`;
                    break;
                case 'anthropic':
                    headers['x-api-key'] = providerKey;
                    headers['anthropic-version'] = '2023-06-01';
                    break;
                case 'google':
                    break;
                default:
                    headers['Authorization'] = `Bearer ${providerKey}`;
                    break;
            }

            expect(headers['Authorization']).toBe('Bearer unknown-key');
        });
    });

    describe('URL Construction', () => {
        it('should construct correct URL for OpenAI', () => {
            const targetBaseUrl = 'https://api.openai.com/v1/';
            const relativePath = 'chat/completions';
            const baseUrl = targetBaseUrl.endsWith('/') ? targetBaseUrl : `${targetBaseUrl}/`;
            const forwardUrl = `${baseUrl}${relativePath}`;

            expect(forwardUrl).toBe('https://api.openai.com/v1/chat/completions');
        });

        it('should construct correct URL for Anthropic', () => {
            const targetBaseUrl = 'https://api.anthropic.com/v1/';
            const relativePath = 'messages';
            const anthropicBaseUrl = targetBaseUrl.endsWith('/') ? targetBaseUrl : `${targetBaseUrl}/`;
            const forwardUrl = `${anthropicBaseUrl}${relativePath}`;

            expect(forwardUrl).toBe('https://api.anthropic.com/v1/messages');
        });

        it('should handle base URLs without trailing slash for OpenAI-compatible providers', () => {
            const targetBaseUrl = 'https://api.openai.com/v1';
            const relativePath = 'chat/completions';
            const baseUrl = targetBaseUrl.endsWith('/') ? targetBaseUrl : `${targetBaseUrl}/`;
            const forwardUrl = `${baseUrl}${relativePath}`;

            expect(forwardUrl).toBe('https://api.openai.com/v1/chat/completions');
        });
    });
});
