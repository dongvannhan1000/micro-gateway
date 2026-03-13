/**
 * Model Router Tests
 * Tests for provider routing and model detection logic
 */

import { describe, it, expect } from 'vitest';
import { resolveProvider, getProviderBaseUrl } from './model-router';

describe('Model Router', () => {

  describe('resolveProvider', () => {

    describe('OpenAI Models', () => {
      it('should resolve GPT-4 models to OpenAI', () => {
        const result = resolveProvider('gpt-4');
        expect(result).toEqual({
          provider: 'openai',
          baseUrl: 'https://api.openai.com/v1/'
        });
      });

      it('should resolve GPT-4o models to OpenAI', () => {
        const result = resolveProvider('gpt-4o');
        expect(result?.provider).toBe('openai');
      });

      it('should resolve GPT-3.5 models to OpenAI', () => {
        const result = resolveProvider('gpt-3.5-turbo');
        expect(result?.provider).toBe('openai');
      });

      it('should resolve o1 models to OpenAI', () => {
        const result = resolveProvider('o1-preview');
        expect(result?.provider).toBe('openai');
      });

      it('should resolve DALL-E models to OpenAI', () => {
        const result = resolveProvider('dall-e-3');
        expect(result?.provider).toBe('openai');
      });

      it('should resolve text-embedding models to OpenAI', () => {
        const result = resolveProvider('text-embedding-ada-002');
        expect(result?.provider).toBe('openai');
      });

      it('should be case-insensitive', () => {
        const result = resolveProvider('GPT-4');
        expect(result?.provider).toBe('openai');
      });
    });

    describe('Anthropic Models', () => {
      it('should resolve Claude models to Anthropic', () => {
        const result = resolveProvider('claude-3-opus-20240229');
        expect(result).toEqual({
          provider: 'anthropic',
          baseUrl: 'https://api.anthropic.com/v1/'
        });
      });

      it('should resolve Claude 3 Sonnet to Anthropic', () => {
        const result = resolveProvider('claude-3-sonnet-20240229');
        expect(result?.provider).toBe('anthropic');
      });

      it('should resolve Claude 3 Haiku to Anthropic', () => {
        const result = resolveProvider('claude-3-haiku-20240307');
        expect(result?.provider).toBe('anthropic');
      });

      it('should resolve Claude 3.5 models to Anthropic', () => {
        const result = resolveProvider('claude-3-5-sonnet-20241022');
        expect(result?.provider).toBe('anthropic');
      });

      it('should be case-insensitive', () => {
        const result = resolveProvider('CLAUDE-3-OPUS');
        expect(result?.provider).toBe('anthropic');
      });
    });

    describe('Google Models', () => {
      it('should resolve Gemini models to Google', () => {
        const result = resolveProvider('gemini-1.5-pro');
        expect(result).toEqual({
          provider: 'google',
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/'
        });
      });

      it('should resolve Gemini Flash to Google', () => {
        const result = resolveProvider('gemini-1.5-flash');
        expect(result?.provider).toBe('google');
      });

      it('should resolve Gemini 2.0 to Google', () => {
        const result = resolveProvider('gemini-2.0-flash');
        expect(result?.provider).toBe('google');
      });

      it('should resolve Gemini Pro to Google', () => {
        const result = resolveProvider('gemini-pro');
        expect(result?.provider).toBe('google');
      });

      it('should be case-insensitive', () => {
        const result = resolveProvider('GEMINI-PRO');
        expect(result?.provider).toBe('google');
      });
    });

    describe('DeepSeek Models', () => {
      it('should resolve DeepSeek Chat to DeepSeek', () => {
        const result = resolveProvider('deepseek-chat');
        expect(result).toEqual({
          provider: 'deepseek',
          baseUrl: 'https://api.deepseek.com/v1/'
        });
      });

      it('should resolve DeepSeek Coder to DeepSeek', () => {
        const result = resolveProvider('deepseek-coder');
        expect(result?.provider).toBe('deepseek');
      });

      it('should be case-insensitive', () => {
        const result = resolveProvider('DEEPSEEK-CHAT');
        expect(result?.provider).toBe('deepseek');
      });
    });

    describe('Groq Models', () => {
      it('should resolve Llama models to Groq', () => {
        const result = resolveProvider('llama-3-70b');
        expect(result).toEqual({
          provider: 'groq',
          baseUrl: 'https://api.groq.com/openai/v1/'
        });
      });

      it('should resolve Mixtral models to Groq', () => {
        const result = resolveProvider('mixtral-8x7b');
        expect(result?.provider).toBe('groq');
      });

      it('should resolve Gemma models to Groq', () => {
        const result = resolveProvider('gemma-7b');
        expect(result?.provider).toBe('groq');
      });
    });

    describe('Together AI Models', () => {
      it('should resolve Together-prefixed models', () => {
        const result = resolveProvider('together-mixtral');
        expect(result?.provider).toBe('together');
      });

      it('should resolve models with -together suffix', () => {
        const result = resolveProvider('llama-2-together');
        expect(result?.provider).toBe('together');
      });
    });

    describe('Unknown Models', () => {
      it('should return null for unknown models', () => {
        const result = resolveProvider('unknown-model');
        expect(result).toBeNull();
      });

      it('should return null for empty string', () => {
        const result = resolveProvider('');
        expect(result).toBeNull();
      });
    });

    describe('Unknown Models', () => {
      it('should return null for unknown models', () => {
        const result = resolveProvider('unknown-model');
        expect(result).toBeNull();
      });

      it('should return null for empty string', () => {
        const result = resolveProvider('');
        expect(result).toBeNull();
      });
    });
  });

  describe('getProviderBaseUrl', () => {

    it('should return OpenAI base URL', () => {
      const url = getProviderBaseUrl('openai');
      expect(url).toBe('https://api.openai.com/v1/');
    });

    it('should return Anthropic base URL', () => {
      const url = getProviderBaseUrl('anthropic');
      expect(url).toBe('https://api.anthropic.com/v1/');
    });

    it('should return Google base URL', () => {
      const url = getProviderBaseUrl('google');
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/');
    });

    it('should return DeepSeek base URL', () => {
      const url = getProviderBaseUrl('deepseek');
      expect(url).toBe('https://api.deepseek.com/v1/');
    });

    it('should return Groq base URL', () => {
      const url = getProviderBaseUrl('groq');
      expect(url).toBe('https://api.groq.com/openai/v1/');
    });

    it('should return Together base URL', () => {
      const url = getProviderBaseUrl('together');
      expect(url).toBe('https://api.together.xyz/v1/');
    });

    it('should default to OpenAI for unknown providers', () => {
      const url = getProviderBaseUrl('unknown' as any);
      expect(url).toBe('https://api.openai.com/v1/');
    });
  });

  describe('Model Name Edge Cases', () => {
    it('should handle model names with version suffixes', () => {
      const result = resolveProvider('claude-3-opus-20240229');
      expect(result?.provider).toBe('anthropic');
    });

    it('should handle model names with underscores', () => {
      const result = resolveProvider('deepseek_coder');
      // Underscores are not supported, should return null
      expect(result).toBeNull();
    });

    it('should handle model names with dots', () => {
      const result = resolveProvider('gpt-4-turbo');
      expect(result?.provider).toBe('openai');
    });

    it('should handle lowercase model names', () => {
      const result = resolveProvider('gemini-pro');
      expect(result?.provider).toBe('google');
    });

    it('should handle uppercase model names', () => {
      const result = resolveProvider('GPT-4');
      expect(result?.provider).toBe('openai');
    });

    it('should handle mixed case model names', () => {
      const result = resolveProvider('ClAuDe-3-SoNnEt');
      expect(result?.provider).toBe('anthropic');
    });
  });
});
