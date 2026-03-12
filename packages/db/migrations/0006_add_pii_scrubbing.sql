-- Add PII Scrubbing Configuration to Projects Table
ALTER TABLE projects ADD COLUMN pii_scrubbing_enabled BOOLEAN DEFAULT 1;
ALTER TABLE projects ADD COLUMN pii_scrubbing_level TEXT CHECK(pii_scrubbing_level IN ('low', 'medium', 'high')) DEFAULT 'medium';
ALTER TABLE projects ADD COLUMN pii_custom_patterns TEXT; -- JSON string: array of custom regex patterns

-- Add PII Scrubbing Metrics to Request Logs
ALTER TABLE request_logs ADD COLUMN pii_scrubbed_count INTEGER DEFAULT 0;
ALTER TABLE request_logs ADD COLUMN pii_scrubbing_level TEXT; -- Store which level was used
ALTER TABLE request_logs ADD COLUMN request_body_scrubbed TEXT; -- Store scrubbed request body (optional)
ALTER TABLE request_logs ADD COLUMN response_body_scrubbed TEXT; -- Store scrubbed response body (optional)

-- Create index for PII scrubbing analytics
CREATE INDEX IF NOT EXISTS idx_request_logs_pii_scrubbed ON request_logs(project_id, pii_scrubbed_count, created_at);
