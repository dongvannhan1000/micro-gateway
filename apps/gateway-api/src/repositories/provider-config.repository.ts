import { DatabaseAdapter } from '@ms-gateway/db';

/**
 * Repository for `provider_configs` table operations.
 */
export class ProviderConfigRepository {
  constructor(private db: DatabaseAdapter) {}

  /**
   * List provider configs for a project (safe: checks user ownership).
   * Used by management API.
   */
  async findByProject(projectId: string, userId: string): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT provider, created_at, is_default 
       FROM provider_configs 
       WHERE project_id = ? AND project_id IN (SELECT id FROM projects WHERE user_id = ?)`,
      [projectId, userId]
    );
    return results;
  }

  /**
   * List all configs for a project (no ownership check).
   * Used internally by the proxy for provider routing.
   */
  async findAllByProject(projectId: string): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT * FROM provider_configs WHERE project_id = ?`,
      [projectId]
    );
    return results;
  }

  async hasDefault(projectId: string): Promise<boolean> {
    const result = await this.db.first<{ id: string }>(
      `SELECT id FROM provider_configs WHERE project_id = ? AND is_default = 1 LIMIT 1`,
      [projectId]
    );
    return result !== null;
  }

  async upsert(data: {
    id: string;
    projectId: string;
    provider: string;
    apiKeyEncrypted: string;
    isDefault: number;
  }): Promise<void> {
    await this.db.run(
      `INSERT INTO provider_configs (id, project_id, provider, api_key_encrypted, is_default)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(project_id, provider) DO UPDATE SET
       api_key_encrypted = excluded.api_key_encrypted,
       created_at = CURRENT_TIMESTAMP`,
      [data.id, data.projectId, data.provider, data.apiKeyEncrypted, data.isDefault]
    );
  }

  /**
   * Find all provider configs owned by a specific user.
   * Used by security migration endpoint.
   */
  async findAllByUser(userId: string): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT id, provider, api_key_encrypted, project_id
       FROM provider_configs
       WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?)`,
      [userId]
    );
    return results;
  }

  async updateEncryptedKey(configId: string, newEncryptedKey: string): Promise<void> {
    await this.db.run(
      `UPDATE provider_configs SET api_key_encrypted = ? WHERE id = ?`,
      [newEncryptedKey, configId]
    );
  }

  /**
   * Delete a provider config for a project (verifies user ownership).
   * Returns the number of deleted rows.
   */
  async delete(projectId: string, provider: string, userId: string): Promise<number> {
    const { changes } = await this.db.run(
      `DELETE FROM provider_configs
       WHERE project_id = ? AND provider = ?
       AND project_id IN (SELECT id FROM projects WHERE user_id = ?)`,
      [projectId, provider, userId]
    );
    return changes;
  }

  /**
   * List distinct providers for a project.
   * Used by /v1/models endpoint.
   */
  async findProvidersByProject(projectId: string): Promise<string[]> {
    const { results } = await this.db.execute<{ provider: string }>(
      `SELECT provider FROM provider_configs WHERE project_id = ?`,
      [projectId]
    );
    return results.map(r => r.provider);
  }
}
