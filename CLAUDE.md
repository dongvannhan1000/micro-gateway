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

# Deploy to production
npm run deploy:gateway
npm run deploy:dashboard
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
1. **API Key Auth** (`src/middleware/auth.ts`) - Validates gateway keys using SHA-256 hashing
2. **Rate Limiting** (`src/middleware/rate-limit.ts`) - KV-based rate limiting per key
3. **Anomaly Detection** (`src/middleware/anomaly.ts`) - Detects prompt injection attacks
4. **Content Filtering** (`src/middleware/content-filter.ts`) - Filters sensitive content

**Router Structure**:
- `src/gateway/` - OpenAI-compatible proxy endpoints (`/v1/*`)
- `src/management/` - Internal API for dashboard (`/api/management/*`)
- `src/auth/` - Authentication endpoints (`/api/auth/*`)

**Key Pattern**: The gateway uses a repository pattern (`packages/db/src/db-adapter.ts`) to abstract database operations, allowing easy database swapping. All database access goes through this adapter.

### Dashboard UI Architecture

**Next.js App Router** with React 19 and Tailwind CSS v4.

**Key Directories**:
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - Reusable UI components with glassmorphism design
- `src/lib/` - Utility functions and API client wrappers
- `src/hooks/` - Custom React hooks

**Authentication**: Supabase Auth (Google, GitHub, email) with JWT token storage.

**Dashboard Pages**:
- `/dashboard` - Main overview with metrics and charts
- `/dashboard/analytics` - Detailed usage analytics
- `/dashboard/security` - Security event logs
- `/dashboard/alerts` - Alert configuration and history
- `/dashboard/settings` - API key management and settings

### Database Layer

**Types**: `packages/db/src/types.ts` - All TypeScript interfaces for data models

**Pricing Logic**: `packages/db/src/pricing.ts` - Cost calculation for OpenAI, Anthropic, Google, DeepSeek providers

**Migrations**: `packages/db/migrations/` - Database schema versioning (applied via wrangler d1 commands)

**Database Bindings**: Configured in `apps/gateway-api/wrangler.toml` with `[[d1_databases]]` section

## Configuration Files

### Cloudflare Worker Configuration
`apps/gateway-api/wrangler.toml` - Defines:
- D1 database bindings
- KV namespace bindings
- Environment variables (SUPABASE_URL, SUPABASE_JWT_SECRET, ENCRYPTION_SECRET, RESEND_API_KEY)

### TypeScript Configurations
- Gateway targets ES2022 with Cloudflare Workers types
- Dashboard uses Next.js standard config with path aliases (`@/` for `src/`)

### Environment Variables
Required in `.dev.vars` for local development or Cloudflare environment secrets:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_JWT_SECRET` - JWT secret for auth token verification
- `ENCRYPTION_SECRET` - Secret for API key encryption
- `RESEND_API_KEY` - Email service API key

## Important Implementation Details

### API Key Management
- Gateway keys are hashed using SHA-256 before storage
- Keys are encrypted at rest using the ENCRYPTION_SECRET
- Each key has associated rate limits and cost budgets

### Rate Limiting Strategy
- Uses Cloudflare KV for distributed counter storage
- Rate limits are configurable per API key
- Window-based limiting (requests per time period)

### Anomaly Detection
- Pattern-based detection for prompt injection attacks
- Heuristics for suspicious request patterns
- Logs security events to database for dashboard review

### Provider Routing
- OpenAI-compatible interface (`/v1/chat/completions`, `/v1/models`, etc.)
- Routes requests to appropriate provider based on model name
- Supports streaming responses (Server-Sent Events)

### Database Migrations
Always run migrations after schema changes:
```bash
# For local development
cd packages/db && npm run migrate:local

# For production
cd packages/db && npm run migrate:remote
```

## Testing Strategy

**Unit Tests**: Located alongside source files with `.test.ts` suffix
**Test Framework**: Vitest
**Run Tests**: `npm run test` from `apps/gateway-api/`

## Design System

The dashboard uses a custom design system with:
- **Glassmorphism**: Translucent backgrounds with blur effects
- **Neon Accents**: High-contrast colors for CTAs and highlights
- **Dark Theme**: Default dark mode optimized for developer tools
- **Responsive**: Mobile-first design with Tailwind CSS v4
