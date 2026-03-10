-- Add unique constraint to provider_configs to support ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_configs_project_provider ON provider_configs(project_id, provider);
