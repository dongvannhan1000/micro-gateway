import { DatabaseAdapter } from '@ms-gateway/db';

export interface SecurityViolation {
    id: string;
    project_id: string;
    violation_type: 'anomaly' | 'prompt_injection' | 'rate_limit' | 'auth_failure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metadata?: string; // JSON string
    created_at: string;
}

export class SecurityViolationRepository {
    constructor(private db: DatabaseAdapter) {}

    /**
     * Create a new security violation record
     */
    async create(data: {
        id: string;
        projectId: string;
        violationType: SecurityViolation['violation_type'];
        severity: SecurityViolation['severity'];
        description: string;
        metadata?: string;
    }): Promise<void> {
        const stmt = `
            INSERT INTO security_violations (
                id, project_id, violation_type, severity, description, metadata
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        await this.db.execute(stmt, [
            data.id,
            data.projectId,
            data.violationType,
            data.severity,
            data.description,
            data.metadata || null
        ]);
    }

    /**
     * Find security violations by project ID
     */
    async findByProject(projectId: string, limit: number = 100): Promise<SecurityViolation[]> {
        const stmt = `
            SELECT
                id, project_id, violation_type, severity, description, metadata, created_at
            FROM security_violations
            WHERE project_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `;

        const rows = await this.db.query(stmt, [projectId, limit]);
        return rows as SecurityViolation[];
    }

    /**
     * Find security violations by type
     */
    async findByType(
        projectId: string,
        violationType: SecurityViolation['violation_type'],
        limit: number = 50
    ): Promise<SecurityViolation[]> {
        const stmt = `
            SELECT
                id, project_id, violation_type, severity, description, metadata, created_at
            FROM security_violations
            WHERE project_id = ? AND violation_type = ?
            ORDER BY created_at DESC
            LIMIT ?
        `;

        const rows = await this.db.query(stmt, [projectId, violationType, limit]);
        return rows as SecurityViolation[];
    }

    /**
     * Find security violations by severity
     */
    async findBySeverity(
        projectId: string,
        severity: SecurityViolation['severity'],
        limit: number = 50
    ): Promise<SecurityViolation[]> {
        const stmt = `
            SELECT
                id, project_id, violation_type, severity, description, metadata, created_at
            FROM security_violations
            WHERE project_id = ? AND severity = ?
            ORDER BY created_at DESC
            LIMIT ?
        `;

        const rows = await this.db.query(stmt, [projectId, severity, limit]);
        return rows as SecurityViolation[];
    }

    /**
     * Get security statistics for a project
     */
    async getStats(projectId: string): Promise<{
        total: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
        recentCount: number;
    }> {
        // Total violations
        const totalStmt = `SELECT COUNT(*) as count FROM security_violations WHERE project_id = ?`;
        const totalResult = await this.db.query(totalStmt, [projectId]);
        const total = (totalResult[0] as any).count;

        // By type
        const typeStmt = `
            SELECT violation_type, COUNT(*) as count
            FROM security_violations
            WHERE project_id = ?
            GROUP BY violation_type
        `;
        const typeResults = await this.db.query(typeStmt, [projectId]);
        const byType: Record<string, number> = {};
        for (const row of typeResults) {
            byType[(row as any).violation_type] = (row as any).count;
        }

        // By severity
        const severityStmt = `
            SELECT severity, COUNT(*) as count
            FROM security_violations
            WHERE project_id = ?
            GROUP BY severity
        `;
        const severityResults = await this.db.query(severityStmt, [projectId]);
        const bySeverity: Record<string, number> = {};
        for (const row of severityResults) {
            bySeverity[(row as any).severity] = (row as any).count;
        }

        // Recent violations (last 24 hours)
        const recentStmt = `
            SELECT COUNT(*) as count
            FROM security_violations
            WHERE project_id = ?
            AND created_at >= datetime('now', '-24 hours')
        `;
        const recentResult = await this.db.query(recentStmt, [projectId]);
        const recentCount = (recentResult[0] as any).count;

        return {
            total,
            byType,
            bySeverity,
            recentCount
        };
    }

    /**
     * Delete old security violations (for cleanup)
     */
    async deleteOlderThan(days: number): Promise<number> {
        const stmt = `
            DELETE FROM security_violations
            WHERE created_at < datetime('now', '-' || ? || ' days')
        `;

        const result = await this.db.execute(stmt, [days]);
        return result.meta.changes || 0;
    }
}
