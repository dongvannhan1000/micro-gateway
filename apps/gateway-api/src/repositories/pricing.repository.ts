import { DatabaseAdapter, ModelPricing } from '@ms-gateway/db';

/**
 * Repository for `model_pricing` table operations.
 */
export class PricingRepository {
  constructor(private db: DatabaseAdapter) {}

  async findAll(): Promise<ModelPricing[]> {
    const { results } = await this.db.execute<ModelPricing>(
      `SELECT * FROM model_pricing`
    );
    return results;
  }

  async upsert(data: {
    provider: string;
    modelId: string;
    mode: string;
    inputPer1m: number;
    outputPer1m: number;
    outputPerImage: number;
    maxInputTokens: number | null;
    maxOutputTokens: number | null;
  }): Promise<void> {
    await this.db.run(
      `INSERT INTO model_pricing (
        id, provider, model_id, mode, 
        input_per_1m, output_per_1m, output_per_image,
        max_input_tokens, max_output_tokens, updated_at
      ) VALUES (HEX(RANDOMBLOB(16)), ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(model_id) DO UPDATE SET
        provider = excluded.provider,
        mode = excluded.mode,
        input_per_1m = CASE WHEN is_custom = 0 THEN excluded.input_per_1m ELSE input_per_1m END,
        output_per_1m = CASE WHEN is_custom = 0 THEN excluded.output_per_1m ELSE output_per_1m END,
        output_per_image = CASE WHEN is_custom = 0 THEN excluded.output_per_image ELSE output_per_image END,
        max_input_tokens = excluded.max_input_tokens,
        max_output_tokens = excluded.max_output_tokens,
        updated_at = CURRENT_TIMESTAMP`,
      [
        data.provider, data.modelId, data.mode,
        data.inputPer1m, data.outputPer1m, data.outputPerImage,
        data.maxInputTokens, data.maxOutputTokens,
      ]
    );
  }
}
