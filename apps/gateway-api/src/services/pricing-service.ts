import { Context } from 'hono';
import { Env, Variables } from '../types';
import { ModelPricing, calculateCost as staticCalculateCost } from '@ms-gateway/db';

const PRICING_KV_KEY = 'GLOBAL_PRICING_MANIFEST';

export class PricingService {
    /**
     * Get pricing manifest from KV or fallback to DB via repository
     */
    static async getPricingManifest(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<Record<string, ModelPricing>> {
        try {
            // 1. Try KV Cache
            const cached = await c.env.RATE_LIMIT_KV.get(PRICING_KV_KEY);
            if (cached) {
                return JSON.parse(cached);
            }

            // 2. Fallback to DB via Repository
            console.log('[Gateway] [Pricing] KV Cache miss, fetching from DB...');
            const repos = c.get('repos')!;
            const results = await repos.pricing.findAll();

            const manifest: Record<string, ModelPricing> = {};
            results.forEach((row) => {
                manifest[row.model_id] = row;
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
            const keys = Object.keys(manifest);

            const providerMatch = keys.find(k => k === `${provider}/${model}` || k === `${provider}:${model}`);

            if (providerMatch) {
                pricing = manifest[providerMatch];
            } else {
                const genericMatch = keys.find(k => k.endsWith(`/${model}`) || k.endsWith(`:${model}`));
                if (genericMatch) {
                    pricing = manifest[genericMatch];
                } else {
                    // Fuzzy Suffix Match
                    const baseModel = model.split('-')[0];
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
