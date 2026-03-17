-- Migration: Settings System Tables Only (Safe Version)
-- Purpose: Add settings tables without modifying existing ones
-- This migration only creates new tables and doesn't modify existing ones

-- ============================================================
-- SECTION 1: USER PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email_notifications_enabled INTEGER DEFAULT 1,
    usage_alert_threshold INTEGER DEFAULT 80,
    security_alerts_enabled INTEGER DEFAULT 1,
    weekly_report_enabled INTEGER DEFAULT 1,
    notification_categories TEXT,
    theme TEXT CHECK(theme IN ('light', 'dark', 'system')) DEFAULT 'system',
    date_format TEXT CHECK(date_format IN ('ISO', 'US', 'EU')) DEFAULT 'ISO',
    time_format TEXT CHECK(time_format IN ('12h', '24h')) DEFAULT '24h',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- ============================================================
-- SECTION 2: SECURITY & SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    device_type TEXT,
    device_name TEXT,
    browser TEXT,
    os TEXT,
    ip_address TEXT,
    user_agent TEXT,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- Two-factor authentication settings
CREATE TABLE IF NOT EXISTS user_two_factor (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    method TEXT CHECK(method IN ('totp', 'sms', 'email', 'none')) DEFAULT 'none',
    secret TEXT,
    phone TEXT,
    backup_codes TEXT,
    is_enabled INTEGER DEFAULT 0,
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
    event_type TEXT NOT NULL,
    event_category TEXT CHECK(event_category IN ('auth', 'security', 'billing', 'settings', 'api')) NOT NULL,
    description TEXT,
    metadata TEXT,
    severity TEXT CHECK(severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
    ip_address TEXT,
    user_agent TEXT,
    success INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_category ON security_audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created ON security_audit_logs(created_at);

-- ============================================================
-- SECTION 3: BILLING & USAGE
-- ============================================================

CREATE TABLE IF NOT EXISTS usage_metrics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    date DATE NOT NULL,
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
    payment_method TEXT,
    line_items TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_billing_history_user ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_period ON billing_history(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMP
-- ============================================================

CREATE TRIGGER IF NOT EXISTS update_user_preferences_timestamp
AFTER UPDATE ON user_preferences
BEGIN
    UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_usage_metrics_timestamp
AFTER UPDATE ON usage_metrics
BEGIN
    UPDATE usage_metrics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_two_factor_timestamp
AFTER UPDATE ON user_two_factor
BEGIN
    UPDATE user_two_factor SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
