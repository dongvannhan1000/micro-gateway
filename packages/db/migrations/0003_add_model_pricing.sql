-- Migration: Add model_pricing table for dynamic pricing management
CREATE TABLE model_pricing (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, 
  model_id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL, -- 'chat', 'embedding', 'image_generation'
  input_per_1m REAL DEFAULT 0,
  output_per_1m REAL DEFAULT 0,
  output_per_image REAL DEFAULT 0,
  max_input_tokens INTEGER,
  max_output_tokens INTEGER,
  is_custom INTEGER DEFAULT 0, -- 1 if manually overridden
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial data for core models
INSERT INTO model_pricing (id, provider, model_id, mode, input_per_1m, output_per_1m, max_input_tokens, max_output_tokens)
VALUES 
  (HEX(RANDOMBLOB(16)), 'openai', 'gpt-4o', 'chat', 2.5, 10.0, 128000, 4096),
  (HEX(RANDOMBLOB(16)), 'openai', 'gpt-4o-mini', 'chat', 0.15, 0.6, 128000, 4096),
  (HEX(RANDOMBLOB(16)), 'google', 'gemini-1.5-flash', 'chat', 0.075, 0.3, 1000000, 8192),
  (HEX(RANDOMBLOB(16)), 'google', 'gemini-1.5-pro', 'chat', 3.5, 10.5, 2000000, 8192),
  (HEX(RANDOMBLOB(16)), 'google', 'gemini-2.0-flash', 'chat', 0.1, 0.4, 1000000, 8192);
