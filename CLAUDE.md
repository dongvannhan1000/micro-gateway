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

### Quick Start (Automated Setup)
```bash
# One-command setup - installs dependencies, configures environment,
# runs migrations, and starts all services
npm run setup
```

The setup script will:
- Verify prerequisites (Node.js, npm)
- Create `.dev.vars` from `.env.example` template
- Auto-generate `ENCRYPTION_SECRET` using OpenSSL
- Prompt for Supabase URL (can skip and add later)
- Install all npm dependencies
- Run database migrations automatically
- Start both Gateway API and Dashboard UI
- Display success message with local URLs

**Setup takes ~5 minutes** and requires minimal user interaction.

### Root Workspace Commands
```bash
# Start gateway in dev mode
npm run dev:gateway

# Start dashboard in dev mode
npm run dev:dashboard

# Start both services simultaneously
npm run dev

# Docker: Start dashboard in container (gateway must run via wrangler dev)
docker-compose up dashboard

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

## Environment Configuration

### Required Environment Variables

The setup script (`npm run setup`) creates a `.dev.vars` file automatically. Manual configuration:

```bash
# Copy the example file
cp .env.example .dev.vars

# Edit with your values
nano .dev.vars  # or use your preferred editor
```

**Required Variables:**
- `SUPABASE_URL` - Your Supabase project URL (from https://supabase.com/dashboard)
- `SUPABASE_JWT_SECRET` - JWT secret from Supabase project settings
- `ENCRYPTION_SECRET` - Auto-generated by setup script (32-byte base64)

**Optional Variables:**
- `RESEND_API_KEY` - For email notifications via Resend
- `ENVIRONMENT` - Set to `development` or `production`

### Getting Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Create a new project or select existing
3. Navigate to Project Settings → API
4. Copy the Project URL (`SUPABASE_URL`)
5. Copy the JWT Secret (`SUPABASE_JWT_SECRET`)

### Setup Troubleshooting

**Issue: Setup script fails at prerequisites check**
- Ensure Node.js v18+ is installed: `node --version`
- Ensure npm is installed: `npm --version`
- On Windows, run PowerShell as Administrator

**Issue: Database migrations fail**
- Ensure Wrangler is installed: `npm install -g wrangler`
- Check D1 database binding in `apps/gateway-api/wrangler.toml`
- Try running manually: `cd packages/db && npm run migrate:local`

**Issue: Services fail to start**
- Check if ports 8787 and 3000 are available
- Ensure `.dev.vars` exists with proper values
- Check logs for specific error messages

**Issue: OpenSSL not found (Windows)**
- Install Git for Windows which includes OpenSSL
- Or use WSL (Windows Subsystem for Linux)
- Setup script will fallback to Node.js crypto module

## Docker Setup

### Quick Docker Commands
```bash
# Start Dashboard UI in Docker (development mode)
docker-compose up dashboard

# Start in background
docker-compose up -d dashboard

# View logs
docker-compose logs -f dashboard

# Stop services
docker-compose down

# Rebuild after dependency changes
docker-compose build --no-cache dashboard
```

### Docker Architecture
**Hybrid Approach** (Recommended):
- **Dashboard UI**: Runs in Docker container (Next.js 15)
- **Gateway API**: Runs on host via `wrangler dev` (Cloudflare Workers runtime)

**Why this approach?**
Cloudflare Workers cannot run in Docker directly because they require:
- Cloudflare's edge runtime environment
- Specific Workers APIs (Request, Response, FetchEvent, etc.)
- D1 database bindings
- KV namespace bindings

### Environment Configuration for Docker
```bash
# Copy Docker environment template
cp apps/dashboard-ui/.env.docker apps/dashboard-ui/.env

# Edit with your Supabase credentials
nano apps/dashboard-ui/.env
```

**Required variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_GATEWAY_URL=http://host.docker.internal:8787
```

### Production Docker Deployment
```bash
# Build production image
docker-compose -f docker-compose.prod.yml build

# Start production container
docker-compose -f docker-compose.prod.yml up -d
```

**See [DOCKER.md](./DOCKER.md)** for complete Docker documentation including troubleshooting, security, and performance optimization.

## Design System

Dashboard: Glassmorphism with neon accents, dark theme, mobile-first with Tailwind CSS v4.
