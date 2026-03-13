/**
 * OpenAI Provider Transformation
 * OpenAI is the standard format, so transformations are minimal
 */

import { OpenAIRequest, OpenAIResponse, ProviderTransform } from './types';

export const openaiTransform: ProviderTransform = {
  supportsStreaming: true,

  /**
   * OpenAI uses standard format, so minimal transformation needed
   */
  transformRequest(request: OpenAIRequest): any {
    // OpenAI format is the standard, just return as-is
    return request;
  },

  /**
   * OpenAI response is already in correct format
   */
  transformResponse(response: any, originalModel: string): OpenAIResponse {
    return response as OpenAIResponse;
  },

  /**
   * No stream transformation needed for OpenAI
   */
  transformStreamChunk(chunk: any): any {
    return chunk;
  }
};
