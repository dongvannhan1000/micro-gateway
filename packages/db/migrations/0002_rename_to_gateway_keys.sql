-- Migration: Rename api_keys to gateway_keys
-- 1. Rename the main table
ALTER TABLE api_keys RENAME TO gateway_keys;

-- 2. Rename the foreign key column in request_logs
-- SQLite doesn't support RENAME COLUMN in older versions, but Cloudflare D1 (standard SQLite) does.
ALTER TABLE request_logs RENAME COLUMN api_key_id TO gateway_key_id;

-- 3. Update indexes
DROP INDEX IF EXISTS idx_api_keys_project;
CREATE INDEX IF NOT EXISTS idx_gateway_keys_project ON gateway_keys(project_id);

DROP INDEX IF EXISTS idx_request_logs_api_key;
CREATE INDEX IF NOT EXISTS idx_request_logs_gateway_key ON request_logs(gateway_key_id);
