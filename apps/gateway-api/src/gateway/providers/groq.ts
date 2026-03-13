/**
 * Groq Provider Transformation
 * Groq provides an OpenAI-compatible API for fast inference
 */

import { OpenAIRequest, OpenAIResponse, ProviderTransform } from './types';

export const groqTransform: ProviderTransform = {
  supportsStreaming: true,

  /**
   * Groq uses OpenAI-compatible format
   */
  transformRequest(request: OpenAIRequest): any {
    // Groq API is OpenAI-compatible
    return request;
  },

  /**
   * Groq response is already in OpenAI format
   */
  transformResponse(response: any, originalModel: string): OpenAIResponse {
    return response as OpenAIResponse;
  },

  /**
   * No stream transformation needed for Groq
   */
  transformStreamChunk(chunk: any): any {
    return chunk;
  }
};
