import { DatabaseAdapter, QueryResult } from '@ms-gateway/db';

/**
 * Cloudflare D1 implementation of DatabaseAdapter.
 * Wraps D1Database to provide a uniform interface.
 */
export class D1Adapter implements DatabaseAdapter {
  constructor(private db: D1Database) {}

  async execute<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const { results, meta } = await bound.all();
    return {
      results: (results || []) as T[],
      meta: { changes: meta?.changes ?? 0 },
    };
  }

  async first<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const result = await bound.first();
    return (result as T) || null;
  }

  async run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const stmt = this.db.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const { meta } = await bound.run();
    return { changes: meta?.changes ?? 0 };
  }
}
