/**
 * Provider Factory
 * Returns the appropriate transformation logic for each provider
 */

import { ProviderTransform, ProviderName } from './types';
import { openaiTransform } from './openai';
import { anthropicTransform } from './anthropic';
import { googleTransform } from './google';
import { deepseekTransform } from './deepseek';
import { groqTransform } from './groq';
import { togetherTransform } from './together';

/**
 * Provider transformation registry
 */
const PROVIDER_TRANSFORMS: Record<ProviderName, ProviderTransform> = {
  openai: openaiTransform,
  anthropic: anthropicTransform,
  google: googleTransform,
  deepseek: deepseekTransform,
  groq: groqTransform,
  together: togetherTransform
};

/**
 * Get transformation logic for a specific provider
 */
export function getProviderTransform(provider: ProviderName): ProviderTransform {
  return PROVIDER_TRANSFORMS[provider] || openaiTransform; // Default to OpenAI
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): ProviderName[] {
  return Object.keys(PROVIDER_TRANSFORMS) as ProviderName[];
}

/**
 * Check if a provider is supported
 */
export function isProviderSupported(provider: string): provider is ProviderName {
  return provider in PROVIDER_TRANSFORMS;
}

// Export all transforms for direct access if needed
export { openaiTransform, anthropicTransform, googleTransform, deepseekTransform, groqTransform, togetherTransform };
