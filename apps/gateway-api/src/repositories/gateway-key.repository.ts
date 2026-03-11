import { DatabaseAdapter, GatewayKey } from '@ms-gateway/db';

/**
 * Repository for `gateway_keys` table operations.
 */
export class GatewayKeyRepository {
  constructor(private db: DatabaseAdapter) {}

  async findAllByUser(userId: string): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT k.id, k.name, k.key_hint, k.status, k.monthly_limit_usd, k.current_month_usage_usd, k.rate_limit_per_min, k.rate_limit_per_day, k.created_at, p.name as project_name, p.id as project_id
       FROM gateway_keys k
       JOIN projects p ON k.project_id = p.id
       WHERE p.user_id = ? AND k.status = 'active'
       ORDER BY k.created_at DESC`,
      [userId]
    );
    return results;
  }

  async findByProject(projectId: string, userId: string): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT k.id, k.name, k.key_hint, k.status, k.monthly_limit_usd, k.current_month_usage_usd, k.rate_limit_per_min, k.rate_limit_per_day, k.created_at
       FROM gateway_keys k
       JOIN projects p ON k.project_id = p.id
       WHERE k.project_id = ? AND p.user_id = ? AND k.status = 'active'`,
      [projectId, userId]
    );
    return results;
  }

  /**
   * Lookup a gateway key by its hash, joining with project data.
   * Used by the auth middleware for API key validation.
   */
  async findByKeyHash(hashedKey: string): Promise<any | null> {
    const { results } = await this.db.execute(
      `SELECT k.*, p.id as p_id, p.user_id, p.name as p_name, p.model_aliases
       FROM gateway_keys k
       JOIN projects p ON k.project_id = p.id
       WHERE k.key_hash = ? AND k.status = 'active'
       LIMIT 1`,
      [hashedKey]
    );
    return results.length > 0 ? results[0] : null;
  }

  async create(data: {
    id: string;
    projectId: string;
    keyHash: string;
    keyHint: string;
    name: string;
    monthlyLimitUsd: number;
    rateLimitPerMin: number;
    rateLimitPerDay: number;
  }): Promise<void> {
    await this.db.run(
      `INSERT INTO gateway_keys (id, project_id, key_hash, key_hint, name, monthly_limit_usd, rate_limit_per_min, rate_limit_per_day)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.id, data.projectId, data.keyHash, data.keyHint, data.name, data.monthlyLimitUsd, data.rateLimitPerMin, data.rateLimitPerDay]
    );
  }

  async revoke(keyId: string, projectId: string, userId: string): Promise<number> {
    const { changes } = await this.db.run(
      `UPDATE gateway_keys
       SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
       WHERE id = ? AND project_id = (SELECT id FROM projects WHERE id = ? AND user_id = ?)`,
      [keyId, projectId, userId]
    );
    return changes;
  }

  async addUsage(keyId: string, cost: number): Promise<void> {
    await this.db.run(
      `UPDATE gateway_keys 
       SET current_month_usage_usd = current_month_usage_usd + ?
       WHERE id = ?`,
      [cost, keyId]
    );
  }
}
