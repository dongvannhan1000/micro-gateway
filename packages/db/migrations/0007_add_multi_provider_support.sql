-- Migration: Add multi-provider support (DeepSeek)
-- This migration updates the provider_configs table to support additional providers

-- Step 1: Drop the existing CHECK constraint (SQLite doesn't support ALTER CONSTRAINT)
-- We need to recreate the table with the updated constraint

-- Create new provider_configs table with updated providers
CREATE TABLE IF NOT EXISTS provider_configs_new (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    provider TEXT CHECK(provider IN ('openai', 'anthropic', 'google', 'deepseek', 'groq', 'together')) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, provider)
);

-- Migrate existing data
INSERT INTO provider_configs_new (id, project_id, provider, api_key_encrypted, is_default, created_at)
SELECT id, project_id, provider, api_key_encrypted, is_default, created_at
FROM provider_configs;

-- Drop old table
DROP TABLE provider_configs;

-- Rename new table to original name
ALTER TABLE provider_configs_new RENAME TO provider_configs;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_provider_configs_project ON provider_configs(project_id);
