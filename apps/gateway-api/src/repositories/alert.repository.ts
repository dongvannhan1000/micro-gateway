import { DatabaseAdapter } from '@ms-gateway/db';

/**
 * Repository for `alert_rules` and `alert_history` table operations.
 */
export class AlertRepository {
  constructor(private db: DatabaseAdapter) {}

  // --- Alert Rules ---

  async findRulesByProject(projectId: string, userId: string): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT
         ar.*,
         gk.name as gateway_key_name
       FROM alert_rules ar
       LEFT JOIN gateway_keys gk ON ar.gateway_key_id = gk.id
       WHERE ar.project_id = ? AND ar.project_id IN (SELECT id FROM projects WHERE user_id = ?)
       ORDER BY ar.created_at DESC`,
      [projectId, userId]
    );
    return results;
  }

  /**
   * Find active (enabled) rules for a project.
   * Used internally by AlertEngine (no ownership check needed).
   */
  async findActiveRules(projectId: string): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT * FROM alert_rules
       WHERE project_id = ? AND is_enabled = 1`,
      [projectId]
    );
    return results;
  }

  /**
   * Validate gateway_key_id belongs to the project
   */
  async validateGatewayKey(
    gatewayKeyId: string,
    projectId: string
  ): Promise<boolean> {
    const result = await this.db.execute(
      `SELECT id FROM gateway_keys
       WHERE id = ? AND project_id = ?`,
      [gatewayKeyId, projectId]
    );
    return (result.results?.length || 0) > 0;
  }

  async createRule(data: {
    id: string;
    projectId: string;
    type: string;
    scope: string;
    gateway_key_id?: string | null;
    threshold: number;
    action: string;
    target?: string;
  }): Promise<void> {
    await this.db.run(
      `INSERT INTO alert_rules (id, project_id, type, scope, gateway_key_id, threshold, action, target, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [data.id, data.projectId, data.type, data.scope, data.gateway_key_id, data.threshold, data.action, data.target]
    );
  }

  async deleteRule(alertId: string, projectId: string, userId: string): Promise<number> {
    const { changes } = await this.db.run(
      `DELETE FROM alert_rules 
       WHERE id = ? AND project_id = ? AND project_id IN (SELECT id FROM projects WHERE user_id = ?)`,
      [alertId, projectId, userId]
    );
    return changes;
  }

  // --- Alert History ---

  async findHistory(projectId: string, userId: string, limit: number = 50): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT h.*, r.type as rule_type
       FROM alert_history h
       JOIN alert_rules r ON h.rule_id = r.id
       WHERE h.project_id = ? AND h.project_id IN (SELECT id FROM projects WHERE user_id = ?)
       ORDER BY h.triggered_at DESC
       LIMIT ?`,
      [projectId, userId, limit]
    );
    return results;
  }

  async createHistory(data: {
    id: string;
    projectId: string;
    ruleId: string;
    message: string;
  }): Promise<void> {
    await this.db.run(
      `INSERT INTO alert_history (id, project_id, rule_id, message, triggered_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [data.id, data.projectId, data.ruleId, data.message]
    );
  }
}
