/**
 * Provider Types and Interfaces
 * Defines common interfaces for provider transformations
 */

export interface OpenAIRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  [key: string]: any;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ProviderTransform {
  /**
   * Transform OpenAI-format request to provider-specific format
   */
  transformRequest(request: OpenAIRequest): any;

  /**
   * Transform provider response to OpenAI format
   */
  transformResponse(response: any, originalModel: string): OpenAIResponse;

  /**
   * Check if provider supports streaming
   */
  supportsStreaming: boolean;

  /**
   * Transform streaming chunk if needed
   */
  transformStreamChunk?(chunk: any): any;
}

export type ProviderName = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'groq' | 'together';
