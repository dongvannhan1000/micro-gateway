import { DatabaseAdapter, Project } from '@ms-gateway/db';

/**
 * Repository for `projects` table operations.
 * All SQL queries for projects are centralized here.
 */
export class ProjectRepository {
  constructor(private db: DatabaseAdapter) {}

  async findAllByUser(userId: string): Promise<Project[]> {
    const { results } = await this.db.execute<Project>(
      `SELECT 
        p.*,
        COUNT(r.id) as total_requests,
        TOTAL(r.cost_usd) as total_cost,
        AVG(r.latency_ms) as avg_latency,
        COUNT(CASE WHEN r.prompt_injection_score >= 0.7 OR r.status_code = 403 THEN 1 END) as security_events
      FROM projects p
      LEFT JOIN request_logs r ON p.id = r.project_id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC`,
      [userId]
    );
    return results;
  }

  async findByIdAndUser(id: string, userId: string): Promise<Project | null> {
    return this.db.first<Project>(
      `SELECT 
        p.*,
        COUNT(r.id) as total_requests,
        TOTAL(r.cost_usd) as total_cost,
        AVG(r.latency_ms) as avg_latency,
        COUNT(CASE WHEN r.prompt_injection_score >= 0.7 OR r.status_code = 403 THEN 1 END) as security_events
      FROM projects p
      LEFT JOIN request_logs r ON p.id = r.project_id
      WHERE p.id = ? AND p.user_id = ?
      GROUP BY p.id`,
      [id, userId]
    );
  }

  async create(id: string, userId: string, name: string, description: string): Promise<void> {
    await this.db.run(
      `INSERT INTO projects (id, user_id, name, description) VALUES (?, ?, ?, ?)`,
      [id, userId, name, description]
    );
  }

  async update(id: string, userId: string, data: {
    name?: string;
    description?: string;
    model_aliases?: string;
    pii_scrubbing_level?: 'low' | 'medium' | 'high';
    pii_scrubbing_enabled?: number;
  }): Promise<number> {
    // Convert undefined to null for D1 compatibility
    const params = [
      data.name ?? null,
      data.description ?? null,
      data.model_aliases ?? null,
      data.pii_scrubbing_level ?? null,
      data.pii_scrubbing_enabled ?? null,
      id,
      userId
    ];

    const { changes } = await this.db.run(
      `UPDATE projects
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           model_aliases = COALESCE(?, model_aliases),
           pii_scrubbing_level = COALESCE(?, pii_scrubbing_level),
           pii_scrubbing_enabled = COALESCE(?, pii_scrubbing_enabled),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      params
    );
    return changes;
  }

  async existsForUser(id: string, userId: string): Promise<boolean> {
    const result = await this.db.first<{ id: string }>(
      `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return result !== null;
  }

  async findNameById(id: string): Promise<{ name: string } | null> {
    return this.db.first<{ name: string }>(
      `SELECT name FROM projects WHERE id = ?`,
      [id]
    );
  }
}
