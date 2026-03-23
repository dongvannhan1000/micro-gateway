-- Migration: Add missing columns to gateway_keys table (idempotent)
-- Purpose: Fix columns that were removed in migration 0006_free_tier_limits
-- NOTE: key_hint column already exists from 0001_initial_schema.sql (created as api_keys, renamed in 0002)

-- Column already exists from initial schema, skip ALTER TABLE
-- ALTER TABLE gateway_keys ADD COLUMN key_hint TEXT;

-- Create index for key_hint for better search performance
CREATE INDEX IF NOT EXISTS idx_gateway_keys_key_hint ON gateway_keys(key_hint);
