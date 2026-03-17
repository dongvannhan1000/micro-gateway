-- Migration: Add missing columns to gateway_keys table
-- Purpose: Fix columns that were removed in migration 0006_free_tier_limits

-- Add key_hint column (shows first 10 chars + last 4 chars of key)
ALTER TABLE gateway_keys ADD COLUMN key_hint TEXT;

-- Add status column if not exists (should have been added in migration 0013)
-- Note: This might fail if already exists, but that's OK
-- ALTER TABLE gateway_keys ADD COLUMN status TEXT CHECK(status IN ('active', 'revoked')) DEFAULT 'active';

-- Update records that don't have key_hint (generate from existing keys if needed)
-- For now, just set to NULL since we can't reconstruct from hashed keys

-- Create index for key_hint for better search performance
CREATE INDEX IF NOT EXISTS idx_gateway_keys_key_hint ON gateway_keys(key_hint);
