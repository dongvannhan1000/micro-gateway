/**
 * Together AI Provider Transformation
 * Together AI provides an OpenAI-compatible API for various open-source models
 */

import { OpenAIRequest, OpenAIResponse, ProviderTransform } from './types';

export const togetherTransform: ProviderTransform = {
  supportsStreaming: true,

  /**
   * Together AI uses OpenAI-compatible format
   */
  transformRequest(request: OpenAIRequest): any {
    // Together AI API is OpenAI-compatible
    return request;
  },

  /**
   * Together AI response is already in OpenAI format
   */
  transformResponse(response: any, originalModel: string): OpenAIResponse {
    return response as OpenAIResponse;
  },

  /**
   * No stream transformation needed for Together AI
   */
  transformStreamChunk(chunk: any): any {
    return chunk;
  }
};
