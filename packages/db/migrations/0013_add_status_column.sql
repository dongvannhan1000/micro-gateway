-- Migration: Add missing status column to gateway_keys (idempotent)
-- Purpose: Fix missing status column that was removed in migration 0006
-- NOTE: The status column already exists from 0001_initial_schema.sql (created as api_keys, renamed in 0002)
-- This migration is now a safe no-op for the column, but still updates data and indexes.

-- Column already exists from initial schema, skip ALTER TABLE
-- ALTER TABLE gateway_keys ADD COLUMN status TEXT CHECK(status IN ('active', 'revoked')) DEFAULT 'active';

-- Update existing records to have 'active' status
UPDATE gateway_keys SET status = 'active' WHERE status IS NULL;

-- Create index for status column
CREATE INDEX IF NOT EXISTS idx_gateway_keys_status ON gateway_keys(status);
