/**
 * Anthropic Provider Transformation
 * Transforms between OpenAI format and Anthropic's Messages API format
 */

import { OpenAIRequest, OpenAIResponse, ProviderTransform } from './types';

export const anthropicTransform: ProviderTransform = {
  supportsStreaming: true,

  /**
   * Transform OpenAI request to Anthropic format
   * OpenAI: { messages: [{role, content}] }
   * Anthropic: { messages: [{role, content}], max_tokens: required }
   */
  transformRequest(request: OpenAIRequest): any {
    const anthropicRequest: any = {
      model: request.model,
      messages: request.messages,
      max_tokens: request.max_tokens || 4096, // Anthropic requires max_tokens
      stream: request.stream || false
    };

    // Copy optional parameters if present
    if (request.temperature !== undefined) anthropicRequest.temperature = request.temperature;
    if (request.top_p !== undefined) anthropicRequest.top_p = request.top_p;

    // Anthropic uses top_k instead of frequency/presence penalties
    if (request.top_k !== undefined) anthropicRequest.top_k = request.top_k;

    return anthropicRequest;
  },

  /**
   * Transform Anthropic response to OpenAI format
   */
  transformResponse(response: any, originalModel: string): OpenAIResponse {
    // Anthropic response format:
    // { id: "msg_xxx", type: "message", role: "assistant", content: [...], stop_reason: "end_turn", usage: {...} }

    // Extract text content from Anthropic's content blocks
    let content = '';
    if (Array.isArray(response.content)) {
      content = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');
    } else if (typeof response.content === 'string') {
      content = response.content;
    }

    return {
      id: response.id,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: originalModel,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: content
        },
        finish_reason: response.stop_reason || 'stop'
      }],
      usage: {
        prompt_tokens: response.usage?.input_tokens || 0,
        completion_tokens: response.usage?.output_tokens || 0,
        total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      }
    };
  },

  /**
   * Transform Anthropic streaming chunk to OpenAI format
   */
  transformStreamChunk(chunk: any): any {
    // Anthropic streaming uses SSE with events like "message_start", "content_block_delta", etc.
    // This would need to be transformed to OpenAI's "data:" format
    // Implementation depends on the exact streaming format received
    return chunk;
  }
};
