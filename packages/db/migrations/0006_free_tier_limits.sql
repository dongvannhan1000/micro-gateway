-- Migration: Free Tier Limits and Account-Level Usage Tracking
-- Purpose: Implement MVP free tier with abuse prevention

-- 1. Update gateway_keys defaults (30 req/min, 3k req/day)
-- Note: SQLite doesn't support ALTER COLUMN with DEFAULT, so we need to recreate

-- Step 1a: Create new table with updated defaults
CREATE TABLE IF NOT EXISTS gateway_keys_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rate_limit_per_min INTEGER DEFAULT 30,  -- Changed from 60
  rate_limit_per_day INTEGER DEFAULT 3000,  -- Changed from 10000
  monthly_limit_usd REAL DEFAULT 10,  -- Changed from 100
  current_month_usage_usd REAL DEFAULT 0,
  last_cost_update TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Step 1b: Copy existing data
INSERT INTO gateway_keys_new
  SELECT id, project_id, key_hash, name, rate_limit_per_min, rate_limit_per_day,
         monthly_limit_usd, current_month_usage_usd, last_cost_update, revoked_at, created_at
  FROM gateway_keys;

-- Step 1c: Drop old table and rename new one
DROP TABLE gateway_keys;
ALTER TABLE gateway_keys_new RENAME TO gateway_keys;

-- Step 1d: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_gateway_keys_project ON gateway_keys(project_id);

-- 2. Add trial tracking to users table
ALTER TABLE users ADD COLUMN trial_start_date TEXT;
ALTER TABLE users ADD COLUMN trial_requests_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN trial_max_requests INTEGER DEFAULT 10000;  -- 10k free requests

-- 3. Account usage tracking table
CREATE TABLE IF NOT EXISTS account_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  requests_today INTEGER DEFAULT 0,
  last_reset_date TEXT,  -- Format: YYYY-MM-DD
  keys_count INTEGER DEFAULT 0,  -- Cache for total keys count
  projects_count INTEGER DEFAULT 0,  -- Cache for total projects count
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_usage_user ON account_usage(user_id);
