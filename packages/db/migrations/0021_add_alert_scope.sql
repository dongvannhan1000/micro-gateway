-- Migration: Add hybrid alert scope support
-- Date: 2026-03-20
-- Description: Add scope field to alert_rules table to support project-level and key-level alerts
-- Note: Columns already exist in production database, this migration is now a no-op for ALTER statements

-- Skip ALTER TABLE statements since columns already exist in production
-- This prevents duplicate column errors

-- Ensure all existing rules have 'project' scope (idempotent)
UPDATE alert_rules SET scope = 'project' WHERE scope IS NULL;

-- Add index for project-level queries (scope + project_id) - idempotent
CREATE INDEX IF NOT EXISTS idx_alert_rules_scope ON alert_rules(project_id, scope);

-- Add partial index for key-level queries (only when gateway_key_id is set) - idempotent
CREATE INDEX IF NOT EXISTS idx_alert_rules_key ON alert_rules(gateway_key_id) WHERE gateway_key_id IS NOT NULL;
