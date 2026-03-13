/**
 * Provider Transformation Tests
 * Tests for request/response transformation logic across all providers
 */

import { describe, it, expect } from 'vitest';
import { openaiTransform } from './openai';
import { anthropicTransform } from './anthropic';
import { googleTransform } from './google';
import { deepseekTransform } from './deepseek';
import { groqTransform } from './groq';
import { togetherTransform } from './together';
import type { OpenAIRequest } from './types';

describe('Provider Transformations', () => {

  describe('OpenAI Transform', () => {
    it('should pass through OpenAI requests unchanged', () => {
      const request: OpenAIRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 1000
      };

      const transformed = openaiTransform.transformRequest(request);
      expect(transformed).toEqual(request);
    });

    it('should pass through OpenAI responses unchanged', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hi there!' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      };

      const transformed = openaiTransform.transformResponse(response, 'gpt-4o');
      expect(transformed).toEqual(response);
    });

    it('should support streaming', () => {
      expect(openaiTransform.supportsStreaming).toBe(true);
    });
  });

  describe('Anthropic Transform', () => {
    it('should transform OpenAI request to Anthropic format', () => {
      const request: OpenAIRequest = {
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7
      };

      const transformed = anthropicTransform.transformRequest(request);

      expect(transformed).toHaveProperty('model', 'claude-3-opus-20240229');
      expect(transformed).toHaveProperty('messages');
      expect(transformed).toHaveProperty('max_tokens', 4096); // Default added
      expect(transformed).toHaveProperty('temperature', 0.7);
    });

    it('should add default max_tokens if missing', () => {
      const request: OpenAIRequest = {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const transformed = anthropicTransform.transformRequest(request);
      expect(transformed.max_tokens).toBe(4096);
    });

    it('should use provided max_tokens', () => {
      const request: OpenAIRequest = {
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 2000
      };

      const transformed = anthropicTransform.transformRequest(request);
      expect(transformed.max_tokens).toBe(2000);
    });

    it('should transform Anthropic response to OpenAI format', () => {
      const anthropicResponse = {
        id: 'msg-123',
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello! How can I help?' }
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 5
        }
      };

      const transformed = anthropicTransform.transformResponse(anthropicResponse, 'claude-3-opus-20240229');

      expect(transformed.id).toBe('msg-123');
      expect(transformed.object).toBe('chat.completion');
      expect(transformed.model).toBe('claude-3-opus-20240229');
      expect(transformed.choices[0].message.content).toBe('Hello! How can I help?');
      expect(transformed.choices[0].finish_reason).toBe('end_turn');
      expect(transformed.usage.prompt_tokens).toBe(10);
      expect(transformed.usage.completion_tokens).toBe(5);
      expect(transformed.usage.total_tokens).toBe(15);
    });

    it('should support streaming', () => {
      expect(anthropicTransform.supportsStreaming).toBe(true);
    });
  });

  describe('Google Transform', () => {
    it('should pass through requests for OpenAI-compatible endpoint', () => {
      const request: OpenAIRequest = {
        model: 'gemini-1.5-pro',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const transformed = googleTransform.transformRequest(request);
      expect(transformed).toHaveProperty('model', 'gemini-1.5-pro');
    });

    it('should pass through OpenAI-format responses', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gemini-1.5-pro',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hi!' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 3,
          total_tokens: 11
        }
      };

      const transformed = googleTransform.transformResponse(response, 'gemini-1.5-pro');
      expect(transformed).toEqual(response);
    });

    it('should support streaming', () => {
      expect(googleTransform.supportsStreaming).toBe(true);
    });
  });

  describe('DeepSeek Transform', () => {
    it('should pass through OpenAI-format requests', () => {
      const request: OpenAIRequest = {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'Write code' }]
      };

      const transformed = deepseekTransform.transformRequest(request);
      expect(transformed).toEqual(request);
    });

    it('should pass through OpenAI-format responses', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'deepseek-chat',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Code here' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15
        }
      };

      const transformed = deepseekTransform.transformResponse(response, 'deepseek-chat');
      expect(transformed).toEqual(response);
    });

    it('should support streaming', () => {
      expect(deepseekTransform.supportsStreaming).toBe(true);
    });
  });

  describe('Groq Transform', () => {
    it('should pass through OpenAI-format requests', () => {
      const request: OpenAIRequest = {
        model: 'llama-3-70b',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const transformed = groqTransform.transformRequest(request);
      expect(transformed).toEqual(request);
    });

    it('should pass through OpenAI-format responses', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'llama-3-70b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hi!' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 6,
          completion_tokens: 2,
          total_tokens: 8
        }
      };

      const transformed = groqTransform.transformResponse(response, 'llama-3-70b');
      expect(transformed).toEqual(response);
    });

    it('should support streaming', () => {
      expect(groqTransform.supportsStreaming).toBe(true);
    });
  });

  describe('Together AI Transform', () => {
    it('should pass through OpenAI-format requests', () => {
      const request: OpenAIRequest = {
        model: 'together-mixtral',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const transformed = togetherTransform.transformRequest(request);
      expect(transformed).toEqual(request);
    });

    it('should pass through OpenAI-format responses', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'together-mixtral',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hi!' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 6,
          completion_tokens: 2,
          total_tokens: 8
        }
      };

      const transformed = togetherTransform.transformResponse(response, 'together-mixtral');
      expect(transformed).toEqual(response);
    });

    it('should support streaming', () => {
      expect(togetherTransform.supportsStreaming).toBe(true);
    });
  });
});
