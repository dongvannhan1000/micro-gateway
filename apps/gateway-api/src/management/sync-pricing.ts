import { Context } from 'hono';
import { Env, Variables } from '../types';

const LITELLM_PRICING_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

export async function syncPricingFromLiteLLM(c: Context<{ Bindings: Env; Variables: Variables }>) {
    const repos = c.get('repos')!;

    try {
        console.log('[Gateway] [Sync] Fetching pricing from LiteLLM...');
        const response = await fetch(LITELLM_PRICING_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch pricing: ${response.statusText}`);
        }

        const data = await response.json() as Record<string, any>;
        const models = Object.entries(data);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const [modelId, info] of models) {
            // Only sync chat/embedding/image_generation models
            if (!['chat', 'embedding', 'image_generation'].includes(info.mode)) {
                continue;
            }

            // Skip if missing essential pricing info
            const inputCost = info.input_cost_per_token || 0;
            const outputCost = info.output_cost_per_token || 0;
            const imageCost = info.output_cost_per_image || 0;

            if (inputCost === 0 && outputCost === 0 && imageCost === 0) {
                skippedCount++;
                continue;
            }

            // Convert per-token to per-1M tokens for our DB
            const inputPer1m = inputCost * 1_000_000;
            const outputPer1m = outputCost * 1_000_000;

            try {
                await repos.pricing.upsert({
                    provider: info.litellm_provider || 'unknown',
                    modelId,
                    mode: info.mode,
                    inputPer1m,
                    outputPer1m,
                    outputPerImage: imageCost,
                    maxInputTokens: info.max_input_tokens || info.max_tokens || null,
                    maxOutputTokens: info.max_output_tokens || null,
                });

                updatedCount++;
            } catch (err) {
                console.error(`[Gateway] [Sync] Failed to sync model ${modelId}:`, err);
            }
        }

        // Clear KV Cache to force refresh
        await c.env.RATE_LIMIT_KV.delete('GLOBAL_PRICING_MANIFEST');

        return c.json({
            success: true,
            message: `Synced ${updatedCount} models, skipped ${skippedCount} low-info records.`,
            updated_count: updatedCount
        });

    } catch (err: any) {
        console.error('[Gateway] [Sync] Error:', err);
        return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
}
