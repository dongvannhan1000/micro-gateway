import { DatabaseAdapter } from '@ms-gateway/db';

/**
 * Repository for waitlist table operations
 */
export class WaitlistRepository {
    constructor(private db: DatabaseAdapter) {}

    /**
     * Add someone to the waitlist
     */
    async create(data: {
        id: string;
        name: string;
        email: string;
        useCase?: string;
    }): Promise<void> {
        await this.db.run(
            `INSERT INTO waitlist (id, name, email, use_case)
             VALUES (?, ?, ?, ?)`,
            [data.id, data.name, data.email, data.useCase || null]
        );
    }

    /**
     * Get all waitlist entries (ordered by newest first)
     */
    async findAll(): Promise<any[]> {
        const { results } = await this.db.execute(
            `SELECT id, name, email, use_case, created_at
             FROM waitlist
             ORDER BY created_at DESC`
        );
        return results;
    }

    /**
     * Get count of waitlist signups
     */
    async count(): Promise<number> {
        const result = await this.db.first<{ count: number }>(
            `SELECT COUNT(*) as count FROM waitlist`
        );
        return result?.count || 0;
    }

    /**
     * Check if email is already on waitlist
     */
    async findByEmail(email: string): Promise<any | null> {
        return await this.db.first(
            `SELECT * FROM waitlist WHERE email = ?`,
            [email]
        );
    }

    /**
     * Get waitlist as CSV for export
     */
    async getCSV(): Promise<string> {
        const results = await this.findAll();

        // CSV Header
        const rows = ['Name,Email,Use Case,Joined Date'];

        // CSV Data
        for (const row of results) {
            const date = new Date(row.created_at).toLocaleDateString();
            rows.push(`"${row.name}","${row.email}","${row.use_case || ''}","${date}"`);
        }

        return rows.join('\n');
    }
}
