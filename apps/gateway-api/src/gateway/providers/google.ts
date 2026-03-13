/**
 * Google Provider Transformation
 * Transforms between OpenAI format and Google's Gemini API format
 * Note: Using Google's OpenAI-compatible endpoint at generativelanguage.googleapis.com/v1beta/openai/
 */

import { OpenAIRequest, OpenAIResponse, ProviderTransform } from './types';

export const googleTransform: ProviderTransform = {
  supportsStreaming: true,

  /**
   * Transform OpenAI request to Google format
   * Since we're using Google's OpenAI-compatible endpoint, minimal transformation needed
   */
  transformRequest(request: OpenAIRequest): any {
    // Google's OpenAI-compatible endpoint accepts standard OpenAI format
    // Just ensure required fields are present
    return {
      ...request,
      model: request.model
    };
  },

  /**
   * Transform Google response to OpenAI format
   * Google's OpenAI-compatible endpoint returns OpenAI-format responses
   */
  transformResponse(response: any, originalModel: string): OpenAIResponse {
    // Response should already be in OpenAI format from the compatible endpoint
    return response as OpenAIResponse;
  },

  /**
   * No stream transformation needed when using OpenAI-compatible endpoint
   */
  transformStreamChunk(chunk: any): any {
    return chunk;
  }
};
