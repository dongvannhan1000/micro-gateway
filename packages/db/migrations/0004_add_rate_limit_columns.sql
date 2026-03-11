-- Add rate limit columns to gateway_keys table
ALTER TABLE gateway_keys ADD COLUMN rate_limit_per_min INTEGER DEFAULT 60;
ALTER TABLE gateway_keys ADD COLUMN rate_limit_per_day INTEGER DEFAULT 10000;
