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
  -- OpenAI Models
  (HEX(RANDOMBLOB(16)), 'openai', 'gpt-4o', 'chat', 2.5, 10.0, 128000, 4096),
  (HEX(RANDOMBLOB(16)), 'openai', 'gpt-4o-mini', 'chat', 0.15, 0.6, 128000, 4096),
  (HEX(RANDOMBLOB(16)), 'openai', 'gpt-4-turbo', 'chat', 10.0, 30.0, 128000, 4096),
  (HEX(RANDOMBLOB(16)), 'openai', 'gpt-4', 'chat', 30.0, 60.0, 8192, 4096),
  (HEX(RANDOMBLOB(16)), 'openai', 'gpt-3.5-turbo', 'chat', 0.5, 1.5, 16385, 4096),
  (HEX(RANDOMBLOB(16)), 'openai', 'o1-preview', 'chat', 15.0, 60.0, 128000, 32768),
  (HEX(RANDOMBLOB(16)), 'openai', 'o1-mini', 'chat', 3.0, 12.0, 128000, 65536),

  -- Anthropic Models
  (HEX(RANDOMBLOB(16)), 'anthropic', 'claude-3-opus-20240229', 'chat', 15.0, 75.0, 200000, 4096),
  (HEX(RANDOMBLOB(16)), 'anthropic', 'claude-3-sonnet-20240229', 'chat', 3.0, 15.0, 200000, 4096),
  (HEX(RANDOMBLOB(16)), 'anthropic', 'claude-3-haiku-20240307', 'chat', 0.25, 1.25, 200000, 4096),
  (HEX(RANDOMBLOB(16)), 'anthropic', 'claude-3-5-sonnet-20241022', 'chat', 3.0, 15.0, 200000, 8192),
  (HEX(RANDOMBLOB(16)), 'anthropic', 'claude-3-5-haiku-20241022', 'chat', 0.8, 4.0, 200000, 8192),

  -- Google Models
  (HEX(RANDOMBLOB(16)), 'google', 'gemini-1.5-flash', 'chat', 0.075, 0.3, 1000000, 8192),
  (HEX(RANDOMBLOB(16)), 'google', 'gemini-1.5-pro', 'chat', 3.5, 10.5, 2000000, 8192),
  (HEX(RANDOMBLOB(16)), 'google', 'gemini-2.0-flash', 'chat', 0.1, 0.4, 1000000, 8192),
  (HEX(RANDOMBLOB(16)), 'google', 'gemini-pro', 'chat', 0.5, 1.5, 91728, 2048),
  (HEX(RANDOMBLOB(16)), 'google', 'gemini-pro-vision', 'chat', 0.5, 1.5, 65536, 2048),

  -- DeepSeek Models
  (HEX(RANDOMBLOB(16)), 'deepseek', 'deepseek-chat', 'chat', 0.14, 0.28, 128000, 4096),
  (HEX(RANDOMBLOB(16)), 'deepseek', 'deepseek-coder', 'chat', 0.14, 0.28, 128000, 4096);
