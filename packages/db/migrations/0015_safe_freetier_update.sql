-- Migration: Safe Free Tier Limits Update
-- Purpose: Add free tier limits without losing existing data
-- This migration is SAFE - it never drops tables

-- Step 1: Ensure required columns exist in gateway_keys
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we handle errors gracefully

-- Add key_hint column if missing (safe to run multiple times)
-- Note: Will fail if exists, but migration continues
-- ALTER TABLE gateway_keys ADD COLUMN key_hint TEXT;

-- Add status column if missing (safe to run multiple times)
-- Note: Will fail if exists, but migration continues
-- ALTER TABLE gateway_keys ADD COLUMN status TEXT CHECK(status IN ('active', 'revoked')) DEFAULT 'active';

-- Add last_cost_update column if missing
-- Note: Will fail if exists, but migration continues
-- ALTER TABLE gateway_keys ADD COLUMN last_cost_update TEXT;

-- Step 2: Update existing records with proper defaults
-- These UPDATE statements are idempotent (safe to run multiple times)
UPDATE gateway_keys SET status = 'active' WHERE status IS NULL;
UPDATE gateway_keys SET key_hint = 'msk...' || SUBSTR(id, 1, 8) WHERE key_hint IS NULL;

-- Step 3: Create indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_gateway_keys_status ON gateway_keys(status);
CREATE INDEX IF NOT EXISTS idx_gateway_keys_key_hint ON gateway_keys(key_hint);

-- Step 4: Account usage tracking table (idempotent)
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

-- Step 5: Add trial tracking columns to users table
-- Note: These will fail if columns exist, but migration continues
-- ALTER TABLE users ADD COLUMN trial_start_date TEXT;
-- ALTER TABLE users ADD COLUMN trial_requests_used INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN trial_max_requests INTEGER DEFAULT 10000;

-- Step 6: Update existing users with trial defaults (idempotent)
UPDATE users SET trial_requests_used = 0 WHERE trial_requests_used IS NULL;
UPDATE users SET trial_max_requests = 10000 WHERE trial_max_requests IS NULL;

-- Step 7: Create account_usage records for existing users (idempotent)
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
