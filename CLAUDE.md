# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Micro-Security Gateway is a hybrid Cloudflare-based API gateway that provides secure access to AI providers (OpenAI, Anthropic, Google) with built-in rate limiting, anomaly detection, and cost tracking. It sits between developers' applications and AI providers, offering an OpenAI-compatible proxy interface.

**Architecture Pattern**: Hybrid Cloudflare strategy
- **Gateway**: Hono.js on Cloudflare Workers (edge compute)
- **Dashboard**: Next.js 15 on Cloudflare Pages (SSR/CSR)
- **Database**: Cloudflare D1 (SQLite at edge)
- **Caching**: Cloudflare KV (rate limiting)

## Common Commands

### Root Workspace Commands
```bash
# Start gateway in dev mode
npm run dev:gateway

# Start dashboard in dev mode
npm run dev:dashboard

# Deploy gateway to production
npm run deploy:gateway

# Dashboard auto-deploys on push to main (Vercel)
```

### Gateway API (apps/gateway-api)
```bash
cd apps/gateway-api
npm run dev          # Start local dev server (wrangler dev)
npm run deploy       # Deploy to Cloudflare Workers
npm run test         # Run unit tests (vitest)
```

### Dashboard UI (apps/dashboard-ui)
```bash
cd apps/dashboard-ui
npm run dev          # Start Next.js dev server with turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database (packages/db)
```bash
cd packages/db
npm run migrate:local   # Apply migrations to local D1 database
npm run migrate:remote  # Apply migrations to production D1 database
```

## Architecture Structure

### Monorepo Layout
- `apps/gateway-api/` - Cloudflare Worker with Hono.js (API gateway)
- `apps/dashboard-ui/` - Next.js 15 dashboard UI
- `packages/db/` - Shared database types, migrations, and pricing logic
- `packages/shared/` - Shared utilities and types

### Gateway API Architecture

**Entry Point**: `apps/gateway-api/src/index.ts`

**Middleware Stack** (applied in order):
1. **Correlation ID** - Request tracing via correlation-id middleware
2. **Metrics Collector** - Observability tracking for all requests
3. **API Key Auth** (`src/middleware/api-key-auth.ts`) - SHA-256 hashing for gateway keys
4. **Rate Limiting** (`src/middleware/rate-limiter.ts`) - KV-based per-key limiting
5. **IP Rate Limiting** (`src/middleware/ip-rate-limiter.ts`) - 10 req/min per IP for auth endpoints
6. **Circuit Breaker** (`src/middleware/circuit-breaker.ts`) - Per-project/per-provider failure detection
7. **Request Timeout** (`src/middleware/request-timeout.ts`) - 30s max timeout
8. **Bulkhead** (`src/middleware/bulkhead.ts`) - Concurrency limits via D1
9. **Anomaly Detection** (`src/middleware/anomaly-handler.ts`) - Prompt injection detection
10. **PII Scrubbing** (`src/middleware/pii-scrub.ts`) - GDPR/HIPAA data redaction
11. **Content Filtering** (`src/middleware/content-filter.ts`) - Sensitive content filtering

**Router Structure**:
- `src/gateway/` - OpenAI-compatible proxy endpoints (`/v1/*`)
- `src/management/` - Internal API for dashboard (`/api/management/*`)
- `src/auth/` - Authentication endpoints (`/api/auth/*`)

**Resilience Patterns** (production-ready):
- **Circuit Breaker**: Per-project/per-provider failure detection (5 failures → open, 2 successes → close)
- **Request Timeout**: 30s max with configurable deadlines
- **Bulkhead**: Concurrency limits tracked in D1 database
- **Retry Logic**: 3 retries with exponential backoff for transient failures (`src/utils/retry.ts`)

**Key Pattern**: Repository pattern (`apps/gateway-api/src/repositories/`) abstracts database operations. All DB access goes through D1 adapter.

### Dashboard UI Architecture

**Next.js App Router** with React 19 and Tailwind CSS v4.

**Key Directories**:
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - Reusable UI components with glassmorphism design
- `src/lib/` - Utility functions and API client wrappers
- `src/hooks/` - Custom React hooks

**Authentication**: Supabase Auth (Google, GitHub, email) with JWT token storage.

**Dashboard Pages**: `/dashboard` (overview), `/dashboard/analytics`, `/dashboard/security`, `/dashboard/alerts`, `/dashboard/settings`, `/dashboard/projects/[id]`

**Alert System** (`src/services/alert-engine.ts`): Project-level or key-level cost thresholds, security alerts, email notifications via Resend.

### Database Layer

**Types**: `packages/db/src/types.ts` - All TypeScript interfaces for data models

**Pricing Logic**: `packages/db/src/pricing.ts` - Cost calculation for OpenAI, Anthropic, Google, DeepSeek providers

**Migrations**: `packages/db/migrations/` - Applied via wrangler d1 commands
**Database Bindings**: `apps/gateway-api/wrangler.toml` with `[[d1_databases]]` section

**Cron System** (`src/cron/scheduled-dispatcher.ts`):
- **Monthly Reset**: 1st day of every month (resets usage tracking)
- **Health Checks**: Every 5 minutes (provider availability)
- Note: Cloudflare Workers allows only ONE `scheduled` export

## Configuration Files

### Cloudflare Worker Configuration
`apps/gateway-api/wrangler.toml`:
- D1 database bindings (`[[d1_databases]]`)
- KV namespace bindings (`[[kv_namespaces]]`)
- Cron triggers (`[triggers] crons = ["0 0 1 * *", "*/5 * * * *"]`)
- Observability traces (10% sampling)
- Environment vars: `ENVIRONMENT`, `SUPABASE_URL`

### Environment Variables (Required)
Set in `.dev.vars` (local) or Cloudflare secrets (production):
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_JWT_SECRET` - JWT verification (1-hour max token age)
- `ENCRYPTION_SECRET` - API key encryption (generate: `openssl rand -base64 32`)
- `RESEND_API_KEY` - Email notifications

### TypeScript Configurations
- Gateway: ES2022 with Cloudflare Workers types
- Dashboard: Next.js standard with path aliases (`@/` → `src/`)

## Important Implementation Details

### API Key Management
- Gateway keys: SHA-256 hashed before storage
- Provider keys: AES-256-GCM encrypted at rest (per-user encryption keys)
- Each key has rate limits and cost budgets

### Rate Limiting Strategy
- Cloudflare KV for distributed counters
- Per-key configurable limits (requests per time period)
- IP-based limiting for auth endpoints (10 req/min)

### Anomaly Detection (`src/security/`)
- Pattern-based detection for prompt injection (`injection-patterns.ts`, `injection-scorer.ts`)
- Heuristics for suspicious patterns
- Security events logged to D1 for dashboard review

### Provider Routing (`src/gateway/model-router.ts`)
- OpenAI-compatible interface: `/v1/chat/completions`, `/v1/models`, etc.
- Routes to provider based on model name
- Supports streaming responses (Server-Sent Events)
- Providers: OpenAI, Anthropic, Google, DeepSeek, Groq, Together AI

### Observability
- Correlation ID middleware traces all requests
- Metrics collector tracks request patterns
- Cloudflare Workers Traces enabled (10% sampling)
- Structured logging format: `[Service] Action: description (Metadata: key=value)`

## Testing

**Framework**: Vitest
**Structure**: Tests alongside source files (`.test.ts` suffix)
**Coverage**: 305 tests (100% success rate)

```bash
# Run all gateway tests
cd apps/gateway-api && npm run test

# Run specific test file
npx vitest src/middleware/circuit-breaker.test.ts
```

**Security Tests**: Comprehensive penetration testing suite (96.6% success rate)
**Performance Tests**: k6 load tests in `load-tests/` directory

## Design System

Dashboard: Glassmorphism with neon accents, dark theme, mobile-first with Tailwind CSS v4.
