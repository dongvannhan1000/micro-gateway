import { Context } from 'hono';
import { Env, Variables } from '../types';
import { ModelPricing, calculateCost as staticCalculateCost } from '@ms-gateway/db';

const PRICING_KV_KEY = 'GLOBAL_PRICING_MANIFEST';

export class PricingService {
    /**
     * Get pricing manifest from KV or fallback to D1
     */
    static async getPricingManifest(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<Record<string, ModelPricing>> {
        try {
            // 1. Try KV Cache
            const cached = await c.env.RATE_LIMIT_KV.get(PRICING_KV_KEY);
            if (cached) {
                return JSON.parse(cached);
            }

            // 2. Fallback to D1
            console.log('[Gateway] [Pricing] KV Cache miss, fetching from D1...');
            const { results } = await c.env.DB.prepare(`
                SELECT * FROM model_pricing
            `).all();

            const manifest: Record<string, ModelPricing> = {};
            results.forEach((row: any) => {
                manifest[row.model_id] = row as ModelPricing;
            });

            // 3. Update KV Cache (Expire in 1 hour)
            await c.env.RATE_LIMIT_KV.put(PRICING_KV_KEY, JSON.stringify(manifest), { expirationTtl: 3600 });

            return manifest;
        } catch (err) {
            console.error('[Gateway] [Pricing] Error fetching pricing:', err);
            return {};
        }
    }

    /**
     * Calculate cost for a model deployment with smart matching
     */
    static async calculate(
        c: Context<{ Bindings: Env; Variables: Variables }>,
        model: string,
        provider: string,
        inputTokens: number,
        outputTokens: number
    ): Promise<number> {
        const manifest = await this.getPricingManifest(c);

        // Smart Matching Strategy:
        // 1. Exact match (model_id directly)
        // 2. Exact match with provider prefix (e.g., openai/gpt-4o)
        // 3. Match with ANY prefix (e.g., google/gemini-...)
        // 4. Fuzzy match (stripping version numbers/suffixes)
        // 5. Fallback to static pricing

        let pricing = manifest[model];

        if (!pricing) {
            // Try to find a model that ends with the requested model
            // Priority 1: Match with specific provider prefix (e.g., openai/gpt-4o)
            // Priority 2: Match with ANY prefix (e.g., google/gemini-...)
            // Priority 3: Fuzzy match (stripping version numbers/suffixes)
            const keys = Object.keys(manifest);

            const providerMatch = keys.find(k => k === `${provider}/${model}` || k === `${provider}:${model}`);

            if (providerMatch) {
                pricing = manifest[providerMatch];
            } else {
                const genericMatch = keys.find(k => k.endsWith(`/${model}`) || k.endsWith(`:${model}`));
                if (genericMatch) {
                    pricing = manifest[genericMatch];
                } else {
                    // Fuzzy Suffix Match: Try to find a "base" model
                    // e.g. gemini-2.5-flash -> match if anything contains 'gemini' and 'flash'
                    const baseModel = model.split('-')[0]; // 'gemini'
                    const fuzzyMatch = keys.find(k => k.includes(baseModel) && k.includes(provider));
                    if (fuzzyMatch) {
                        pricing = manifest[fuzzyMatch];
                    }
                }
            }
        }

        if (!pricing) {
            // Fallback to static pricing if not in DB/KV
            return staticCalculateCost(model, inputTokens, outputTokens);
        }

        if (pricing.mode === 'image_generation') {
            return pricing.output_per_image || 0;
        }

        const inputCost = (inputTokens / 1_000_000) * pricing.input_per_1m;
        const outputCost = (outputTokens / 1_000_000) * pricing.output_per_1m;
        return inputCost + outputCost;
    }
}
