# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production-grade load handling and observability to Micro-Security Gateway while staying within Cloudflare free tier ($0/month).

**Architecture:** Cloudflare-native approach with circuit breaker pattern, request timeouts, bulkhead concurrency limits, metrics collection with correlation IDs, structured logging, health monitoring, and admin dashboard. All optimizations to stay within free tier: D1 for counters, in-memory caching, aggressive KV reduction.

**Tech Stack:** Cloudflare Workers, Hono.js, TypeScript, Cloudflare D1, Cloudflare KV, Cloudflare Cron Triggers, Resend (email alerts)

**Spec Reference:** `docs/superpowers/specs/2025-03-19-production-readiness-design.md`

---

## File Structure Overview

```
apps/gateway-api/src/
├── middleware/
│   ├── circuit-breaker.ts      // NEW - Circuit breaker logic
│   ├── request-timeout.ts      // NEW - Request timeout handler
│   ├── bulkhead.ts             // NEW - Concurrent request limiter (D1-based)
│   ├── admin-auth.ts           // NEW - Admin authentication (email-based)
│   └── metrics-collector.ts    // NEW - Metrics collection middleware
├── utils/
│   ├── retry.ts                // NEW - Retry logic with exponential backoff
│   ├── correlation-id.ts       // NEW - Request correlation ID generator
│   └── logger.ts               // NEW - Structured JSON logger
├── monitoring/
│   ├── metrics.ts              // NEW - Metrics storage and aggregation
│   └── alerts.ts               // NEW - Alerting logic via Resend
├── cron/
│   └── health-check.ts         // NEW - Provider health checks (Cron Trigger)
├── admin/
│   ├── metrics-api.ts          // NEW - Metrics endpoint for dashboard
│   └── dashboard.ts            // NEW - Admin dashboard HTML
└── index.ts                    // MODIFY - Update middleware order

packages/db/
├── migrations/
│   └── 002_add_tier_columns.sql  // NEW - Add tier and concurrent_limit
└── src/
    └── types.ts                 // MODIFY - Add tier field to Project
```

---

## Task 1: Database Migration - Add Tier System

**Files:**
- Create: `packages/db/migrations/002_add_tier_columns.sql`
- Modify: `packages/db/src/types.ts`

**Purpose:** Add tier system for bulkhead concurrent request limits (Free: 5, Pro: 10, Custom: 20)

- [ ] **Step 1: Create migration file**

```sql
-- packages/db/migrations/002_add_tier_columns.sql

-- Add tier column to projects table
ALTER TABLE projects ADD COLUMN tier TEXT DEFAULT 'free' NOT NULL;

-- Add concurrent_limit column to projects table
ALTER TABLE projects ADD COLUMN concurrent_limit INTEGER DEFAULT 5 NOT NULL;

-- Create index on tier for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_tier ON projects(tier);

-- Update existing projects to have explicit values
UPDATE projects SET tier = 'free' WHERE tier IS NULL OR tier = 'default';
UPDATE projects SET concurrent_limit = 5 WHERE concurrent_limit IS NULL OR concurrent_limit = 0;
```

- [ ] **Step 2: Run migration locally**

```bash
cd packages/db
npm run migrate:local
```

Expected: Migration applies successfully, projects table now has `tier` and `concurrent_limit` columns

- [ ] **Step 3: Update Project type definition**

Find the `Project` interface in `packages/db/src/types.ts` and add:

```typescript
export interface Project {
    id: string;
    name: string;
    description: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
    total_requests: number;
    total_cost: number;
    avg_latency: number;
    tier: 'free' | 'pro' | 'custom';      // NEW
    concurrent_limit: number;             // NEW
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/migrations/002_add_tier_columns.sql packages/db/src/types.ts
git commit -m "feat: add tier system for bulkhead concurrent limits

- Add tier column (free/pro/custom)
- Add concurrent_limit column (5/10/20)
- Default existing projects to free tier (5 concurrent)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Core Utilities - Correlation ID Generator

**Files:**
- Create: `apps/gateway-api/src/utils/correlation-id.ts`
- Test: `apps/gateway-api/src/utils/correlation-id.test.ts`

**Purpose:** Generate unique request IDs for tracing

- [ ] **Step 1: Write the failing test**

```typescript
// apps/gateway-api/src/utils/correlation-id.test.ts

import { describe, it, expect } from 'vitest';
import { generateCorrelationId, getCorrelationId } from './correlation-id';

describe('Correlation ID', () => {
    it('should generate a unique UUID', () => {
        const id1 = generateCorrelationId();
        const id2 = generateCorrelationId();

        expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(id1).not.toBe(id2);
    });

    it('should return existing correlation ID from context', () => {
        const mockContext = new Map();
        const testId = 'test-correlation-id-123';
        mockContext.set('correlationId', testId);

        const id = getCorrelationId(mockContext);
        expect(id).toBe(testId);
    });

    it('should generate new ID if none exists in context', () => {
        const mockContext = new Map();
        const id = getCorrelationId(mockContext);

        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(mockContext.get('correlationId')).toBe(id);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/gateway-api
npm test -- correlation-id.test.ts
```

Expected: FAIL with "Cannot find module './correlation-id'"

- [ ] **Step 3: Write implementation**

```typescript
// apps/gateway-api/src/utils/correlation-id.ts

import type { Context } from 'hono';

/**
 * Generate a unique correlation ID for request tracing
 * Uses UUID v4 format
 */
export function generateCorrelationId(): string {
    return crypto.randomUUID();
}

/**
 * Get or create correlation ID from Hono context
 * Stores in context.get('correlationId') for middleware access
 */
export function getCorrelationId(context: Map<string, unknown> | Context): string {
    // Handle Hono Context
    if ('get' in context && typeof context.get === 'function') {
        let id = context.get<string>('correlationId');
        if (!id) {
            id = generateCorrelationId();
            context.set('correlationId', id);
        }
        return id;
    }

    // Handle plain Map
    let id = context.get('correlationId') as string | undefined;
    if (!id) {
        id = generateCorrelationId();
        context.set('correlationId', id);
    }
    return id;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/gateway-api
npm test -- correlation-id.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/gateway-api/src/utils/correlation-id.ts apps/gateway-api/src/utils/correlation-id.test.ts
git commit -m "feat: add correlation ID generator for request tracing

- Generate unique UUIDs for each request
- Store in Hono context for middleware access
- Enable end-to-end request tracing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Core Utilities - Structured Logger

**Files:**
- Create: `apps/gateway-api/src/utils/logger.ts`
- Test: `apps/gateway-api/src/utils/logger.test.ts`

**Purpose:** Structured JSON logging with correlation IDs

- [ ] **Step 1: Write the failing test**

```typescript
// apps/gateway-api/src/utils/logger.test.ts

import { describe, it, expect, vi } from 'vitest';
import { logger } from './logger';

describe('Logger', () => {
    it('should log info with correlation ID', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info({
            correlationId: 'test-id-123',
            event: 'test_event',
            message: 'Test message'
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('"correlationId":"test-id-123"')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('"event":"test_event"')
        );

        consoleSpy.mockRestore();
    });

    it('should log error with error details', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const error = new Error('Test error');
        logger.error({
            correlationId: 'test-id-123',
            error: error.message,
            stack: error.stack
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('"error":"Test error"')
        );

        consoleSpy.mockRestore();
    });

    it('should include timestamp in logs', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.info({
            correlationId: 'test-id-123',
            event: 'test_event'
        });

        const loggedData = consoleSpy.mock.calls[0][0];
        expect(loggedData).toHaveProperty('timestamp');

        consoleSpy.mockRestore();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/gateway-api
npm test -- logger.test.ts
```

Expected: FAIL with "Cannot find module './logger'"

- [ ] **Step 3: Write implementation**

```typescript
// apps/gateway-api/src/utils/logger.ts

export interface LogEntry {
    correlationId: string;
    timestamp?: string;
    level?: 'info' | 'error' | 'warn';
    event?: string;
    [key: string]: unknown;
}

/**
 * Structured JSON logger for Cloudflare Workers
 * Outputs JSON logs with correlation IDs for request tracing
 */
export const logger = {
    info(entry: LogEntry): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'info' as const,
            ...entry
        };
        console.log(JSON.stringify(logEntry));
    },

    error(entry: LogEntry): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'error' as const,
            ...entry
        };
        console.error(JSON.stringify(logEntry));
    },

    warn(entry: LogEntry): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'warn' as const,
            ...entry
        };
        console.warn(JSON.stringify(logEntry));
    }
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/gateway-api
npm test -- logger.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/gateway-api/src/utils/logger.ts apps/gateway-api/src/utils/logger.test.ts
git commit -m "feat: add structured JSON logger with correlation IDs

- JSON-formatted logs for Cloudflare Workers
- Automatic timestamp inclusion
- Support for info, error, warn levels
- Correlation ID tracking for request tracing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Core Utilities - Retry Logic with Exponential Backoff

**Files:**
- Create: `apps/gateway-api/src/utils/retry.ts`
- Test: `apps/gateway-api/src/utils/retry.test.ts`

**Purpose:** Retry transient failures with exponential backoff and jitter

- [ ] **Step 1: Write the failing test**

```typescript
// apps/gateway-api/src/utils/retry.test.ts

import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff } from './retry';

describe('Retry Logic', () => {
    it('should succeed on first try', async () => {
        const mockFn = vi.fn().mockResolvedValue('success');

        const result = await retryWithBackoff(mockFn, { maxRetries: 3 });

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
        const mockFn = vi.fn()
            .mockRejectedValueOnce(new Error('timeout'))
            .mockResolvedValue('success');

        const result = await retryWithBackoff(mockFn, {
            maxRetries: 3,
            initialDelay: 10
        });

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should give up after max retries', async () => {
        const mockFn = vi.fn().mockRejectedValue(new Error('timeout'));

        await expect(
            retryWithBackoff(mockFn, { maxRetries: 2, initialDelay: 10 })
        ).rejects.toThrow('timeout');

        expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should add jitter to delays', async () => {
        const mockFn = vi.fn()
            .mockRejectedValueOnce(new Error('timeout'))
            .mockRejectedValueOnce(new Error('timeout'))
            .mockResolvedValue('success');

        const start = Date.now();
        await retryWithBackoff(mockFn, {
            maxRetries: 3,
            initialDelay: 50,
            jitter: true
        });
        const duration = Date.now() - start;

        // Should be > 50ms (initial delay) but not exactly 50ms (jitter)
        expect(duration).toBeGreaterThan(40);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/gateway-api
npm test -- retry.test.ts
```

Expected: FAIL with "Cannot find module './retry'"

- [ ] **Step 3: Write implementation**

```typescript
// apps/gateway-api/src/utils/retry.ts

export interface RetryOptions {
    maxRetries: number;
    initialDelay: number;  // milliseconds
    maxDelay?: number;     // max delay cap
    jitter?: boolean;      // add random jitter to prevent thundering herd
}

/**
 * Retry a function with exponential backoff and optional jitter
 * Used for retrying transient failures (timeouts, 5xx errors)
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions
): Promise<T> {
    const { maxRetries, initialDelay, maxDelay = 30000, jitter = true } = options;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Don't delay after the last attempt
            if (attempt < maxRetries) {
                // Calculate exponential backoff: initialDelay * 2^attempt
                const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

                // Add jitter if enabled (±25% random variation)
                const finalDelay = jitter
                    ? delay * (0.75 + Math.random() * 0.5)
                    : delay;

                await new Promise(resolve => setTimeout(resolve, finalDelay));
            }
        }
    }

    throw lastError;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/gateway-api
npm test -- retry.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/gateway-api/src/utils/retry.ts apps/gateway-api/src/utils/retry.test.ts
git commit -m "feat: add retry logic with exponential backoff and jitter

- Retry transient failures up to maxRetries times
- Exponential backoff: initialDelay * 2^attempt
- Optional jitter to prevent thundering herd
- Configurable max delay cap

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Middleware - Correlation ID

**Files:**
- Create: `apps/gateway-api/src/middleware/correlation-id.ts`
- Modify: `apps/gateway-api/src/index.ts`

**Purpose:** Generate and attach correlation ID to every request (MUST BE FIRST middleware)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/gateway-api/src/middleware/correlation-id.test.ts

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { correlationId } from './correlation-id';

describe('Correlation ID Middleware', () => {
    it('should generate correlation ID for new request', async () => {
        const app = new Hono();
        app.use('*', correlationId);

        app.get('/test', (c) => {
            const id = c.get('correlationId');
            return c.json({ correlationId: id });
        });

        const res = await app.request('/test');
        const data = await res.json() as { correlationId: string };

        expect(data.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should include correlation ID in response header', async () => {
        const app = new Hono();
        app.use('*', correlationId);

        app.get('/test', (c) => c.text('OK'));

        const res = await app.request('/test');

        expect(res.headers.get('X-Correlation-ID')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/gateway-api
npm test -- correlation-id.test.ts
```

Expected: FAIL with "Cannot find module './correlation-id'"

- [ ] **Step 3: Write implementation**

```typescript
// apps/gateway-api/src/middleware/correlation-id.ts

import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';
import { getCorrelationId } from '../utils/correlation-id';

/**
 * Correlation ID middleware - MUST BE FIRST
 * Generates unique ID for each request and adds to context + response header
 * Enables end-to-end request tracing across all middleware
 */
export const correlationId: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
    // Generate or get correlation ID
    const id = getCorrelationId(c);

    // Store in context for other middleware
    c.set('correlationId', id);

    // Add to response header for debugging
    c.header('X-Correlation-ID', id);

    await next();
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/gateway-api
npm test -- correlation-id.test.ts
```

Expected: PASS

- [ ] **Step 5: Update index.ts to add correlation ID middleware FIRST**

Find the startup validation middleware in `apps/gateway-api/src/index.ts` (around line 17) and add correlation ID middleware AFTER it:

```typescript
// After startup validation, BEFORE injectDatabase
app.use('*', correlationId); // NEW - MUST BE FIRST for tracing
app.use('*', injectDatabase);
```

- [ ] **Step 6: Test locally**

```bash
cd apps/gateway-api
npm run dev
```

Then test:
```bash
curl -v http://localhost:8787/v1/models
```

Expected: Response header includes `X-Correlation-ID: <uuid>`

- [ ] **Step 7: Commit**

```bash
git add apps/gateway-api/src/middleware/correlation-id.ts apps/gateway-api/src/middleware/correlation-id.test.ts apps/gateway-api/src/index.ts
git commit -m "feat: add correlation ID middleware (first in chain)

- Generate unique UUID for each request
- Store in Hono context for middleware access
- Add X-Correlation-ID response header
- MUST BE FIRST middleware for complete tracing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Middleware - Metrics Collector

**Files:**
- Create: `apps/gateway-api/src/middleware/metrics-collector.ts`
- Create: `apps/gateway-api/src/monitoring/metrics.ts` (metrics storage)
- Test: `apps/gateway-api/src/middleware/metrics-collector.test.ts`

**Purpose:** Collect performance metrics for every request

- [ ] **Step 1: Create metrics storage module**

```typescript
// apps/gateway-api/src/monitoring/metrics.ts

export interface RequestMetrics {
    requestId: string;
    timestamp: string;
    projectId: string;
    apiKeyId: string;
    provider?: string;
    model?: string;
    duration: number;
    status: 'success' | 'error';
    error?: string;
    tokens?: { input: number; output: number };
    cost?: number;
}

/**
 * Store metrics in D1 database for long-term retention
 * Sampling: Only store 10% of requests to stay within free tier
 */
export async function storeMetrics(
    env: Env,
    metrics: RequestMetrics
): Promise<void> {
    // Sample 10% of requests to reduce D1 usage
    if (Math.random() > 0.1) {
        return;
    }

    try {
        await env.DB.prepare(`
            INSERT INTO metrics (request_id, timestamp, project_id, api_key_id, provider, model, duration, status, error, input_tokens, output_tokens, cost)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            metrics.requestId,
            metrics.timestamp,
            metrics.projectId,
            metrics.apiKeyId,
            metrics.provider || null,
            metrics.model || null,
            metrics.duration,
            metrics.status,
            metrics.error || null,
            metrics.tokens?.input || null,
            metrics.tokens?.output || null,
            metrics.cost || null
        ).run();
    } catch (error) {
        // Fail gracefully - don't block requests if metrics storage fails
        console.error('[Metrics] Failed to store metrics:', error);
    }
}

/**
 * Get aggregated metrics for a project
 */
export async function getProjectMetrics(
    env: Env,
    projectId: string,
    hours: number = 24
): Promise<{
    totalRequests: number;
    avgDuration: number;
    errorRate: number;
    totalCost: number;
}> {
    try {
        const result = await env.DB.prepare(`
            SELECT
                COUNT(*) as total_requests,
                AVG(duration) as avg_duration,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
                SUM(cost) as total_cost
            FROM metrics
            WHERE project_id = ?
            AND timestamp > datetime('now', '-' || ? || ' hours')
        `).bind(projectId, hours).first();

        return {
            totalRequests: result?.total_requests as number || 0,
            avgDuration: result?.avg_duration as number || 0,
            errorRate: result?.total_requests > 0
                ? (result?.errors as number || 0) / (result?.total_requests as number)
                : 0,
            totalCost: result?.total_cost as number || 0
        };
    } catch (error) {
        console.error('[Metrics] Failed to get project metrics:', error);
        return {
            totalRequests: 0,
            avgDuration: 0,
            errorRate: 0,
            totalCost: 0
        };
    }
}
```

- [ ] **Step 2: Create metrics table migration**

```sql
-- packages/db/migrations/003_create_metrics_table.sql

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

-- Purge old metrics after 30 days to save space
-- (Will be done via cron job in future)
```

Run migration:
```bash
cd packages/db
npm run migrate:local
```

- [ ] **Step 3: Write the failing test**

```typescript
// apps/gateway-api/src/middleware/metrics-collector.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { metricsCollector } from './metrics-collector';
import { Env } from '../types';

describe('Metrics Collector Middleware', () => {
    let mockEnv: Env;

    beforeEach(() => {
        mockEnv = {
            DB: {
                prepare: vi.fn().mockReturnThis(),
                bind: vi.fn().mockReturnThis(),
                run: vi.fn().mockResolvedValue({ success: true }),
                first: vi.fn()
            }
        } as unknown as Env;
    });

    it('should collect metrics on successful request', async () => {
        const app = new Hono<{ Bindings: Env }>();
        app.use('*', metricsCollector);

        app.get('/test', (c) => {
            c.set('project', { id: 'proj-123' });
            c.set('apiKeyId', 'key-123');
            return c.text('OK');
        });

        const res = await app.request('/test', {}, mockEnv);

        expect(res.status).toBe(200);
        expect(mockEnv.DB.prepare).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
        const mockEnvFail = {
            DB: {
                prepare: vi.fn().mockImplementation(() => {
                    throw new Error('DB error');
                })
            }
        } as unknown as Env;

        const app = new Hono<{ Bindings: Env }>();
        app.use('*', metricsCollector);

        app.get('/test', (c) => c.text('OK'));

        const res = await app.request('/test', {}, mockEnvFail);

        // Should not block request even if metrics collection fails
        expect(res.status).toBe(200);
    });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd apps/gateway-api
npm test -- metrics-collector.test.ts
```

Expected: FAIL with "Cannot find module './metrics-collector'"

- [ ] **Step 5: Write implementation**

```typescript
// apps/gateway-api/src/middleware/metrics-collector.ts

import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';
import { storeMetrics } from '../monitoring/metrics';

/**
 * Metrics collector middleware
 * Tracks request duration, status, errors for monitoring and debugging
 * Samples 10% of requests to stay within D1 free tier limits
 */
export const metricsCollector: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
    const startTime = Date.now();
    const requestId = c.get('correlationId');
    const project = c.get('project');
    const apiKeyId = c.get('apiKeyId');

    // Track request start
    let status: 'success' | 'error' = 'success';
    let error: string | undefined;

    try {
        await next();
        return; // Let response proceed normally
    } catch (err) {
        status = 'error';
        error = err instanceof Error ? err.message : String(err);
        throw err; // Re-throw to let error handlers deal with it
    } finally {
        // Calculate duration
        const duration = Date.now() - startTime;

        // Only collect metrics if we have a project
        if (project && apiKeyId && requestId) {
            const provider = c.get('provider');
            const model = c.get('model');

            // Store metrics asynchronously (don't block response)
            c.executionCtx.waitUntil(
                storeMetrics(c.env, {
                    requestId,
                    timestamp: new Date().toISOString(),
                    projectId: project.id,
                    apiKeyId,
                    provider,
                    model,
                    duration,
                    status,
                    error
                })
            );
        }
    }
};
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd apps/gateway-api
npm test -- metrics-collector.test.ts
```

Expected: PASS

- [ ] **Step 7: Update index.ts to add metrics collector**

Find the middleware chain in `apps/gateway-api/src/index.ts` and add AFTER correlation ID:

```typescript
app.use('*', correlationId);
app.use('*', metricsCollector); // NEW - Track all requests
app.use('*', injectDatabase);
```

- [ ] **Step 8: Commit**

```bash
git add apps/gateway-api/src/middleware/metrics-collector.ts apps/gateway-api/src/middleware/metrics-collector.test.ts apps/gateway-api/src/monitoring/metrics.ts packages/db/migrations/003_create_metrics_table.sql apps/gateway-api/src/index.ts
git commit -m "feat: add metrics collector with 10% sampling

- Track request duration, status, errors
- Sample 10% of requests to stay within D1 free tier
- Store metrics in database for long-term retention
- Graceful degradation if DB fails
- Support project-level metrics aggregation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Middleware - Bulkhead (D1-based Concurrency Limits)

**Files:**
- Create: `apps/gateway-api/src/middleware/bulkhead.ts`
- Test: `apps/gateway-api/src/middleware/bulkhead.test.ts`

**Purpose:** Limit concurrent requests per project using D1 (not KV) for free tier compliance

- [ ] **Step 1: Write the failing test**

```typescript
// apps/gateway-api/src/middleware/bulkhead.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { bulkhead } from './bulkhead';
import { Env } from '../types';
import type { Project } from '@ms-gateway/db';

describe('Bulkhead Middleware', () => {
    let mockEnv: Env;
    let mockProject: Project;

    beforeEach(() => {
        mockProject = {
            id: 'proj-123',
            name: 'Test Project',
            description: 'Test',
            user_id: 'user-123',
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
            total_requests: 0,
            total_cost: 0,
            avg_latency: 0,
            tier: 'free',
            concurrent_limit: 5
        };

        mockEnv = {
            DB: {
                prepare: vi.fn().mockReturnThis(),
                bind: vi.fn().mockReturnThis(),
                run: vi.fn().mockResolvedValue({ success: true }),
                first: vi.fn().mockResolvedValue({ concurrent_count: 3 })
            }
        } as unknown as Env;
    });

    it('should allow requests under concurrent limit', async () => {
        const app = new Hono<{ Bindings: Env; Variables: any }>();
        app.use('*', bulkhead);

        app.get('/test', (c) => {
            c.set('project', mockProject);
            return c.text('OK');
        });

        const res = await app.request('/test', {}, mockEnv);

        expect(res.status).toBe(200);
    });

    it('should block requests over concurrent limit', async () => {
        // Mock DB to return concurrent count at limit
        vi.mocked(mockEnv.DB.first).mockResolvedValue({ concurrent_count: 5 });

        const app = new Hono<{ Bindings: Env; Variables: any }>();
        app.use('*', bulkhead);

        app.get('/test', (c) => {
            c.set('project', mockProject);
            return c.text('OK');
        });

        const res = await app.request('/test', {}, mockEnv);

        expect(res.status).toBe(429);
        const data = await res.json();
        expect(data.error).toContain('Too many concurrent requests');
    });

    it('should decrement counter after request completes', async () => {
        const runSpy = vi.fn().mockResolvedValue({ success: true });

        mockEnv.DB = {
            prepare: vi.fn().mockReturnThis(),
            bind: vi.fn().mockReturnThis(),
            run: runSpy,
            first: vi.fn().mockResolvedValue({ concurrent_count: 3 })
        } as any;

        const app = new Hono<{ Bindings: Env; Variables: any }>();
        app.use('*', bulkhead);

        app.get('/test', (c) => {
            c.set('project', mockProject);
            return c.text('OK');
        });

        await app.request('/test', {}, mockEnv);

        // Should have called run() twice (increment and decrement)
        expect(runSpy).toHaveBeenCalledTimes(2);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/gateway-api
npm test -- bulkhead.test.ts
```

Expected: FAIL with "Cannot find module './bulkhead'"

- [ ] **Step 3: Write implementation**

```typescript
// apps/gateway-api/src/middleware/bulkhead.ts

import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';

/**
 * Bulkhead middleware - Limit concurrent requests per project
 * Uses D1 instead of KV for free tier compliance (25M reads vs 100K)
 * Per-tier limits: Free=5, Pro=10, Custom=20
 */
export const bulkhead: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
    const project = c.get('project');

    // Skip bulkhead if no project (shouldn't happen in normal flow)
    if (!project) {
        await next();
        return;
    }

    const limit = project.concurrent_limit || 5; // Default to free tier
    const projectId = project.id;

    try {
        // Check current concurrent count
        const result = await c.env.DB.prepare(`
            SELECT concurrent_count FROM projects WHERE id = ?
        `).bind(projectId).first() as { concurrent_count: number } | null;

        const currentCount = result?.concurrent_count || 0;

        // Check if over limit
        if (currentCount >= limit) {
            return c.json({
                error: {
                    message: `Too many concurrent requests. Limit: ${limit}, Current: ${currentCount}. Please try again.`,
                    type: 'concurrent_limit_exceeded',
                    code: 'too_many_requests'
                }
            }, 429, {
                'Retry-After': '5',
                'X-Concurrent-Limit': limit.toString(),
                'X-Concurrent-Current': currentCount.toString()
            });
        }

        // Increment counter
        await c.env.DB.prepare(`
            UPDATE projects SET concurrent_count = concurrent_count + 1 WHERE id = ?
        `).bind(projectId).run();

        // Add cleanup hook to decrement counter
        c.executionCtx.waitUntil(
            (async () => {
                try {
                    await c.env.DB.prepare(`
                        UPDATE projects SET concurrent_count = concurrent_count - 1 WHERE id = ?
                    `).bind(projectId).run();
                } catch (error) {
                    console.error('[Bulkhead] Failed to decrement counter:', error);
                }
            })()
        );

        await next();

    } catch (error) {
        console.error('[Bulkhead] Error:', error);
        // Fail open - don't block requests on DB errors
        await next();
    }
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/gateway-api
npm test -- bulkhead.test.ts
```

Expected: PASS

- [ ] **Step 5: Update gateway/index.ts to add bulkhead middleware**

Find the gateway router in `apps/gateway-api/src/gateway/index.ts` and add AFTER rateLimiter:

```typescript
gateway.use('*', gatewayKeyAuth);
gateway.use('*', rateLimiter);
gateway.use('*', bulkhead); // NEW - Limit concurrent requests
gateway.use('*', piiScrubber);
```

- [ ] **Step 6: Commit**

```bash
git add apps/gateway-api/src/middleware/bulkhead.ts apps/gateway-api/src/middleware/bulkhead.test.ts apps/gateway-api/src/gateway/index.ts
git commit -m "feat: add bulkhead middleware with D1-based concurrency limits

- Limit concurrent requests per project (Free: 5, Pro: 10, Custom: 20)
- Use D1 instead of KV for free tier compliance (25M vs 100K reads)
- Automatic counter cleanup on request completion
- Return 429 with retry info when over limit
- Fail open on DB errors to not block requests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Middleware - Request Timeout

**Files:**
- Create: `apps/gateway-api/src/middleware/request-timeout.ts`
- Test: `apps/gateway-api/src/middleware/request-timeout.test.ts`

**Purpose:** Prevent requests from hanging indefinitely (30s max)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/gateway-api/src/middleware/request-timeout.test.ts

import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { requestTimeout } from './request-timeout';

describe('Request Timeout Middleware', () => {
    it('should set timeout deadline in context', async () => {
        const app = new Hono();
        app.use('*', requestTimeout({ timeout: 5000 }));

        app.get('/test', (c) => {
            const deadline = c.get('timeoutDeadline');
            expect(deadline).toBeDefined();
            expect(deadline).toBeInstanceOf(Date);
            return c.text('OK');
        });

        const res = await app.request('/test');

        expect(res.status).toBe(200);
    });

    it('should use default 30s timeout if not specified', async () => {
        const app = new Hono();
        app.use('*', requestTimeout());

        app.get('/test', (c) => {
            const deadline = c.get('timeoutDeadline');
            const now = new Date();
            const diff = deadline.getTime() - now.getTime();

            // Should be approximately 30 seconds in the future
            expect(diff).toBeGreaterThan(29000); // ~30s
            expect(diff).toBeLessThan(31000);

            return c.text('OK');
        });

        const res = await app.request('/test');

        expect(res.status).toBe(200);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/gateway-api
npm test -- request-timeout.test.ts
```

Expected: FAIL with "Cannot find module './request-timeout'"

- [ ] **Step 3: Write implementation**

```typescript
// apps/gateway-api/src/middleware/request-timeout.ts

import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';

interface TimeoutOptions {
    timeout?: number;  // milliseconds, default 30000 (30s)
}

/**
 * Request timeout middleware
 * Sets a deadline for request completion to prevent indefinite hangs
 * Proxy handler should check deadline and abort if exceeded
 */
export const requestTimeout = (options: TimeoutOptions = {}): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> => {
    const timeout = options.timeout || 30000; // 30 seconds default

    return async (c, next) => {
        // Calculate deadline
        const deadline = new Date(Date.now() + timeout);

        // Store in context for proxy handler to check
        c.set('timeoutDeadline', deadline);
        c.set('timeoutMs', timeout);

        await next();
    };
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/gateway-api
npm test -- request-timeout.test.ts
```

Expected: PASS

- [ ] **Step 5: Update gateway/index.ts to add timeout middleware**

Find the gateway router in `apps/gateway-api/src/gateway/index.ts` and add AFTER bulkhead:

```typescript
gateway.use('*', gatewayKeyAuth);
gateway.use('*', rateLimiter);
gateway.use('*', bulkhead);
gateway.use('*', requestTimeout({ timeout: 30000 })); // NEW - 30s max
gateway.use('*', piiScrubber);
```

- [ ] **Step 6: Update proxy handler to check timeout**

Find the proxy handler in `apps/gateway-api/src/gateway/proxy.ts` and add timeout check before fetch:

```typescript
// Check if request has exceeded timeout deadline
const deadline = c.get('timeoutDeadline');
if (deadline && new Date() > deadline) {
    return c.json({
        error: {
            message: 'Request timeout - exceeded maximum time limit',
            type: 'timeout',
            code: 'request_timeout'
        }
    }, 504, {
        'X-Timeout-Ms': c.get('timeoutMs')?.toString() || '30000'
    });
}

// Existing fetch code...
const response = await fetch(providerUrl, {
    ...options,
    signal: AbortSignal.timeout(c.get('timeoutMs') || 30000)
});
```

- [ ] **Step 7: Commit**

```bash
git add apps/gateway-api/src/middleware/request-timeout.ts apps/gateway-api/src/middleware/request-timeout.test.ts apps/gateway-api/src/gateway/index.ts
git commit -m "feat: add request timeout middleware (30s max)

- Set 30s deadline for all requests
- Store deadline in context for proxy handler
- Proxy handler aborts fetch if deadline exceeded
- Return 504 Gateway Timeout on expiration
- Configurable timeout per provider if needed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Middleware - Circuit Breaker

**Files:**
- Create: `apps/gateway-api/src/middleware/circuit-breaker.ts`
- Test: `apps/gateway-api/src/middleware/circuit-breaker.test.ts`

**Purpose:** Prevent cascading failures from unhealthy AI providers (global per provider, in-memory cache)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/gateway-api/src/middleware/circuit-breaker.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { circuitBreaker } from './circuit-breaker';
import { Env } from '../types';

describe('Circuit Breaker Middleware', () => {
    let mockEnv: Env;

    beforeEach(() => {
        mockEnv = {
            CIRCUIT_BREAKER_KV: {
                get: vi.fn(),
                put: vi.fn()
            }
        } as any;

        // Reset in-memory cache
        globalThis.circuitBreakerCache = {};
    });

    it('should allow requests when circuit is CLOSED', async () => {
        vi.mocked(mockEnv.CIRCUIT_BREAKER_KV.get).mockResolvedValue('CLOSED');

        const app = new Hono<{ Bindings: Env; Variables: any }>();
        app.use('*', circuitBreaker);

        app.get('/test', (c) => {
            c.set('provider', 'openai');
            c.set('model', 'gpt-4o');
            return c.text('OK');
        });

        const res = await app.request('/test', {}, mockEnv);

        expect(res.status).toBe(200);
    });

    it('should block requests when circuit is OPEN', async () => {
        vi.mocked(mockEnv.CIRCUIT_BREAKER_KV.get).mockResolvedValue('OPEN');

        const app = new Hono<{ Bindings: Env; Variables: any }>();
        app.use('*', circuitBreaker);

        app.get('/test', (c) => {
            c.set('provider', 'openai');
            c.set('model', 'gpt-4o');
            return c.text('OK');
        });

        const res = await app.request('/test', {}, mockEnv);

        expect(res.status).toBe(503);
        const data = await res.json();
        expect(data.error.message).toContain('temporarily unavailable');
    });

    it('should use in-memory cache to reduce KV reads', async () => {
        // First call reads from KV
        vi.mocked(mockEnv.CIRCUIT_BREAKER_KV.get).mockResolvedValueOnce('CLOSED');

        const app = new Hono<{ Bindings: Env; Variables: any }>();
        app.use('*', circuitBreaker);

        app.get('/test', (c) => {
            c.set('provider', 'openai');
            c.set('model', 'gpt-4o');
            return c.text('OK');
        });

        // Make 10 requests
        for (let i = 0; i < 10; i++) {
            await app.request('/test', {}, mockEnv);
        }

        // Should only read from KV once (first request), then use cache
        expect(mockEnv.CIRCUIT_BREAKER_KV.get).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/gateway-api
npm test -- circuit-breaker.test.ts
```

Expected: FAIL with "Cannot find module './circuit-breaker'"

- [ ] **Step 3: Write implementation**

```typescript
// apps/gateway-api/src/middleware/circuit-breaker.ts

import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';

interface CircuitBreakerState {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failures: number;
    lastFailureTime?: number;
}

// In-memory cache to reduce KV reads (check KV every 100 requests)
const cache = new Map<string, { state: CircuitBreakerState; requestCount: number }>();
const CACHE_CHECK_INTERVAL = 100; // Check KV every 100 requests
const FAILURE_THRESHOLD = 0.5; // 50% failure rate
const TIME_WINDOW = 60000; // 60 seconds
const COOLDOWN_PERIOD = 30000; // 30 seconds

/**
 * Circuit breaker middleware - Prevent cascading failures from unhealthy providers
 * Global per provider (not per-project) to protect all projects
 * Uses in-memory cache to reduce KV operations (check every 100 requests)
 */
export const circuitBreaker: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
    const provider = c.get('provider');

    // Skip if no provider (shouldn't happen in normal flow)
    if (!provider) {
        await next();
        return;
    }

    try {
        // Get circuit breaker state from cache or KV
        const breakerState = await getBreakerState(provider, c.env);

        // Block requests if circuit is OPEN
        if (breakerState.state === 'OPEN') {
            return c.json({
                error: {
                    message: `Provider ${provider} is temporarily unavailable due to high error rate. Please try again later.`,
                    type: 'service_unavailable',
                    code: 'provider_unavailable',
                    details: {
                        provider,
                        circuitBreaker: 'OPEN',
                        retryAfter: Math.ceil(COOLDOWN_PERIOD / 1000)
                    }
                }
            }, 503, {
                'Retry-After': Math.ceil(COOLDOWN_PERIOD / 1000).toString(),
                'X-Circuit-Breaker': 'OPEN',
                'X-Provider': provider
            });
        }

        // Track request start time for failure rate calculation
        const startTime = Date.now();
        c.set('circuitBreakerStartTime', startTime);

        await next();

    } catch (error) {
        // Record failure
        await recordFailure(provider, c.env);

        // Re-throw error for other handlers to deal with
        throw error;
    }
};

/**
 * Get circuit breaker state from cache or KV
 */
async function getBreakerState(provider: string, env: Env): Promise<CircuitBreakerState> {
    const cached = cache.get(provider);

    // Use cache if available
    if (cached && cached.requestCount < CACHE_CHECK_INTERVAL) {
        cached.requestCount++;
        cache.set(provider, cached);
        return cached.state;
    }

    // Load from KV
    const kvKey = `breaker:${provider}:state`;
    const kvData = await env.CIRCUIT_BREAKER_KV.get(kvKey, 'json');

    const state: CircuitBreakerState = kvData as CircuitBreakerState || {
        state: 'CLOSED',
        failures: 0
    };

    // Update cache
    cache.set(provider, { state, requestCount: 1 });

    return state;
}

/**
 * Record a failure for a provider
 */
export async function recordFailure(provider: string, env: Env): Promise<void> {
    const kvKey = `breaker:${provider}:state`;
    const kvFailuresKey = `breaker:${provider}:failures`;

    try {
        // Get current state
        const currentState = await getBreakerState(provider, env);
        const now = Date.now();

        // Increment failure counter
        const newFailures = currentState.failures + 1;

        // Check if we should open the circuit
        if (currentState.state === 'CLOSED' && newFailures > FAILURE_THRESHOLD * 10) {
            // Open circuit after 50% failure rate (assuming we track 10 requests)
            const newState: CircuitBreakerState = {
                state: 'OPEN',
                failures: newFailures,
                lastFailureTime: now
            };

            await env.CIRCUIT_BREAKER_KV.put(kvKey, JSON.stringify(newState), {
                expirationTtl: COOLDOWN_PERIOD / 1000
            });

            // Clear cache
            cache.delete(provider);

            console.warn(`[CircuitBreaker] Opening circuit for ${provider} (${newFailures} failures)`);

        } else {
            // Update failure count
            await env.CIRCUIT_BREAKER_KV.put(kvFailuresKey, newFailures.toString(), {
                expirationTtl: TIME_WINDOW / 1000
            });
        }
    } catch (error) {
        console.error('[CircuitBreaker] Failed to record failure:', error);
    }
}

/**
 * Record a success for a provider (call after successful request)
 */
export async function recordSuccess(provider: string, env: Env): Promise<void> {
    const kvKey = `breaker:${provider}:state`;
    const kvFailuresKey = `breaker:${provider}:failures`;

    try {
        const currentState = await getBreakerState(provider, env);

        if (currentState.state === 'HALF_OPEN') {
            // Close circuit after successful test request
            const newState: CircuitBreakerState = {
                state: 'CLOSED',
                failures: 0
            };

            await env.CIRCUIT_BREAKER_KV.put(kvKey, JSON.stringify(newState));

            // Clear cache
            cache.delete(provider);

            console.log(`[CircuitBreaker] Closing circuit for ${provider} (recovered)`);
        } else {
            // Reset failure counter
            await env.CIRCUIT_BREAKER_KV.put(kvFailuresKey, '0', {
                expirationTtl: TIME_WINDOW / 1000
            });
        }
    } catch (error) {
        console.error('[CircuitBreaker] Failed to record success:', error);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/gateway-api
npm test -- circuit-breaker.test.ts
```

Expected: PASS

- [ ] **Step 5: Add CIRCUIT_BREAKER_KV binding to wrangler.toml**

Find the KV bindings section in `apps/gateway-api/wrangler.toml` and add:

```toml
[[kv_namespaces]]
binding = "CIRCUIT_BREAKER_KV"
id = "your-kv-namespace-id"  # Get this from: wrangler kv:namespace create
```

Create KV namespace:
```bash
cd apps/gateway-api
wrangler kv:namespace create "CIRCUIT_BREAKER_KV"
```

- [ ] **Step 6: Update gateway/index.ts to add circuit breaker middleware**

Find the gateway router in `apps/gateway-api/src/gateway/index.ts` and add BEFORE proxy handler:

```typescript
gateway.use('*', gatewayKeyAuth);
gateway.use('*', rateLimiter);
gateway.use('*', bulkhead);
gateway.use('*', requestTimeout({ timeout: 30000 }));
gateway.use('*', piiScrubber);
gateway.use('*', anomalyHandler);
gateway.use('*', contentFilter);
gateway.use('*', circuitBreaker); // NEW - Check provider health
gateway.post('/chat/completions', proxyHandler);
```

- [ ] **Step 7: Update proxy handler to record failures/success**

Find the proxy handler in `apps/gateway-api/src/gateway/proxy.ts` and add failure/success tracking:

```typescript
import { recordFailure, recordSuccess } from '../middleware/circuit-breaker';

// In the proxy handler, after fetch:
try {
    const response = await fetch(providerUrl, options);

    if (!response.ok) {
        // Record failure for circuit breaker
        await recordFailure(provider, c.env);
        throw new Error(`Provider returned ${response.status}`);
    }

    // Record success for circuit breaker
    await recordSuccess(provider, c.env);

    // ... rest of handler
} catch (error) {
    // Record failure for circuit breaker
    await recordFailure(provider, c.env);
    throw error;
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/gateway-api/src/middleware/circuit-breaker.ts apps/gateway-api/src/middleware/circuit-breaker.test.ts apps/gateway-api/src/gateway/index.ts apps/gateway-api/src/gateway/proxy.ts apps/gateway-api/wrangler.toml
git commit -m "feat: add circuit breaker middleware with in-memory caching

- Track provider health with failure rate threshold (50%)
- Global per provider (not per-project) to protect all projects
- In-memory cache reduces KV reads by 99% (check every 100 requests)
- States: CLOSED (normal), OPEN (blocking), HALF_OPEN (testing)
- Auto-recovery after 30s cooldown period
- Record failures/success for circuit breaker state transitions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Cron Trigger - Provider Health Checks

**Files:**
- Create: `apps/gateway-api/src/cron/health-check.ts`
- Modify: `apps/gateway-api/wrangler.toml`
- Modify: `apps/gateway-api/src/index.ts`

**Purpose:** Background health checks for AI providers every 5 minutes via Cron Trigger

- [ ] **Step 1: Write the health check implementation**

```typescript
// apps/gateway-api/src/cron/health-check.ts

import { Env } from '../types';

interface ProviderHealth {
    provider: string;
    status: 'healthy' | 'degraded' | 'down';
    latency: number;
    errorRate: number;
    lastCheck: string;
    uptime: number;
}

const PROVIDERS = ['openai', 'anthropic', 'google', 'deepseek'] as const;

/**
 * Scheduled health check for AI providers
 * Runs every 5 minutes via Cloudflare Cron Trigger
 * Stores results in KV for dashboard to display
 */
export async function healthCheck(event: ScheduledEvent, env: Env): Promise<void> {
    console.log(`[HealthCheck] Starting health checks at ${new Date().toISOString()}`);

    for (const provider of PROVIDERS) {
        try {
            const health = await checkProviderHealth(provider, env);

            // Store in KV
            const kvKey = `provider:health:${provider}`;
            await env.PROVIDER_HEALTH_KV.put(kvKey, JSON.stringify(health), {
                expirationTtl: 3600 // 1 hour
            });

            console.log(`[HealthCheck] ${provider}: ${health.status} (${health.latency}ms)`);

        } catch (error) {
            console.error(`[HealthCheck] Failed to check ${provider}:`, error);

            // Store error state
            const errorHealth: ProviderHealth = {
                provider,
                status: 'down',
                latency: -1,
                errorRate: 100,
                lastCheck: new Date().toISOString(),
                uptime: 0
            };

            await env.PROVIDER_HEALTH_KV.put(
                `provider:health:${provider}`,
                JSON.stringify(errorHealth),
                { expirationTtl: 3600 }
            );
        }
    }

    console.log(`[HealthCheck] Completed health checks`);
}

/**
 * Check health of a specific provider
 */
async function checkProviderHealth(provider: string, env: Env): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
        // Make a simple test request to the provider
        const testUrl = getProviderTestUrl(provider);
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env[`${provider.toUpperCase()}_API_KEY`]}`
            },
            body: JSON.stringify({
                model: getProviderTestModel(provider),
                max_tokens: 1
            }),
            signal: AbortSignal.timeout(10000) // 10s timeout for health check
        });

        const latency = Date.now() - startTime;

        if (response.ok) {
            // Get previous health data to calculate uptime
            const kvKey = `provider:health:${provider}`;
            const previousHealth = await env.PROVIDER_HEALTH_KV.get(kvKey, 'json') as ProviderHealth | null;
            const previousUptime = previousHealth?.uptime || 100;

            return {
                provider,
                status: latency < 2000 ? 'healthy' : 'degraded',
                latency,
                errorRate: 0,
                lastCheck: new Date().toISOString(),
                uptime: Math.min(100, previousUptime + 0.1) // Increment slowly
            };
        } else {
            return {
                provider,
                status: 'down',
                latency,
                errorRate: 100,
                lastCheck: new Date().toISOString(),
                uptime: 0
            };
        }

    } catch (error) {
        return {
            provider,
            status: 'down',
            latency: Date.now() - startTime,
            errorRate: 100,
            lastCheck: new Date().toISOString(),
            uptime: 0
        };
    }
}

/**
 * Get test URL for a provider
 */
function getProviderTestUrl(provider: string): string {
    switch (provider) {
        case 'openai':
            return 'https://api.openai.com/v1/chat/completions';
        case 'anthropic':
            return 'https://api.anthropic.com/v1/messages';
        case 'google':
            return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        case 'deepseek':
            return 'https://api.deepseek.com/v1/chat/completions';
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

/**
 * Get test model for a provider
 */
function getProviderTestModel(provider: string): string {
    switch (provider) {
        case 'openai':
            return 'gpt-4o-mini';
        case 'anthropic':
            return 'claude-3-haiku-20240307';
        case 'google':
            return 'gemini-pro';
        case 'deepseek':
            return 'deepseek-chat';
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}
```

- [ ] **Step 2: Add PROVIDER_HEALTH_KV binding to wrangler.toml**

Find the KV bindings section in `apps/gateway-api/wrangler.toml` and add:

```toml
[[kv_namespaces]]
binding = "PROVIDER_HEALTH_KV"
id = "your-kv-namespace-id"  # Get this from: wrangler kv:namespace create
```

Create KV namespace:
```bash
cd apps/gateway-api
wrangler kv:namespace create "PROVIDER_HEALTH_KV"
```

- [ ] **Step 3: Add cron trigger to wrangler.toml**

Find or create the `[triggers]` section in `apps/gateway-api/wrangler.toml` and add:

```toml
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes
```

- [ ] **Step 4: Export scheduled handler from index.ts**

Find the export section in `apps/gateway-api/src/index.ts` and update:

```typescript
// Export scheduled handler for Cloudflare Workers Cron Triggers
export { healthCheck as scheduled } from './cron/health-check';
```

- [ ] **Step 5: Test cron trigger locally**

```bash
cd apps/gateway-api
npm run dev
```

In another terminal, simulate a cron event:
```bash
curl -X POST http://localhost:8787/scheduled \
  -H "Content-Type: application/json" \
  -d '{"scheduledTime":"2025-03-19T10:00:00Z","cron":"*/5 * * * *"}'
```

Expected: Console logs showing health check results for each provider

- [ ] **Step 6: Commit**

```bash
git add apps/gateway-api/src/cron/health-check.ts apps/gateway-api/wrangler.toml apps/gateway-api/src/index.ts
git commit -m "feat: add provider health checks via cron trigger

- Check all providers (OpenAI, Anthropic, Google, DeepSeek) every 5 minutes
- Measure latency, status, error rate, uptime
- Store results in KV for dashboard display
- Simple test request (1 max token) to verify provider availability
- 10s timeout for health check requests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Middleware - Admin Authentication (Email-based)

**Files:**
- Create: `apps/gateway-api/src/middleware/admin-auth.ts`
- Test: `apps/gateway-api/src/middleware/admin-auth.test.ts`

**Purpose:** Email-based admin authentication for admin dashboard (Phase 1, will migrate to RBAC later)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/gateway-api/src/middleware/admin-auth.test.ts

import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { adminAuth } from './admin-auth';
import { sessionAuth } from './session-auth';

vi.mock('./session-auth');

describe('Admin Auth Middleware', () => {
    it('should allow requests from admin users', async () => {
        vi.mocked(sessionAuth).mockImplementation(async (c, next) => {
            c.set('user', { email: 'admin@example.com' });
            await next();
        });

        const app = new Hono();
        app.use('*', sessionAuth);
        app.use('*', adminAuth);

        app.get('/admin', (c) => c.text('Admin content'));

        const res = await app.request('/admin');

        expect(res.status).toBe(200);
        expect(await res.text()).toBe('Admin content');
    });

    it('should block requests from non-admin users', async () => {
        vi.mocked(sessionAuth).mockImplementation(async (c, next) => {
            c.set('user', { email: 'user@example.com' });
            await next();
        });

        const app = new Hono();
        app.use('*', sessionAuth);
        app.use('*', adminAuth);

        app.get('/admin', (c) => c.text('Admin content'));

        const res = await app.request('/admin');

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toContain('Forbidden');
    });

    it('should require session auth first', async () => {
        vi.mocked(sessionAuth).mockImplementation(async (c, next) => {
            // No user set - simulating unauthenticated request
            await next();
        });

        const app = new Hono();
        app.use('*', sessionAuth);
        app.use('*', adminAuth);

        app.get('/admin', (c) => c.text('Admin content'));

        const res = await app.request('/admin');

        expect(res.status).toBe(401);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/gateway-api
npm test -- admin-auth.test.ts
```

Expected: FAIL with "Cannot find module './admin-auth'"

- [ ] **Step 3: Write implementation**

```typescript
// apps/gateway-api/src/middleware/admin-auth.ts

import { MiddlewareHandler } from 'hono';
import { Env, Variables } from '../types';

/**
 * Admin authentication middleware (Phase 1: Email-based)
 * Checks if user's email is in admin list
 * Phase 2: Migrate to RBAC with role-based access control
 */
const ADMIN_EMAILS = [
    'your-email@example.com',  // Replace with actual admin emails
    // Add more admins as needed
] as const;

export const adminAuth: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
    // Get user from session (set by sessionAuth middleware)
    const user = c.get('user');

    // Check if user is authenticated
    if (!user || !user.email) {
        return c.json({
            error: {
                message: 'Authentication required',
                type: 'authentication_error',
                code: 'unauthorized'
            }
        }, 401);
    }

    // Check if user's email is in admin list
    if (!ADMIN_EMAILS.includes(user.email as string)) {
        return c.json({
            error: {
                message: 'Admin access required',
                type: 'permission_error',
                code: 'forbidden'
            }
        }, 403);
    }

    // User is admin, proceed
    c.set('isAdmin', true);

    await next();
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/gateway-api
npm test -- admin-auth.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/gateway-api/src/middleware/admin-auth.ts apps/gateway-api/src/middleware/admin-auth.test.ts
git commit -m "feat: add admin authentication middleware (email-based)

- Email-based admin list for Phase 1 (simple, fast to implement)
- Check user email against ADMIN_EMAILS array
- Return 401 if not authenticated
- Return 403 if not admin
- Phase 2: Migrate to RBAC with role-based access control

TODO: Replace 'your-email@example.com' with actual admin email

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Admin Endpoints - Metrics API

**Files:**
- Create: `apps/gateway-api/src/admin/metrics-api.ts`
- Modify: `apps/gateway-api/src/index.ts`

**Purpose:** Protected API endpoint for fetching system metrics for admin dashboard

- [ ] **Step 1: Create metrics API handler**

```typescript
// apps/gateway-api/src/admin/metrics-api.ts

import { Hono } from 'hono';
import { adminAuth } from '../middleware/admin-auth';
import { getProjectMetrics } from '../monitoring/metrics';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /api/management/metrics
 * Protected endpoint for fetching system metrics
 * Requires admin authentication
 */
app.get('/api/management/metrics', adminAuth, async (c) => {
    try {
        // Get query parameters
        const hours = parseInt(c.req.query('hours') || '24');
        const projectId = c.req.query('projectId');

        let metrics;

        if (projectId) {
            // Get metrics for specific project
            metrics = await getProjectMetrics(c.env, projectId, hours);
        } else {
            // Get system-wide metrics
            metrics = await getSystemMetrics(c.env, hours);
        }

        return c.json(metrics);

    } catch (error) {
        console.error('[MetricsAPI] Error fetching metrics:', error);
        return c.json({
            error: {
                message: 'Failed to fetch metrics',
                type: 'internal_error',
                code: 'metrics_fetch_failed'
            }
        }, 500);
    }
});

/**
 * Get system-wide metrics
 */
async function getSystemMetrics(env: Env, hours: number): Promise<{
    totalRequests: number;
    avgDuration: number;
    errorRate: number;
    activeProjects: number;
    providerHealth: Record<string, {
        status: string;
        latency: number;
        errorRate: number;
        uptime: number;
    }>;
}> {
    try {
        // Get aggregated metrics from D1
        const result = await env.DB.prepare(`
            SELECT
                COUNT(*) as total_requests,
                AVG(duration) as avg_duration,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
                COUNT(DISTINCT project_id) as active_projects
            FROM metrics
            WHERE timestamp > datetime('now', '-' || ? || ' hours')
        `).bind(hours).first();

        // Get provider health from KV
        const providers = ['openai', 'anthropic', 'google', 'deepseek'];
        const providerHealth: Record<string, any> = {};

        for (const provider of providers) {
            const healthData = await env.PROVIDER_HEALTH_KV.get(
                `provider:health:${provider}`,
                'json'
            );
            if (healthData) {
                providerHealth[provider] = JSON.parse(healthData as string);
            }
        }

        return {
            totalRequests: result?.total_requests as number || 0,
            avgDuration: result?.avg_duration as number || 0,
            errorRate: result?.total_requests > 0
                ? (result?.errors as number || 0) / (result?.total_requests as number)
                : 0,
            activeProjects: result?.active_projects as number || 0,
            providerHealth
        };

    } catch (error) {
        console.error('[MetricsAPI] Failed to get system metrics:', error);
        return {
            totalRequests: 0,
            avgDuration: 0,
            errorRate: 0,
            activeProjects: 0,
            providerHealth: {}
        };
    }
}

export default app;
```

- [ ] **Step 2: Add metrics API router to index.ts**

Find the router mounting section in `apps/gateway-api/src/index.ts` and add:

```typescript
import metricsAPI from './admin/metrics-api';

// Mount Routers
app.route('/v1', gatewayRouter);
app.route('/api', publicAPIRouter);
app.route('/api', managementRouter);
app.route('/', metricsAPI);  // NEW - Admin metrics API
```

- [ ] **Step 3: Test metrics API locally**

```bash
cd apps/gateway-api
npm run dev
```

Then test (requires admin session):
```bash
curl http://localhost:8787/api/management/metrics?hours=24
```

Expected: JSON with system metrics (or 401/403 if not authenticated)

- [ ] **Step 4: Commit**

```bash
git add apps/gateway-api/src/admin/metrics-api.ts apps/gateway-api/src/index.ts
git commit -m "feat: add admin metrics API endpoint

- GET /api/management/metrics with admin authentication
- Support system-wide and per-project metrics
- Query parameters: hours (default: 24), projectId (optional)
- Return total requests, avg duration, error rate, active projects
- Include provider health from KV (latency, status, uptime)
- Graceful error handling with 500 on failure

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Admin Dashboard - HTML UI

**Files:**
- Create: `apps/gateway-api/src/admin/dashboard.ts`
- Modify: `apps/gateway-api/src/index.ts`

**Purpose:** Simple HTML dashboard for real-time system monitoring

- [ ] **Step 1: Create dashboard handler**

```typescript
// apps/gateway-api/src/admin/dashboard.ts

import { Hono } from 'hono';
import { adminAuth } from '../middleware/admin-auth';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /internal/dashboard
 * Admin dashboard with real-time system metrics
 * Requires admin authentication
 */
app.get('/internal/dashboard', adminAuth, async (c) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gateway Admin Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #334155;
        }
        .header h1 { font-size: 24px; font-weight: 600; }
        .header .refresh-info { font-size: 12px; color: #94a3b8; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 20px;
        }
        .card h3 {
            font-size: 14px;
            font-weight: 500;
            color: #94a3b8;
            margin-bottom: 10px;
        }
        .card .value {
            font-size: 32px;
            font-weight: 700;
        }
        .card .value.success { color: #22c55e; }
        .card .value.warning { color: #eab308; }
        .card .value.error { color: #ef4444; }
        .provider-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .provider-card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 15px;
        }
        .provider-card .provider-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .provider-card .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 10px;
        }
        .provider-card .status.healthy {
            background: #22c55e20;
            color: #22c55e;
        }
        .provider-card .status.degraded {
            background: #eab30820;
            color: #eab308;
        }
        .provider-card .status.down {
            background: #ef444420;
            color: #ef4444;
        }
        .provider-card .metric {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 5px;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #94a3b8;
        }
        .error {
            background: #ef444420;
            border: 1px solid #ef4444;
            color: #ef4444;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Gateway Admin Dashboard</h1>
            <div class="refresh-info">
                Auto-refresh: 30s | Last updated: <span id="lastUpdate">Loading...</span>
            </div>
        </div>

        <div id="error" class="error" style="display: none;"></div>

        <div class="grid">
            <div class="card">
                <h3>Total Requests (24h)</h3>
                <div class="value success" id="totalRequests">-</div>
            </div>
            <div class="card">
                <h3>Average Duration</h3>
                <div class="value" id="avgDuration">-</div>
            </div>
            <div class="card">
                <h3>Error Rate</h3>
                <div class="value" id="errorRate">-</div>
            </div>
            <div class="card">
                <h3>Active Projects</h3>
                <div class="value" id="activeProjects">-</div>
            </div>
        </div>

        <h2 style="margin-bottom: 15px; font-size: 18px;">Provider Health</h2>
        <div class="provider-grid" id="providerHealth">
            <div class="loading">Loading provider health...</div>
        </div>
    </div>

    <script>
        async function fetchMetrics() {
            try {
                const response = await fetch('/api/management/metrics?hours=24');

                if (!response.ok) {
                    throw new Error(\`Failed to fetch metrics: \${response.status}\`);
                }

                const data = await response.json();

                // Update metrics
                document.getElementById('totalRequests').textContent = data.totalRequests.toLocaleString();
                document.getElementById('avgDuration').textContent = Math.round(data.avgDuration) + 'ms';
                document.getElementById('errorRate').textContent = (data.errorRate * 100).toFixed(2) + '%';
                document.getElementById('activeProjects').textContent = data.activeProjects;

                // Update error rate color
                const errorRateEl = document.getElementById('errorRate');
                if (data.errorRate < 0.05) {
                    errorRateEl.classList.add('success');
                } else if (data.errorRate < 0.1) {
                    errorRateEl.classList.add('warning');
                } else {
                    errorRateEl.classList.add('error');
                }

                // Update provider health
                const providerHealthEl = document.getElementById('providerHealth');
                if (Object.keys(data.providerHealth).length > 0) {
                    providerHealthEl.innerHTML = Object.entries(data.providerHealth).map(([provider, health]) => \`
                        <div class="provider-card">
                            <div class="provider-name">\${provider.charAt(0).toUpperCase() + provider.slice(1)}</div>
                            <div class="status \${health.status}">
                                \${health.status.toUpperCase()}
                            </div>
                            <div class="metric">
                                <span>Latency</span>
                                <span>\${health.latency}ms</span>
                            </div>
                            <div class="metric">
                                <span>Error Rate</span>
                                <span>\${health.errorRate}%</span>
                            </div>
                            <div class="metric">
                                <span>Uptime</span>
                                <span>\${health.uptime.toFixed(1)}%</span>
                            </div>
                        </div>
                    \`).join('');
                } else {
                    providerHealthEl.innerHTML = '<div class="loading">No provider data available</div>';
                }

                // Update last refresh time
                document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();

                // Hide error if successful
                document.getElementById('error').style.display = 'none';

            } catch (error) {
                console.error('Failed to fetch metrics:', error);
                const errorEl = document.getElementById('error');
                errorEl.textContent = 'Failed to load metrics: ' + error.message;
                errorEl.style.display = 'block';
            }
        }

        // Initial load
        fetchMetrics();

        // Auto-refresh every 30 seconds
        setInterval(fetchMetrics, 30000);
    </script>
</body>
</html>
    `;

    return c.html(html);
});

export default app;
```

- [ ] **Step 2: Add dashboard router to index.ts**

Find the router mounting section in `apps/gateway-api/src/index.ts` and add:

```typescript
import dashboard from './admin/dashboard';

// Mount Routers
app.route('/v1', gatewayRouter);
app.route('/api', publicAPIRouter);
app.route('/api', managementRouter);
app.route('/', metricsAPI);
app.route('/', dashboard);  // NEW - Admin dashboard
```

- [ ] **Step 3: Test dashboard locally**

```bash
cd apps/gateway-api
npm run dev
```

Then open browser:
```
http://localhost:8787/internal/dashboard
```

Expected: Dashboard loads (will prompt for admin login first)

- [ ] **Step 4: Commit**

```bash
git add apps/gateway-api/src/admin/dashboard.ts apps/gateway-api/src/index.ts
git commit -m "feat: add admin dashboard with real-time metrics

- GET /internal/dashboard with admin authentication
- Real-time metrics: total requests, avg duration, error rate, active projects
- Provider health cards: status, latency, error rate, uptime
- Auto-refresh every 30 seconds
- Simple HTML/CSS/JS (no external dependencies)
- Responsive grid layout for desktop and mobile

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 14: Monitoring - Alerting via Resend

**Files:**
- Create: `apps/gateway-api/src/monitoring/alerts.ts`

**Purpose:** Send email alerts for critical system issues via Resend

- [ ] **Step 1: Create alerting module**

```typescript
// apps/gateway-api/src/monitoring/alerts.ts

import { Env } from '../types';

export interface Alert {
    type: 'provider_down' | 'high_error_rate' | 'circuit_breaker_open';
    severity: 'warning' | 'critical';
    provider?: string;
    message: string;
    details: Record<string, unknown>;
}

const ALERT_EMAIL = 'admin@example.com';  // Replace with actual admin email
const ALERT_COOLDOWN = 300000; // 5 minutes in milliseconds

// Track last alert time to prevent spam
const lastAlertTimes = new Map<string, number>();

/**
 * Send alert email via Resend
 * Respects cooldown period to prevent spam (same alert type: max once per 5 minutes)
 */
export async function sendAlert(env: Env, alert: Alert): Promise<void> {
    const alertKey = \`\${alert.type}:\${alert.provider || 'system'}\`;
    const now = Date.now();
    const lastAlert = lastAlertTimes.get(alertKey);

    // Check cooldown period
    if (lastAlert && (now - lastAlert) < ALERT_COOLDOWN) {
        console.log(\`[Alerts] Skipped alert (cooldown): \${alertKey}\`);
        return;
    }

    try {
        // Send email via Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${env.RESEND_API_KEY}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Gateway Alerts <alerts@gateway.yourdomain.com>',
                to: ALERT_EMAIL,
                subject: \`[\${alert.severity.toUpperCase()}] Gateway Alert: \${alert.type.replace(/_/g, ' ').toUpperCase()}\`,
                html: \`
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: \${alert.severity === 'critical' ? '#ef4444' : '#eab308'};">
                            \${alert.severity.toUpperCase()} Alert
                        </h2>
                        <p style="font-size: 18px; margin: 20px 0;">\${alert.message}</p>

                        \${alert.provider ? \`<p><strong>Provider:</strong> \${alert.provider}</p>\` : ''}

                        <h3 style="margin-top: 30px;">Details:</h3>
                        <pre style="background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto;">
\${JSON.stringify(alert.details, null, 2)}
                        </pre>

                        <p style="margin-top: 30px; color: #94a3b8; font-size: 14px;">
                            Time: \${new Date().toISOString()}
                        </p>
                    </div>
                \`
            })
        });

        if (response.ok) {
            console.log(\`[Alerts] Sent alert: \${alertKey}\`);
            lastAlertTimes.set(alertKey, now);
        } else {
            console.error(\`[Alerts] Failed to send alert: \${response.status}\`);
        }

    } catch (error) {
        console.error('[Alerts] Error sending alert:', error);
        // Don't throw - alerting failures should not crash the system
    }
}

/**
 * Alert helpers for common scenarios
 */
export const alerts = {
    async providerDown(env: Env, provider: string, details: Record<string, unknown>): Promise<void> {
        await sendAlert(env, {
            type: 'provider_down',
            severity: 'critical',
            provider,
            message: \`Provider \${provider} is down or unreachable\`,
            details
        });
    },

    async highErrorRate(env: Env, errorRate: number, details: Record<string, unknown>): Promise<void> {
        await sendAlert(env, {
            type: 'high_error_rate',
            severity: 'warning',
            message: \`Gateway error rate is high: \${(errorRate * 100).toFixed(2)}%\`,
            details: { errorRate, ...details }
        });
    },

    async circuitBreakerOpen(env: Env, provider: string, details: Record<string, unknown>): Promise<void> {
        await sendAlert(env, {
            type: 'circuit_breaker_open',
            severity: 'critical',
            provider,
            message: \`Circuit breaker opened for provider \${provider}\`,
            details
        });
    }
};
```

- [ ] **Step 2: Update circuit breaker to send alerts**

Find the `recordFailure` function in `apps/gateway-api/src/middleware/circuit-breaker.ts` and add alert when circuit opens:

```typescript
import { alerts } from '../monitoring/alerts';

// In recordFailure function, when opening circuit:
if (currentState.state === 'CLOSED' && newFailures > FAILURE_THRESHOLD * 10) {
    // ... existing code ...

    // Send alert
    await alerts.circuitBreakerOpen(env, provider, {
        failures: newFailures,
        threshold: FAILURE_THRESHOLD,
        timeWindow: TIME_WINDOW
    });
}
```

- [ ] **Step 3: Update metrics collector to send alerts on high error rate**

Find the metrics collector in `apps/gateway-api/src/middleware/metrics-collector.ts` and add error rate alert:

```typescript
import { alerts } from '../monitoring/alerts';

// In the finally block, after storing metrics:
// Check error rate for project (last 100 requests)
if (status === 'error') {
    const errorRate = await getProjectErrorRate(env, project.id, 1); // Last hour
    if (errorRate > 0.1) { // 10% error rate
        await alerts.highErrorRate(env, errorRate, {
            projectId: project.id,
            projectName: project.name,
            timeWindow: '1 hour'
        });
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/gateway-api/src/monitoring/alerts.ts apps/gateway-api/src/middleware/circuit-breaker.ts apps/gateway-api/src/middleware/metrics-collector.ts
git commit -m "feat: add alerting system via Resend

- Send email alerts for critical system issues
- Alert types: provider_down, high_error_rate, circuit_breaker_open
- Cooldown period: 5 minutes (same alert type max once per 5 min)
- Circuit breaker sends alert when opening
- Metrics collector sends alert on >10% error rate
- Graceful failure (don't crash if Resend fails)

TODO: Replace 'admin@example.com' with actual admin email

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 15: Integration Testing - Load Testing with k6

**Files:**
- Create: `apps/gateway-api/tests/load/test.js`
- Create: `apps/gateway-api/tests/load/gradual-rollout.js`

**Purpose:** Load testing to verify system can handle target load and gradual rollout strategy

- [ ] **Step 1: Create k6 load test**

```javascript
// apps/gateway-api/tests/load/test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
    stages: [
        { duration: '1m', target: 10 },   // Ramp up to 10 users
        { duration: '2m', target: 50 },   // Ramp up to 50 users (target load)
        { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
        { duration: '1m', target: 0 },    // Ramp down to 0
    ],
    thresholds: {
        http_req_duration: ['p(95)<5000'], // 95% of requests under 5s
        http_req_failed: ['rate<0.1'],     // Error rate < 10%
        errors: ['rate<0.1'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8787';
const API_KEY = __ENV.API_KEY || 'test-key';

export default function () {
    // Test /v1/models endpoint
    const modelsRes = http.get(
        \`\${BASE_URL}/v1/models\`,
        {
            headers: {
                'Authorization': \`Bearer \${API_KEY}\`,
                'Content-Type': 'application/json',
            },
        }
    );

    check(modelsRes, {
        'models status is 200': (r) => r.status === 200,
        'models has data': (r) => JSON.parse(r.body).object === 'list',
    }) || errorRate.add(1);

    sleep(1);

    // Test health endpoint
    const healthRes = http.get(\`\${BASE_URL}/health\`);

    check(healthRes, {
        'health status is 200': (r) => r.status === 200,
        'health has status': (r) => JSON.parse(r.body).status === 'ok',
    }) || errorRate.add(1);

    sleep(1);
}

export function handleSummary(data) {
    return {
        'stdout': JSON.stringify({
            'http_req_duration': data.metrics.http_req_duration,
            'http_req_failed': data.metrics.http_req_failed,
            'errors': data.metrics.errors,
        }, null, 2),
    };
}
```

- [ ] **Step 2: Create gradual rollout test**

```javascript
// apps/gateway-api/tests/load/gradual-rollout.js

import http from 'k6/http';
import { check } from 'k6';

// Simulate gradual rollout: 1% → 5% → 25% → 50% → 100%
export const options = {
    scenarios: {
        gradual_rollout: {
            executor: 'ramping-arrival-rate',
            startRate: 1,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            stages: [
                { duration: '30s', target: 1 },   // 1% traffic
                { duration: '1m', target: 5 },    // 5% traffic
                { duration: '2m', target: 25 },   // 25% traffic
                { duration: '2m', target: 50 },   // 50% traffic
                { duration: '4m', target: 100 },  // 100% traffic
            ],
        },
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8787';
const API_KEY = __ENV.API_KEY || 'test-key';

export default function () {
    const payload = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
    });

    const params = {
        headers: {
            'Authorization': \`Bearer \${API_KEY}\`,
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(\`\${BASE_URL}/v1/chat/completions\`, payload, params);

    check(res, {
        'status is 200': (r) => r.status === 200,
        'has choices': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.choices && body.choices.length > 0;
            } catch {
                return false;
            }
        },
        'response time < 30s': (r) => r.timings.duration < 30000,
    });
}
```

- [ ] **Step 3: Install k6**

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

- [ ] **Step 4: Run load test locally**

```bash
cd apps/gateway-api
npm run dev &

# In another terminal
k6 run tests/load/test.js --env BASE_URL=http://localhost:8787,API_KEY=your-test-key
```

Expected: All thresholds pass, error rate < 10%

- [ ] **Step 5: Run gradual rollout test**

```bash
k6 run tests/load/gradual-rollout.js --env BASE_URL=http://localhost:8787,API_KEY=your-test-key
```

Expected: Gradual increase in load, all requests succeed

- [ ] **Step 6: Commit**

```bash
git add apps/gateway-api/tests/load/
git commit -m "test: add load testing with k6

- Basic load test: ramp to 50 users, sustain for 5 minutes
- Gradual rollout test: simulate 1% → 100% traffic increase
- Thresholds: 95% latency < 5s, error rate < 10%
- Test /v1/models and /health endpoints
- Custom metrics for error tracking
- JSON summary output for analysis

Run: k6 run tests/load/test.js

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 16: Deployment - Gradual Rollout to Production

**Files:**
- Modify: `apps/gateway-api/wrangler.toml`
- Create: `scripts/gradual-rollout.sh`

**Purpose:** Deploy with gradual rollout strategy (1% → 5% → 25% → 50% → 100%)

- [ ] **Step 1: Review all KV namespaces needed**

Verify you have created all KV namespaces:
```bash
cd apps/gateway-api
wrangler kv:namespace list
```

Expected output includes:
- RATE_LIMIT_KV
- CIRCUIT_BREAKER_KV
- PROVIDER_HEALTH_KV

If any missing, create them:
```bash
wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "CIRCUIT_BREAKER_KV"
wrangler kv:namespace create "PROVIDER_HEALTH_KV"
```

Update `wrangler.toml` with the correct IDs.

- [ ] **Step 2: Run database migrations for production**

```bash
cd packages/db
npm run migrate:remote
```

Expected: Migrations applied to production D1 database

- [ ] **Step 3: Update admin email in production**

Edit `apps/gateway-api/src/middleware/admin-auth.ts`:
```typescript
const ADMIN_EMAILS = [
    'your-actual-email@example.com',  // Replace with real admin email
] as const;
```

Edit `apps/gateway-api/src/monitoring/alerts.ts`:
```typescript
const ALERT_EMAIL = 'your-actual-email@example.com';  // Replace with real admin email
```

- [ ] **Step 4: Deploy to production**

```bash
cd apps/gateway-api
npm run deploy
```

Expected: Deployment successful, Workers deployed

- [ ] **Step 5: Monitor 1% traffic**

After deployment, monitor the admin dashboard:
```
https://your-gateway-url.com/internal/dashboard
```

Check for:
- Error rate < 1%
- Latency p95 < 5s
- Circuit breakers remain CLOSED
- Provider health stable

Wait 15-30 minutes before proceeding.

- [ ] **Step 6: Increase to 5% traffic**

If 1% looks good, proceed to 5%. Monitor for another 15-30 minutes.

- [ ] **Step 7: Increase to 25% traffic**

If 5% looks good, proceed to 25%. Monitor for 15-30 minutes.

- [ ] **Step 8: Increase to 50% traffic**

If 25% looks good, proceed to 50%. Monitor for 15-30 minutes.

- [ ] **Step 9: Full rollout to 100%**

If 50% looks good, proceed to 100%.

- [ ] **Step 10: Rollback plan (if issues occur)**

If critical issues are found at any stage:

```bash
# Rollback to previous version
cd apps/gateway-api
wrangler rollback

# Or deploy specific version
wrangler deploy --compatibility-date 2025-03-18
```

Monitor rollback success and investigate issues.

- [ ] **Step 11: Commit deployment notes**

```bash
git add apps/gateway-api/src/middleware/admin-auth.ts apps/gateway-api/src/monitoring/alerts.ts
git commit -m "chore: configure admin emails for production

- Update ADMIN_EMAILS with actual admin email
- Update ALERT_EMAIL with actual admin email
- All KV namespaces configured
- Database migrations applied
- Deployment ready with gradual rollout strategy

Rollout Plan:
1. 1% traffic (15-30 min)
2. 5% traffic (15-30 min)
3. 25% traffic (15-30 min)
4. 50% traffic (15-30 min)
5. 100% traffic

Rollback: wrangler rollback

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 17: Documentation - Update README and CLAUDE.md

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Purpose:** Document new production readiness features

- [ ] **Step 1: Update README.md**

Add new section to `README.md`:

```markdown
## Production Readiness

The gateway includes production-grade load handling and observability features:

### Load Handling
- **Circuit Breaker** - Prevents cascading failures from unhealthy AI providers
- **Request Timeout** - 30s max to prevent indefinite hangs
- **Bulkhead** - Limits concurrent requests per project (Free: 5, Pro: 10, Custom: 20)
- **Retry Logic** - Automatic retry with exponential backoff for transient failures

### Observability
- **Metrics Collection** - Performance tracking with 10% sampling
- **Structured Logging** - JSON logs with correlation IDs for request tracing
- **Health Monitoring** - Provider health checks every 5 minutes
- **Admin Dashboard** - Real-time system metrics at `/internal/dashboard`
- **Alerting** - Email alerts for critical issues via Resend

### Free Tier Compliance
All features optimized for Cloudflare free tier:
- D1 for counters (25M reads vs KV's 100K)
- In-memory caching for circuit breaker (check KV every 100 requests)
- 10% metrics sampling to reduce D1 usage
- Target: $0/month operational cost

### Monitoring
- Admin Dashboard: `/internal/dashboard` (admin only)
- Health Check: `/health`
- Metrics API: `/api/management/metrics` (admin only)

### Load Testing
Run load tests with k6:
\`\`\`bash
k6 run apps/gateway-api/tests/load/test.js
\`\`\`
```

- [ ] **Step 2: Update CLAUDE.md**

Add to the Architecture section in `CLAUDE.md`:

```markdown
### Production Readiness Layer

**Circuit Breaker** (`src/middleware/circuit-breaker.ts`) - Prevents cascading failures
- Global per provider (not per-project)
- States: CLOSED, OPEN, HALF_OPEN
- In-memory cache reduces KV reads by 99%
- Auto-recovery after 30s cooldown

**Bulkhead** (`src/middleware/bulkhead.ts`) - Concurrency limits per project
- Uses D1 instead of KV for free tier compliance
- Limits: Free=5, Pro=10, Custom=20 concurrent requests
- Automatic counter cleanup on request completion

**Request Timeout** (`src/middleware/request-timeout.ts`) - Prevents indefinite hangs
- 30s default timeout
- Proxy handler checks deadline before fetch
- Returns 504 Gateway Timeout on expiration

**Observability** (`src/monitoring/`) - Metrics, logging, health checks
- Metrics collector with 10% sampling
- Structured JSON logging with correlation IDs
- Provider health checks via Cron Trigger
- Admin dashboard at `/internal/dashboard`
- Alerting via Resend

**Cron Jobs** (`src/cron/health-check.ts`) - Scheduled tasks
- Provider health checks every 5 minutes
- Measures latency, status, error rate, uptime
- Stores results in KV for dashboard
```

- [ ] **Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: add production readiness documentation

- Document load handling features (circuit breaker, timeout, bulkhead)
- Document observability features (metrics, logging, health checks)
- Add free tier compliance notes
- Add monitoring and load testing sections
- Update architecture section in CLAUDE.md

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 18: Final Testing and Verification

**Purpose:** Comprehensive testing before considering implementation complete

- [ ] **Step 1: Run all unit tests**

```bash
cd apps/gateway-api
npm test
```

Expected: All tests pass

- [ ] **Step 2: Verify middleware order**

Check `apps/gateway-api/src/index.ts` and `apps/gateway-api/src/gateway/index.ts` to ensure correct order:

```typescript
// index.ts
app.use('*', correlationId);        // 1. MUST BE FIRST
app.use('*', metricsCollector);     // 2. Track immediately
app.use('*', injectDatabase);

// gateway/index.ts
gateway.use('*', gatewayKeyAuth);
gateway.use('*', rateLimiter);
gateway.use('*', bulkhead);          // 3. Limit concurrency
gateway.use('*', requestTimeout);    // 4. Set timeout
gateway.use('*', piiScrubber);
gateway.use('*', anomalyHandler);
gateway.use('*', contentFilter);
gateway.use('*', circuitBreaker);    // 5. Check provider health
```

- [ ] **Step 3: Test admin dashboard**

1. Navigate to `/internal/dashboard`
2. Verify admin authentication works
3. Verify metrics display correctly
4. Verify provider health cards show data
5. Verify auto-refresh works (30s)

- [ ] **Step 4: Test circuit breaker**

1. Intentionally cause a provider failure (use invalid API key)
2. Verify circuit breaker opens after 50% failure rate
3. Verify requests are rejected with 503
4. Verify circuit breaker closes after cooldown
5. Verify alerts are sent via email

- [ ] **Step 5: Test bulkhead**

1. Send 10 concurrent requests to a free project (limit: 5)
2. Verify 5 requests succeed
3. Verify 5 requests get 429 with retry info
4. Verify counter decrements after requests complete

- [ ] **Step 6: Test request timeout**

1. Create a slow AI provider response
2. Verify request times out after 30s
3. Verify 504 Gateway Timeout response
4. Verify metrics are collected correctly

- [ ] **Step 7: Test metrics collection**

1. Make various requests (success, failure, timeout)
2. Query D1 for metrics:
```sql
SELECT * FROM metrics WHERE project_id = 'your-project-id' ORDER BY timestamp DESC LIMIT 10;
```
3. Verify 10% sampling (only ~10% of requests in DB)
4. Verify all required fields are present

- [ ] **Step 8: Test health checks**

1. Verify cron trigger is configured in wrangler.toml
2. Check logs for health check executions:
```bash
wrangler tail --format pretty
```
3. Verify provider health data is stored in KV
4. Verify dashboard displays health data

- [ ] **Step 9: Test alerting**

1. Trigger an alert (cause provider failure)
2. Verify email is received via Resend
3. Verify cooldown prevents spam (trigger again, no email)
4. Verify different alert types can be sent

- [ ] **Step 10: Run load test**

```bash
k6 run apps/gateway-api/tests/load/test.js
```

Expected: All thresholds pass, system handles 50 req/s

- [ ] **Step 11: Verify free tier compliance**

1. Check Cloudflare dashboard for usage:
   - Workers: ~4.3M requests/day (may exceed free tier)
   - KV: ~43K reads/day, ~1K writes/day (within free tier) ✅
   - D1: ~4.3M queries/day (within free tier) ✅

2. If Workers exceeds free tier, consider:
   - Reducing request rate to ~1 req/s (~86K/day)
   - Or accepting $5-10/month overage cost

- [ ] **Step 12: Final commit**

```bash
git add .
git commit -m "test: complete production readiness testing

All tests passing:
✅ Unit tests (all middleware and utilities)
✅ Integration tests (end-to-end request flow)
✅ Load tests (50 req/s target sustained)
✅ Circuit breaker (opens/closes correctly)
✅ Bulkhead (enforces concurrency limits)
✅ Request timeout (prevents indefinite hangs)
✅ Metrics collection (10% sampling working)
✅ Health checks (cron trigger running)
✅ Alerting (emails sent via Resend)
✅ Admin dashboard (metrics displaying)
✅ Free tier compliance (KV/D1 within limits)

System ready for production deployment with gradual rollout.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Completion Checklist

Before considering this implementation complete, verify:

- [ ] All 18 tasks completed
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Load tests passing (50 req/s sustained)
- [ ] Admin dashboard accessible and functional
- [ ] Circuit breaker working (opens/closes correctly)
- [ ] Bulkhead enforcing concurrency limits
- [ ] Request timeout preventing indefinite hangs
- [ ] Metrics collection with 10% sampling
- [ ] Health checks running via cron
- [ ] Alerting sending emails via Resend
- [ ] Free tier compliance verified (KV/D1 within limits)
- [ ] Documentation updated (README.md, CLAUDE.md)
- [ ] Gradual rollout plan documented
- [ ] Rollback procedure tested

---

## Success Criteria

✅ **Load Handling**
- Gateway handles sudden traffic spikes without crashing (up to 50 req/s)
- Circuit breaker prevents cascading failures from unhealthy providers
- Request timeouts prevent resource exhaustion
- Bulkhead ensures fair resource allocation across projects

✅ **Observability**
- Every request has correlation ID for tracing
- Real-time metrics visible in admin dashboard
- Provider health status monitored
- Automatic alerting for critical issues

✅ **Reliability**
- Gateway uptime > 99.9%
- Automatic recovery from transient failures
- Graceful degradation when components fail
- Fast rollback capability (< 1 minute)

✅ **Free Tier Compliance**
- $0/month operational cost (best case)
- KV usage < 100K reads/day, < 1K writes/day
- D1 usage < 25M reads/day, < 5M writes/day
- Workers usage optimized to minimize overage costs

---

**End of Implementation Plan**

Total estimated time: 8-12 hours of development + testing
Total tasks: 18 major tasks with 100+ individual steps
Files created: 20+ new files
Files modified: 10+ existing files

**Next Steps:**
1. Review this plan
2. Choose execution approach (subagent-driven or inline)
3. Begin implementation task by task
4. Monitor progress with checkbox tracking
5. Run comprehensive testing after completion
6. Deploy with gradual rollout strategy
