-- Migration: Comprehensive Settings System Schema
-- Purpose: Support user profile, preferences, security, sessions, billing, and usage tracking
-- Dependencies: Requires users table from migration 0006_free_tier_limits.sql

-- ============================================================
-- SECTION 1: USER PROFILE EXTENSIONS
-- ============================================================

-- Extend users table with profile information
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN company TEXT;
ALTER TABLE users ADD COLUMN location TEXT;
ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en';
ALTER TABLE users ADD COLUMN profile_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Index for profile searches
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);

-- ============================================================
-- SECTION 2: USER PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email_notifications_enabled INTEGER DEFAULT 1, -- Boolean (0/1)
    usage_alert_threshold INTEGER DEFAULT 80, -- Percentage (0-100)
    security_alerts_enabled INTEGER DEFAULT 1, -- Boolean (0/1)
    weekly_report_enabled INTEGER DEFAULT 1, -- Boolean (0/1)
    notification_categories TEXT, -- JSON: {"security": true, "billing": true, "usage": true}
    theme TEXT CHECK(theme IN ('light', 'dark', 'system')) DEFAULT 'system',
    date_format TEXT CHECK(date_format IN ('ISO', 'US', 'EU')) DEFAULT 'ISO',
    time_format TEXT CHECK(time_format IN ('12h', '24h')) DEFAULT '24h',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- ============================================================
-- SECTION 3: SECURITY & SESSIONS
-- ============================================================

-- Active sessions management
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    device_type TEXT, -- mobile, desktop, tablet, unknown
    device_name TEXT, -- e.g., "Chrome on Windows", "Safari on iPhone"
    browser TEXT, -- chrome, firefox, safari, edge
    os TEXT, -- windows, macos, linux, ios, android
    ip_address TEXT,
    user_agent TEXT,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1, -- Boolean (0/1)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active);

-- Two-factor authentication settings
CREATE TABLE IF NOT EXISTS user_two_factor (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    method TEXT CHECK(method IN ('totp', 'sms', 'email', 'none')) DEFAULT 'none',
    secret TEXT, -- Encrypted TOTP secret
    phone TEXT, -- Encrypted phone number for SMS
    backup_codes TEXT, -- JSON array of encrypted backup codes
    is_enabled INTEGER DEFAULT 0, -- Boolean (0/1)
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_two_factor_user ON user_two_factor(user_id);

-- Security audit logs
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- login, logout, password_change, 2fa_enabled, api_key_created, etc.
    event_category TEXT CHECK(event_category IN ('auth', 'security', 'billing', 'settings', 'api')) NOT NULL,
    description TEXT,
    metadata TEXT, -- JSON: {"ip": "...", "user_agent": "...", "target": "..."}
    severity TEXT CHECK(severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_category ON security_audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created ON security_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_severity ON security_audit_logs(severity);

-- ============================================================
-- SECTION 4: BILLING & USAGE
-- ============================================================

-- Daily usage metrics aggregation
CREATE TABLE IF NOT EXISTS usage_metrics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT, -- NULL for account-wide totals
    date DATE NOT NULL, -- Format: YYYY-MM-DD
    provider TEXT CHECK(provider IN ('openai', 'anthropic', 'google', 'deepseek', 'groq', 'together')),
    api_calls INTEGER DEFAULT 0,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 6) DEFAULT 0.000000,
    avg_latency_ms INTEGER,
    success_requests INTEGER DEFAULT 0,
    error_requests INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    UNIQUE(user_id, project_id, date, provider)
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_date ON usage_metrics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_project_date ON usage_metrics(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_date ON usage_metrics(date);

-- Billing history
CREATE TABLE IF NOT EXISTS billing_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL UNIQUE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    subtotal_usd DECIMAL(10, 2) NOT NULL,
    tax_usd DECIMAL(10, 2) DEFAULT 0.00,
    total_usd DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT CHECK(status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
    invoice_url TEXT,
    payment_method TEXT, -- credit_card, ach, wire
    line_items TEXT, -- JSON: [{"description": "...", "amount": 10.00}]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_billing_history_user ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_period ON billing_history(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_invoice_id ON billing_history(invoice_id);

-- Usage quotas and limits
CREATE TABLE IF NOT EXISTS usage_quotas (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    quota_type TEXT CHECK(quota_type IN ('api_calls', 'tokens', 'cost', 'projects', 'keys')) NOT NULL,
    limit_value INTEGER NOT NULL, -- Maximum allowed
    current_value INTEGER DEFAULT 0, -- Current usage
    period_type TEXT CHECK(period_type IN ('hourly', 'daily', 'weekly', 'monthly', 'lifetime')) NOT NULL,
    reset_date DATE, -- When quota resets
    tier TEXT CHECK(tier IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, quota_type, period_type)
);

CREATE INDEX IF NOT EXISTS idx_usage_quotas_user ON usage_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_type ON usage_quotas(quota_type);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_tier ON usage_quotas(tier);

-- ============================================================
-- SECTION 5: NOTIFICATION HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    notification_type TEXT CHECK(notification_type IN ('email', 'webhook', 'in_app')) NOT NULL,
    category TEXT CHECK(category IN ('security', 'billing', 'usage', 'system')) NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    metadata TEXT, -- JSON: Additional context
    status TEXT CHECK(status IN ('pending', 'sent', 'failed', 'bounced')) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_category ON notification_history(category);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_created ON notification_history(created_at);

-- ============================================================
-- SECTION 6: WEBHOOK INTEGRATIONS (Optional)
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_integrations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT, -- For HMAC signature verification
    events TEXT, -- JSON array: ["usage_alert", "security_alert", "billing_event"]
    is_active INTEGER DEFAULT 1, -- Boolean (0/1)
    last_triggered_at DATETIME,
    failure_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhook_integrations_user ON webhook_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_integrations_active ON webhook_integrations(user_id, is_active);

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMP
-- ============================================================

-- User preferences updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_user_preferences_timestamp
AFTER UPDATE ON user_preferences
BEGIN
    UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Usage metrics updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_usage_metrics_timestamp
AFTER UPDATE ON usage_metrics
BEGIN
    UPDATE usage_metrics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- User two-factor updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_user_two_factor_timestamp
AFTER UPDATE ON user_two_factor
BEGIN
    UPDATE user_two_factor SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Usage quotas updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_usage_quotas_timestamp
AFTER UPDATE ON usage_quotas
BEGIN
    UPDATE usage_quotas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Webhook integrations updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_webhook_integrations_timestamp
AFTER UPDATE ON webhook_integrations
BEGIN
    UPDATE webhook_integrations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Users profile_updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_users_profile_timestamp
AFTER UPDATE OF display_name, avatar_url, bio, company, location, timezone, language ON users
BEGIN
    UPDATE users SET profile_updated_at = CURRENT_TIMESTAMP WHERE rowid = NEW.rowid;
END;

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- View for user profile summary
CREATE VIEW IF NOT EXISTS v_user_profile_summary AS
SELECT
    u.id,
    u.email,
    u.display_name,
    u.avatar_url,
    u.company,
    u.location,
    u.timezone,
    u.language,
    u.profile_updated_at,
    up.email_notifications_enabled,
    up.security_alerts_enabled,
    up.theme,
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT gk.id) as total_keys
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
LEFT JOIN projects p ON u.id = p.user_id
LEFT JOIN gateway_keys gk ON p.id = gk.project_id AND gk.revoked_at IS NULL
GROUP BY u.id;

-- View for usage summary by user
CREATE VIEW IF NOT EXISTS v_user_usage_summary AS
SELECT
    user_id,
    date,
    SUM(api_calls) as total_api_calls,
    SUM(total_tokens) as total_tokens,
    SUM(cost_usd) as total_cost_usd,
    SUM(success_requests) as total_success,
    SUM(error_requests) as total_errors
FROM usage_metrics
GROUP BY user_id, date
ORDER BY date DESC;

-- View for recent security events
CREATE VIEW IF NOT EXISTS v_recent_security_events AS
SELECT
    user_id,
    event_type,
    event_category,
    description,
    severity,
    created_at
FROM security_audit_logs
WHERE created_at >= datetime('now', '-30 days')
ORDER BY created_at DESC;

-- View for active sessions
CREATE VIEW IF NOT EXISTS v_active_sessions AS
SELECT
    s.id,
    s.user_id,
    s.device_name,
    s.ip_address,
    s.last_active,
    s.created_at,
    u.email
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = 1 AND s.expires_at > CURRENT_TIMESTAMP
ORDER BY s.last_active DESC;
