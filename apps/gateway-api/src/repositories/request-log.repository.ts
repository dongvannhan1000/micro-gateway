import { DatabaseAdapter } from '@ms-gateway/db';

/**
 * Repository for `request_logs` table operations.
 */
export class RequestLogRepository {
  constructor(private db: DatabaseAdapter) {}

  async create(data: {
    id: string;
    projectId: string;
    gatewayKeyId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
    latencyMs: number;
    statusCode: number;
    promptInjectionScore: number;
    requestId: string;
  }): Promise<void> {
    await this.db.run(
      `INSERT INTO request_logs (
        id, project_id, gateway_key_id, model, 
        prompt_tokens, completion_tokens, total_tokens, 
        cost_usd, latency_ms, status_code, prompt_injection_score, request_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        data.id, data.projectId, data.gatewayKeyId, data.model,
        data.promptTokens, data.completionTokens, data.totalTokens,
        data.costUsd, data.latencyMs, data.statusCode, data.promptInjectionScore, data.requestId,
      ]
    );
  }

  async getAnalyticsSummary(projectId: string, userId: string, days: number = 30): Promise<any> {
    return this.db.first(
      `SELECT 
        COUNT(*) as total_requests,
        TOTAL(cost_usd) as total_cost,
        AVG(latency_ms) as avg_latency,
        COUNT(CASE WHEN prompt_injection_score >= 0.7 OR status_code = 403 THEN 1 END) as security_events
      FROM request_logs
      WHERE project_id = ? 
      AND created_at >= date('now', '-${days} days')
      AND project_id IN (SELECT id FROM projects WHERE user_id = ?)`,
      [projectId, userId]
    );
  }

  async getDailyUsage(projectId: string, userId: string, days: number = 14): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT 
        date(created_at) as day,
        COUNT(*) as requests,
        TOTAL(cost_usd) as cost
      FROM request_logs
      WHERE project_id = ?
      AND created_at >= date('now', '-${days} days')
      AND project_id IN (SELECT id FROM projects WHERE user_id = ?)
      GROUP BY day
      ORDER BY day ASC`,
      [projectId, userId]
    );
    return results;
  }

  async getSecurityLogs(projectId: string, userId: string, limit: number = 50): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT 
        id, model, status_code, prompt_injection_score, created_at
      FROM request_logs
      WHERE project_id = ?
      AND (prompt_injection_score >= 0.5 OR status_code = 403)
      AND project_id IN (SELECT id FROM projects WHERE user_id = ?)
      ORDER BY created_at DESC
      LIMIT ?`,
      [projectId, userId, limit]
    );
    return results;
  }
}
