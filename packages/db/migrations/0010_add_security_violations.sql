-- Migration: Add security_violations table for anomaly blocking
-- This table stores security violations for dashboard review and auditing
-- Supports the new anomaly blocking feature and security monitoring

CREATE TABLE IF NOT EXISTS security_violations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    violation_type TEXT CHECK(violation_type IN ('anomaly', 'prompt_injection', 'rate_limit', 'auth_failure')) NOT NULL,
    severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT, -- JSON string for additional context (IP, User-Agent, etc.)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Index for project-based queries (dashboard view)
CREATE INDEX IF NOT EXISTS idx_security_violations_project
ON security_violations(project_id, created_at DESC);

-- Index for type-based filtering
CREATE INDEX IF NOT EXISTS idx_security_violations_type
ON security_violations(violation_type, created_at DESC);

-- Index for severity-based filtering
CREATE INDEX IF NOT EXISTS idx_security_violations_severity
ON security_violations(severity, created_at DESC);

-- Index for recent violations query (last 24 hours)
CREATE INDEX IF NOT EXISTS idx_security_violations_recent
ON security_violations(created_at DESC);
