-- Migration: Add missing status column to gateway_keys
-- Purpose: Fix missing status column that was removed in migration 0006

-- Add status column to gateway_keys table
ALTER TABLE gateway_keys ADD COLUMN status TEXT CHECK(status IN ('active', 'revoked')) DEFAULT 'active';

-- Update existing records to have 'active' status
UPDATE gateway_keys SET status = 'active' WHERE status IS NULL;

-- Create index for status column
CREATE INDEX IF NOT EXISTS idx_gateway_keys_status ON gateway_keys(status);
