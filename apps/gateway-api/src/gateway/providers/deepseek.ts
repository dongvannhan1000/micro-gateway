/**
 * DeepSeek Provider Transformation
 * DeepSeek provides an OpenAI-compatible API, so transformations are minimal
 */

import { OpenAIRequest, OpenAIResponse, ProviderTransform } from './types';

export const deepseekTransform: ProviderTransform = {
  supportsStreaming: true,

  /**
   * DeepSeek uses OpenAI-compatible format
   */
  transformRequest(request: OpenAIRequest): any {
    // DeepSeek API is OpenAI-compatible
    return request;
  },

  /**
   * DeepSeek response is already in OpenAI format
   */
  transformResponse(response: any, originalModel: string): OpenAIResponse {
    return response as OpenAIResponse;
  },

  /**
   * No stream transformation needed for DeepSeek
   */
  transformStreamChunk(chunk: any): any {
    return chunk;
  }
};
