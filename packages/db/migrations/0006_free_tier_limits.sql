-- Migration: Free Tier Limits and Account-Level Usage Tracking
-- Purpose: Implement MVP free tier with abuse prevention
-- NOTE: This is the SAFE version that preserves existing data

-- IMPORTANT: We CANNOT change DEFAULT values in SQLite for existing columns
-- Instead, we handle defaults in application logic
-- This migration only ADDS missing columns, never drops tables

-- 1. Add last_cost_update column to gateway_keys if missing
-- Note: This will fail if column exists, but migration continues
-- ALTER TABLE gateway_keys ADD COLUMN last_cost_update TEXT;

-- 2. Add trial tracking columns to users table
-- Note: These will fail if columns exist, but migration continues
-- ALTER TABLE users ADD COLUMN trial_start_date TEXT;
-- ALTER TABLE users ADD COLUMN trial_requests_used INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN trial_max_requests INTEGER DEFAULT 10000;

-- 3. Account usage tracking table (idempotent - safe to run multiple times)
CREATE TABLE IF NOT EXISTS account_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  requests_today INTEGER DEFAULT 0,
  last_reset_date TEXT,
  keys_count INTEGER DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_usage_user ON account_usage(user_id);

-- 4. Create indexes for gateway_keys if missing
CREATE INDEX IF NOT EXISTS idx_gateway_keys_project ON gateway_keys(project_id);

-- 5. Update existing records with default values (idempotent)
UPDATE users SET trial_requests_used = 0 WHERE trial_requests_used IS NULL;
UPDATE users SET trial_max_requests = 10000 WHERE trial_max_requests IS NULL;

-- 6. Create account_usage records for existing users (idempotent)
INSERT OR IGNORE INTO account_usage (id, user_id, requests_today, keys_count, projects_count, updated_at)
SELECT
  'usage-' || u.id,
  u.id,
  0,
  (SELECT COUNT(*) FROM gateway_keys k JOIN projects p ON k.project_id = p.id WHERE p.user_id = u.id),
  (SELECT COUNT(*) FROM projects WHERE user_id = u.id),
  CURRENT_TIMESTAMP
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM account_usage WHERE user_id = u.id);

-- NOTE: Default values for rate_limit_per_min, rate_limit_per_day, monthly_limit_usd
-- are handled in application code (repository layer), not database constraints
-- New records created via API will use: 30 req/min, 3000 req/day, $10/month
