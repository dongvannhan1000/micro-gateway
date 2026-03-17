import { DatabaseAdapter, User, UserPreferences, UserSession } from '@ms-gateway/db';

/**
 * Repository for user profile and preferences operations.
 */
export class UserRepository {
  constructor(private db: DatabaseAdapter) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.db.first<User>(
      `SELECT
        id, email, display_name, avatar_url, bio, company, location,
        timezone, language, trial_start_date, trial_requests_used,
        trial_max_requests, profile_updated_at, created_at, updated_at
      FROM users WHERE id = ?`,
      [id]
    );
  }

  /**
   * Create new user profile
   */
  async create(data: {
    id: string;
    email: string;
    displayName?: string;
  }): Promise<void> {
    await this.db.run(
      `INSERT INTO users (id, email, display_name, trial_start_date, trial_max_requests)
       VALUES (?, ?, ?, CURRENT_DATE, 10000)`,
      [data.id, data.email, data.displayName || data.email?.split('@')[0] || 'User']
    );
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, data: {
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    company?: string;
    location?: string;
    timezone?: string;
    language?: string;
  }): Promise<void> {
    await this.db.run(
      `UPDATE users SET
        display_name = COALESCE(?, display_name),
        avatar_url = COALESCE(?, avatar_url),
        bio = COALESCE(?, bio),
        company = COALESCE(?, company),
        location = COALESCE(?, location),
        timezone = COALESCE(?, timezone),
        language = COALESCE(?, language),
        profile_updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.display_name ?? null,
        data.avatar_url ?? null,
        data.bio ?? null,
        data.company ?? null,
        data.location ?? null,
        data.timezone ?? null,
        data.language ?? null,
        id
      ]
    );
  }

  /**
   * Get or create user preferences
   */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    return this.db.first<UserPreferences>(
      `SELECT * FROM user_preferences WHERE user_id = ?`,
      [userId]
    );
  }

  /**
   * Upsert user preferences
   */
  async upsertPreferences(userId: string, data: {
    theme?: 'light' | 'dark' | 'system';
    date_format?: 'ISO' | 'US' | 'EU';
    time_format?: '12h' | '24h';
    email_notifications_enabled?: number;
    usage_alert_threshold?: number;
    security_alerts_enabled?: number;
    weekly_report_enabled?: number;
    notification_categories?: string;
  }): Promise<void> {
    const existing = await this.getPreferences(userId);

    if (existing) {
      await this.db.run(
        `UPDATE user_preferences SET
          theme = COALESCE(?, theme),
          date_format = COALESCE(?, date_format),
          time_format = COALESCE(?, time_format),
          email_notifications_enabled = COALESCE(?, email_notifications_enabled),
          usage_alert_threshold = COALESCE(?, usage_alert_threshold),
          security_alerts_enabled = COALESCE(?, security_alerts_enabled),
          weekly_report_enabled = COALESCE(?, weekly_report_enabled),
          notification_categories = COALESCE(?, notification_categories)
         WHERE user_id = ?`,
        [
          data.theme ?? null,
          data.date_format ?? null,
          data.time_format ?? null,
          data.email_notifications_enabled ?? null,
          data.usage_alert_threshold ?? null,
          data.security_alerts_enabled ?? null,
          data.weekly_report_enabled ?? null,
          data.notification_categories ?? null,
          userId
        ]
      );
    } else {
      const id = crypto.randomUUID();
      await this.db.run(
        `INSERT INTO user_preferences
          (id, user_id, theme, date_format, time_format,
           email_notifications_enabled, usage_alert_threshold,
           security_alerts_enabled, weekly_report_enabled, notification_categories)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          data.theme ?? 'system',
          data.date_format ?? 'ISO',
          data.time_format ?? '24h',
          data.email_notifications_enabled ?? 1,
          data.usage_alert_threshold ?? 80,
          data.security_alerts_enabled ?? 1,
          data.weekly_report_enabled ?? 1,
          data.notification_categories ?? null
        ]
      );
    }
  }
}

/**
 * Repository for user session operations.
 */
export class SessionRepository {
  constructor(private db: DatabaseAdapter) {}

  /**
   * Create new session
   */
  async create(data: {
    userId: string;
    sessionToken: string;
    deviceType?: string;
    deviceName?: string;
    browser?: string;
    os?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<void> {
    const id = crypto.randomUUID();
    await this.db.run(
      `INSERT INTO user_sessions
        (id, user_id, session_token, device_type, device_name, browser, os,
         ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.sessionToken,
        data.deviceType ?? 'unknown',
        data.deviceName,
        data.browser,
        data.os,
        data.ipAddress,
        data.userAgent,
        data.expiresAt.toISOString()
      ]
    );
  }

  /**
   * Find all active sessions for user
   */
  async findByUser(userId: string): Promise<UserSession[]> {
    const { results } = await this.db.execute<UserSession>(
      `SELECT * FROM user_sessions
       WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
       ORDER BY last_active DESC`,
      [userId]
    );
    return results;
  }

  /**
   * Find session by token
   */
  async findByToken(token: string): Promise<UserSession | null> {
    return this.db.first<UserSession>(
      `SELECT * FROM user_sessions
       WHERE session_token = ? AND is_active = 1 AND expires_at > datetime('now')`,
      [token]
    );
  }

  /**
   * Update session last active time
   */
  async updateLastActive(token: string): Promise<void> {
    await this.db.run(
      `UPDATE user_sessions SET last_active = CURRENT_TIMESTAMP
       WHERE session_token = ?`,
      [token]
    );
  }

  /**
   * Revoke specific session
   */
  async revoke(sessionId: string, userId: string): Promise<number> {
    const { changes } = await this.db.run(
      `UPDATE user_sessions SET is_active = 0
       WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    return changes;
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllExcept(userId: string, currentSessionToken: string): Promise<number> {
    const { changes } = await this.db.run(
      `UPDATE user_sessions SET is_active = 0
       WHERE user_id = ? AND session_token != ?`,
      [userId, currentSessionToken]
    );
    return changes;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpired(): Promise<number> {
    const { changes } = await this.db.run(
      `UPDATE user_sessions SET is_active = 0
       WHERE expires_at <= datetime('now')`
    );
    return changes;
  }
}

/**
 * Repository for security audit log operations.
 */
export class AuditLogRepository {
  constructor(private db: DatabaseAdapter) {}

  /**
   * Create audit log entry
   */
  async create(data: {
    userId: string;
    eventType: string;
    eventCategory: 'auth' | 'security' | 'billing' | 'settings' | 'api';
    description?: string;
    metadata?: string;
    severity?: 'info' | 'warning' | 'critical';
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
  }): Promise<void> {
    const id = crypto.randomUUID();
    await this.db.run(
      `INSERT INTO security_audit_logs
        (id, user_id, event_type, event_category, description,
         metadata, severity, ip_address, user_agent, success)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.eventType,
        data.eventCategory,
        data.description,
        data.metadata ?? null,
        data.severity ?? 'info',
        data.ipAddress ?? null,
        data.userAgent ?? null,
        data.success ? 1 : 0
      ]
    );
  }

  /**
   * Find audit logs with pagination
   */
  async findByUser(userId: string, options: {
    limit?: number;
    offset?: number;
    eventType?: string;
  } = {}): Promise<{
    logs: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(options.limit ?? 50, 100);
    const offset = options.offset ?? 0;

    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (options.eventType) {
      whereClause += ' AND event_type = ?';
      params.push(options.eventType);
    }

    // Get total count
    const countResult = await this.db.first<{ count: number }>(
      `SELECT COUNT(*) as count FROM security_audit_logs ${whereClause}`,
      params
    );
    const total = (countResult?.count ?? 0) as number;

    // Get paginated results
    const { results } = await this.db.execute(
      `SELECT * FROM security_audit_logs ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      logs: results,
      total,
      limit,
      offset
    };
  }

  /**
   * Get recent security events
   */
  async getRecentEvents(userId: string, days: number = 30): Promise<any[]> {
    const { results } = await this.db.execute(
      `SELECT * FROM security_audit_logs
       WHERE user_id = ? AND created_at >= datetime('now', '-' || ? || ' days')
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId, days]
    );
    return results;
  }
}

/**
 * Repository for usage metrics operations.
 */
export class UsageRepository {
  constructor(private db: DatabaseAdapter) {}

  /**
   * Get usage metrics for a period
   */
  async getMetrics(userId: string, options: {
    period?: 'day' | 'week' | 'month' | 'year';
    projectId?: string;
  } = {}): Promise<{
    period: string;
    startDate: string;
    endDate: string;
    summary: any;
    byProvider: any;
    byModel: any;
    dailyBreakdown: any[];
  }> {
    const period = options.period ?? 'month';
    const { startDate, endDate } = this.getDateRange(period);

    let whereClause = `WHERE user_id = ? AND date >= ? AND date <= ?`;
    const params: any[] = [userId, startDate, endDate];

    if (options.projectId) {
      whereClause += ` AND project_id = ?`;
      params.push(options.projectId);
    }

    // Get summary metrics
    const summaryResult = await this.db.first(
      `SELECT
        SUM(api_calls) as total_requests,
        SUM(cost_usd) as total_cost_usd,
        SUM(total_tokens) as total_tokens,
        AVG(avg_latency_ms) as avg_latency_ms,
        SUM(success_requests) * 1.0 / NULLIF(SUM(api_calls), 0) * 100 as success_rate
       FROM usage_metrics ${whereClause}`,
      params
    );

    // Get by provider
    const { results: byProviderResults } = await this.db.execute(
      `SELECT
        provider,
        SUM(api_calls) as requests,
        SUM(cost_usd) as cost_usd,
        SUM(total_tokens) as tokens
       FROM usage_metrics ${whereClause}
       GROUP BY provider`,
      params
    );

    const byProvider: Record<string, any> = {};
    byProviderResults.forEach(row => {
      if (row.provider) {
        byProvider[row.provider] = row;
      }
    });

    // Get daily breakdown
    const { results: dailyBreakdown } = await this.db.execute(
      `SELECT
        date,
        SUM(api_calls) as requests,
        SUM(cost_usd) as cost_usd,
        SUM(total_tokens) as tokens
       FROM usage_metrics ${whereClause}
       GROUP BY date
       ORDER BY date DESC`,
      params
    );

    return {
      period,
      startDate,
      endDate,
      summary: summaryResult || {},
      byProvider,
      byModel: {}, // TODO: Implement model breakdown
      dailyBreakdown
    };
  }

  /**
   * Record usage metric
   */
  async recordMetric(data: {
    userId: string;
    projectId?: string;
    date: string;
    provider: string;
    apiCalls?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costUsd?: number;
    avgLatencyMs?: number;
    successRequests?: number;
    errorRequests?: number;
  }): Promise<void> {
    const id = crypto.randomUUID();

    // Check if record exists and update, otherwise insert
    const existing = await this.db.first(
      `SELECT id FROM usage_metrics
       WHERE user_id = ? AND project_id = ? AND date = ? AND provider = ?`,
      [data.userId, data.projectId ?? null, data.date, data.provider]
    );

    if (existing) {
      await this.db.run(
        `UPDATE usage_metrics SET
          api_calls = api_calls + ?,
          prompt_tokens = prompt_tokens + ?,
          completion_tokens = completion_tokens + ?,
          total_tokens = total_tokens + ?,
          cost_usd = cost_usd + ?,
          avg_latency_ms = ?,
          success_requests = success_requests + ?,
          error_requests = error_requests + ?
         WHERE id = ?`,
        [
          data.apiCalls ?? 0,
          data.promptTokens ?? 0,
          data.completionTokens ?? 0,
          data.totalTokens ?? 0,
          data.costUsd ?? 0,
          data.avgLatencyMs ?? null,
          data.successRequests ?? 0,
          data.errorRequests ?? 0,
          existing.id
        ]
      );
    } else {
      await this.db.run(
        `INSERT INTO usage_metrics
          (id, user_id, project_id, date, provider,
           api_calls, prompt_tokens, completion_tokens, total_tokens,
           cost_usd, avg_latency_ms, success_requests, error_requests)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.userId,
          data.projectId ?? null,
          data.date,
          data.provider,
          data.apiCalls ?? 0,
          data.promptTokens ?? 0,
          data.completionTokens ?? 0,
          data.totalTokens ?? 0,
          data.costUsd ?? 0,
          data.avgLatencyMs ?? null,
          data.successRequests ?? 0,
          data.errorRequests ?? 0
        ]
      );
    }
  }

  private getDateRange(period: string): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate = endDate;

    switch (period) {
      case 'day':
        startDate = endDate;
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(now.getFullYear() - 1);
        startDate = yearAgo.toISOString().split('T')[0];
        break;
    }

    return { startDate, endDate };
  }
}

/**
 * Repository for billing operations.
 */
export class BillingRepository {
  constructor(private db: DatabaseAdapter) {}

  /**
   * Get billing history with pagination
   */
  async getInvoices(userId: string, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    invoices: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(options.limit ?? 12, 24);
    const offset = options.offset ?? 0;

    // Get total count
    const countResult = await this.db.first<{ count: number }>(
      `SELECT COUNT(*) as count FROM billing_history WHERE user_id = ?`,
      [userId]
    );
    const total = countResult?.count ?? 0;

    // Get paginated results
    const { results } = await this.db.execute(
      `SELECT
        id,
        invoice_id,
        period_start,
        period_end,
        subtotal_usd,
        tax_usd,
        total_usd,
        currency,
        status,
        paid_at,
        '/api/management/user/billing/invoices/' || invoice_id as download_url
       FROM billing_history
       WHERE user_id = ?
       ORDER BY period_end DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return {
      invoices: results.map(inv => ({
        ...inv,
        period: this.formatPeriod(inv.period_start as string, inv.period_end as string)
      })),
      total,
      limit,
      offset
    };
  }

  /**
   * Create invoice record
   */
  async createInvoice(data: {
    userId: string;
    invoiceId: string;
    periodStart: string;
    periodEnd: string;
    subtotalUsd: number;
    taxUsd: number;
    totalUsd: number;
    currency?: string;
    lineItems?: any[];
  }): Promise<void> {
    const id = crypto.randomUUID();
    await this.db.run(
      `INSERT INTO billing_history
        (id, user_id, invoice_id, period_start, period_end,
         subtotal_usd, tax_usd, total_usd, currency, line_items)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.invoiceId,
        data.periodStart,
        data.periodEnd,
        data.subtotalUsd,
        data.taxUsd,
        data.totalUsd,
        data.currency ?? 'USD',
        data.lineItems ? JSON.stringify(data.lineItems) : null
      ]
    );
  }

  private formatPeriod(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startMonth = start.toLocaleString('default', { month: 'long' });
    const endMonth = end.toLocaleString('default', { month: 'long' });
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${year}`;
    }
    return `${startMonth} - ${endMonth} ${year}`;
  }
}
