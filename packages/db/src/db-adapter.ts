/**
 * Database Adapter Interface
 * Abstracts database operations to allow swapping implementations
 * (D1 → PostgreSQL, etc.) without changing business logic.
 */

export interface QueryResult<T = Record<string, unknown>> {
  results: T[];
  meta: { changes: number };
}

export interface DatabaseAdapter {
  /**
   * Execute a query that returns multiple rows.
   */
  execute<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;

  /**
   * Execute a query that returns a single row (or null).
   */
  first<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;

  /**
   * Execute a write query (INSERT/UPDATE/DELETE) and return metadata.
   */
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
}
