-- Add tier system for bulkhead concurrent request limits
-- Free: 5 concurrent, Pro: 10 concurrent, Custom: 20 concurrent
-- This migration is a no-op since columns were added manually in production
-- See migration 0022 for the actual implementation that handles idempotency

-- Columns already exist in production, so we skip the ALTER TABLE statements
-- This prevents duplicate column errors

-- Create index on tier for faster queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_projects_tier ON projects(tier);

-- Update existing projects to have correct values (idempotent)
UPDATE projects SET tier = 'free' WHERE tier IS NULL;
UPDATE projects SET concurrent_limit = 5 WHERE concurrent_limit IS NULL;