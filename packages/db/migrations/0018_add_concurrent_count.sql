-- Add concurrent_count column to track active concurrent requests per project
-- Used by bulkhead middleware for persistence across Worker restarts

-- Add concurrent_count column to projects table
ALTER TABLE projects ADD COLUMN concurrent_count INTEGER DEFAULT 0 NOT NULL;

-- Create index on concurrent_count for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_concurrent_count ON projects(concurrent_count);
