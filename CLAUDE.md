# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Micro-Security Gateway is a hybrid Cloudflare-based API gateway that provides secure access to AI providers (OpenAI, Anthropic, Google) with built-in rate limiting, anomaly detection, and cost tracking. It sits between developers' applications and AI providers, offering an OpenAI-compatible proxy interface.

**Architecture**: Hono.js on Cloudflare Workers (gateway) + Next.js 15 dashboard + Cloudflare D1 database + Cloudflare KV caching.

## Common Commands

```bash
# Quick start (installs deps, configures env, runs migrations, starts services)
npm run setup

# Development
npm run dev                # Start both gateway (8787) and dashboard (3000)
npm run dev:gateway        # Gateway only
npm run dev:dashboard      # Dashboard only

# Testing
cd apps/gateway-api && npm run test           # All gateway tests
npx vitest src/middleware/circuit-breaker.test.ts  # Single test file

# Database
cd packages/db && npm run migrate:local       # Local D1 migrations
cd packages/db && npm run migrate:remote      # Production D1 migrations

# Deployment
npm run deploy:gateway      # Deploy gateway to Cloudflare Workers
```

## Architecture

### Monorepo Structure
- `apps/gateway-api/` - Cloudflare Worker with Hono.js (API gateway)
- `apps/dashboard-ui/` - Next.js 15 dashboard (App Router, React 19, Tailwind v4)
- `packages/db/` - Shared types, migrations, pricing logic
- `packages/shared/` - Shared utilities

### Gateway API (`apps/gateway-api/src/index.ts`)

**Middleware Stack** (applied in order):
1. Correlation ID → Metrics → API Key Auth (SHA-256) → Rate Limiting (KV) → IP Rate Limiting
2. Circuit Breaker → Request Timeout → Bulkhead (D1 concurrency)
3. Anomaly Detection → PII Scrubbing → Content Filtering

**Router Structure**:
- `src/gateway/` - OpenAI-compatible proxy (`/v1/*`)
- `src/management/` - Dashboard API (`/api/management/*`)
- `src/auth/` - Auth endpoints (`/api/auth/*`)

**Resilience Patterns**:
- Circuit Breaker: 5 failures → open, 2 successes → close (per-project/per-provider)
- Request Timeout: 30s max
- Bulkhead: D1-tracked concurrency limits
- Retry Logic: 3 retries with exponential backoff (`src/utils/retry.ts`)

**Repository Pattern**: `src/repositories/` abstracts all D1 database operations.

### Dashboard UI

**Key Directories**:
- `src/app/` - App Router pages/layouts
- `src/components/` - Glassmorphism UI components
- `src/lib/` - Utilities and API clients
- `src/hooks/` - Custom React hooks
- `src/services/alert-engine.ts` - Cost/security alerts with email notifications

**Authentication**: Supabase Auth (Google, GitHub, email) with JWT storage.

**Pages**: Overview, Analytics, Security, Alerts, Settings, Project details.

### Database Layer

**Types**: `packages/db/src/types.ts`
**Pricing**: `packages/db/src/pricing.ts` (OpenAI, Anthropic, Google, DeepSeek cost calculation)
**Migrations**: `packages/db/migrations/` (applied via wrangler d1)
**Cron**: `src/cron/scheduled-dispatcher.ts` (monthly reset + 5-min health checks)

**Note**: Cloudflare Workers allows only ONE `scheduled` export.

## Configuration

### Environment Variables (`.dev.vars` for local, Cloudflare secrets for prod)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_JWT_SECRET` - JWT verification (1-hour max token age)
- `ENCRYPTION_SECRET` - API key encryption (generate: `openssl rand -base64 32`)
- `RESEND_API_KEY` - Email notifications (optional)

### Cloudflare Worker Config (`apps/gateway-api/wrangler.toml`)
- D1 database bindings, KV namespaces, cron triggers, observability (10% trace sampling)

### TypeScript
- Gateway: ES2022 with Cloudflare Workers types
- Dashboard: Next.js standard with `@/` → `src/` path alias

## Key Implementation Details

### API Key Management
- Gateway keys: SHA-256 hashed
- Provider keys: AES-256-GCM encrypted (per-user encryption keys)
- Rate limits and cost budgets per key

### Rate Limiting
- Cloudflare KV distributed counters
- Per-key configurable limits
- IP-based limiting for auth endpoints (10 req/min)

### Provider Routing (`src/gateway/model-router.ts`)
- OpenAI-compatible interface (`/v1/chat/completions`, `/v1/models`)
- Routes by model name, supports streaming (SSE)
- Providers: OpenAI, Anthropic, Google, DeepSeek, Groq, Together AI

### Observability
- Correlation ID tracing, metrics collection
- Cloudflare Workers Traces (10% sampling)
- Log format: `[Service] Action: description (Metadata: key=value)`

## Testing

**Framework**: Vitest (tests alongside source files, `.test.ts` suffix)
**Coverage**: 305 tests, security suite (96.6% success rate), k6 load tests in `load-tests/`

## Docker

**Hybrid Approach** (recommended): Dashboard in Docker, Gateway on host via `wrangler dev` (Cloudflare Workers runtime cannot containerize).

```bash
docker-compose up dashboard        # Start dashboard container
docker-compose up -d dashboard     # Background
docker-compose logs -f dashboard   # Logs
docker-compose down                # Stop
```

Dashboard requires `.env` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GATEWAY_URL=http://host.docker.internal:8787`.

## Design System

Dashboard: Glassmorphism, neon accents, dark theme, mobile-first, Tailwind CSS v4.
