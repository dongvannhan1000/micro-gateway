-- Migration: Add cron_logs table for tracking scheduled job executions
-- This provides an audit trail for cron job executions

-- Create cron_logs table
CREATE TABLE IF NOT EXISTS cron_logs (
    id TEXT PRIMARY KEY,
    job_name TEXT NOT NULL,
    status TEXT CHECK(status IN ('success', 'failure')) NOT NULL,
    keys_reset INTEGER DEFAULT 0,
    error_message TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for querying recent cron executions
CREATE INDEX IF NOT EXISTS idx_cron_logs_executed_at ON cron_logs(executed_at DESC);
