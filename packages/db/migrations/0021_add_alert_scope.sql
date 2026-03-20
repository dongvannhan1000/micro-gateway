-- Migration: Add hybrid alert scope support
-- Date: 2026-03-20
-- Description: Add scope field to alert_rules table to support project-level and key-level alerts

-- Add scope column with default 'project' for existing rules
ALTER TABLE alert_rules ADD COLUMN scope TEXT NOT NULL DEFAULT 'project';

-- Add gateway_key_id column (nullable, required when scope='key')
ALTER TABLE alert_rules ADD COLUMN gateway_key_id TEXT;

-- Ensure all existing rules have 'project' scope (defensive)
UPDATE alert_rules SET scope = 'project' WHERE scope IS NULL;

-- Add index for project-level queries (scope + project_id)
CREATE INDEX IF NOT EXISTS idx_alert_rules_scope ON alert_rules(project_id, scope);

-- Add partial index for key-level queries (only when gateway_key_id is set)
CREATE INDEX IF NOT EXISTS idx_alert_rules_key ON alert_rules(gateway_key_id) WHERE gateway_key_id IS NOT NULL;
