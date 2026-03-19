CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    project_id TEXT NOT NULL,
    api_key_id TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    duration INTEGER NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_metrics_project_id ON metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_status ON metrics(status);
