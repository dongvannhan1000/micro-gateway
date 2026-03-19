-- Add tier system for bulkhead concurrent request limits
-- Free: 5 concurrent, Pro: 10 concurrent, Custom: 20 concurrent

-- Add tier column to projects table
ALTER TABLE projects ADD COLUMN tier TEXT DEFAULT 'free' NOT NULL;

-- Add concurrent_limit column to projects table
ALTER TABLE projects ADD COLUMN concurrent_limit INTEGER DEFAULT 5 NOT NULL;

-- Create index on tier for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_tier ON projects(tier);

-- Update existing projects to have explicit values
UPDATE projects SET tier = 'free' WHERE tier IS NULL OR tier = 'default';
UPDATE projects SET concurrent_limit = 5 WHERE concurrent_limit IS NULL OR concurrent_limit = 0;