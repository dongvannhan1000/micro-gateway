-- Migration: Add index for security events performance
CREATE INDEX IF NOT EXISTS idx_request_logs_security_lookup ON request_logs(project_id, status_code, prompt_injection_score);
