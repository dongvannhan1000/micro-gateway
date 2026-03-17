-- Migration: Create users table in D1
-- Purpose: Create users table synced with Supabase Auth
-- This must run before all other migrations

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,  -- Supabase Auth user ID
    email TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
