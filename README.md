# Micro-Security Gateway

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Security: AES-256](https://img.shields.io/badge/Security-AES--256-green)](./SECURITY.md)

**Self-hosted, open-source AI API gateway with enterprise security.** Your provider keys never leave your infrastructure.

---

## Why Micro-Security Gateway?

**Your Keys, Your Infrastructure** - Deploy on your own servers. Your OpenAI/Anthropic/Google API keys never leave your infrastructure.

**Enterprise Security** - Anomaly detection, PII scrubbing, hard spending caps. Features competitors charge $100+/month for.

**Free & Open Source** - MIT license. Deploy anywhere. No vendor lock-in.

---

## Features

- ✅ **Multi-provider routing** - OpenAI, Anthropic, Google, DeepSeek, Groq, Together AI
- ✅ **Anomaly detection** - Block prompt injection attacks (OWASP #1 LLM risk)
- ✅ **PII scrubbing** - GDPR/HIPAA compliant data redaction
- ✅ **Hard spending caps** - Never get bill shock again
- ✅ **Rate limiting** - Per-key configurable limits
- ✅ **Cost analytics** - Track spend per project/provider
- ✅ **Hybrid Alert System** - Project-level or key-level cost monitoring
- ✅ **OpenAI-compatible API** - Drop-in replacement for OpenAI SDKs
- ✅ **Security hardened** - JWT validation, IP rate limiting, race condition protection

### 🚀 Production-Ready Resilience

- ✅ **Circuit Breaker** - Prevent cascading failures with per-project/per-provider circuit breakers
- ✅ **Request Timeout** - 30s max timeout with configurable deadlines
- ✅ **Bulkhead Pattern** - Concurrency limits via D1 database
- ✅ **Retry Logic** - 3 retries with exponential backoff for transient failures
- ✅ **Load Testing** - Comprehensive k6 load tests for performance validation

---

## 🔒 Security

All critical security vulnerabilities have been fixed and verified through comprehensive penetration testing (96.6% test success rate). See [SECURITY.md](SECURITY.md) for details.

**Recent Security Fixes:**
- ✅ JWT expiration validation (1-hour max token age)
- ✅ Anomaly detection blocking (suspicious activity blocked)
- ✅ IP-based auth rate limiting (10 req/min per IP)
- ✅ Race condition protection (atomic increment operations)
- ✅ Comprehensive secret rotation documentation

**Verify Security Fixes:**
```bash
# Run security verification script
./scripts/verify-security-fixes.sh
```

---

## Quick Start

### Option 1: Docker Setup (Recommended for Dashboard)

```bash
# Clone repository
git clone https://github.com/dongvannhan1000/micro-gateway.git
cd micro-gateway

# Configure environment
cp apps/dashboard-ui/.env.docker apps/dashboard-ui/.env
# Edit apps/dashboard-ui/.env with your Supabase credentials

# Start Gateway API on host (Terminal 1)
npm run dev:gateway

# Start Dashboard UI in Docker (Terminal 2)
docker-compose up dashboard
```

**Access your gateway:**
- Dashboard UI: http://localhost:3000
- Gateway API: http://localhost:8787

**[🐳 Docker Documentation](./DOCKER.md)** - Complete Docker setup guide

### Option 2: One-Command Local Setup (5 minutes)

```bash
# Clone and run automated setup
git clone https://github.com/dongvannhan1000/micro-gateway.git
cd micro-gateway
npm run setup
```

The setup script automatically:
- ✓ Verifies prerequisites (Node.js, npm)
- ✓ Creates environment configuration (.dev.vars)
- ✓ Generates encryption secret
- ✓ Installs all dependencies
- ✓ Runs database migrations
- ✓ Starts both Gateway API (port 8787) and Dashboard UI (port 3000)

**Access your gateway:**
- Dashboard UI: http://localhost:3000
- Gateway API: http://localhost:8787

**[📖 Detailed Setup Guide](./docs/SETUP.md)** - Troubleshooting and manual setup instructions

### Self-Hosted Deployment (Production)

```bash
# 1. Clone and install
git clone https://github.com/dongvannhan1000/micro-gateway.git
cd micro-gateway
npm install

# 2. Configure Supabase (free tier)
#    Go to https://supabase.com → New Project
#    Copy Project URL + JWT Secret

# 3. Deploy gateway
cd apps/gateway-api
npx wrangler d1 create ms-gateway-db  # Copy database_id
npx wrangler kv:namespace create "RATE_LIMIT_KV"  # Copy namespace id
# Update wrangler.toml with both IDs

npx wrangler secret put SUPABASE_JWT_SECRET
npx wrangler secret put ENCRYPTION_SECRET  # Generate: openssl rand -base64 32
npx wrangler deploy

# 4. Add provider keys via dashboard UI
#    Access dashboard, create project, add keys in Settings
```

**[🚀 Full Deployment Guide](./SELF_HOSTED.md)** - Detailed setup with troubleshooting

---

## Architecture

```
Cloudflare Workers (Edge)
├── Gateway API (Hono.js)
│   ├── Resilience Patterns
│   │   ├── Circuit Breaker (per-project, per-provider)
│   │   ├── Request Timeout (30s max)
│   │   ├── Bulkhead (concurrency limits)
│   │   └── Retry Logic (3x exponential backoff)
│   ├── Security
│   │   ├── Rate limiting (KV)
│   │   ├── Anomaly detection
│   │   └── PII scrubbing
│   ├── Alert System
│   │   ├── Hybrid Scope: Project-level (all keys) or key-level (specific key)
│   │   ├── Cost Thresholds: Alert when spending exceeds configured limit
│   │   ├── Security Alerts: Prompt injection detection
│   │   └── Notification Channels: Email (webhook coming soon)
│   └── Multi-provider routing
│       ├── OpenAI, Anthropic, Google
│       └── DeepSeek, Groq, Together AI
└── D1 Database (SQLite)
    ├── Projects & API keys
    ├── Provider configs (encrypted)
    ├── Usage tracking
    ├── Alert rules (with scope)
    └── Circuit breaker state
```

---

## API Usage

```bash
# Use OpenAI-compatible endpoint
curl https://your-gateway.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_GATEWAY_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Provider Selection**:
```json
{"model": "gpt-4"}           // OpenAI
{"model": "claude-3-opus"}    // Anthropic
{"model": "gemini-pro"}       // Google
{"model": "deepseek-chat"}    // DeepSeek
```

---

## Security

- **AES-256-GCM encryption** for provider keys at rest
- **SHA-256 hashing** for gateway key authentication
- **TLS 1.3** for all connections
- **Per-user encryption keys** (isolation)
- **Security audit logging** (all key access)

**[📖 Security Documentation](./SECURITY.md)** - Encryption architecture, compliance, best practices

**Vulnerability Reporting**: nhandong0205@gmail.com

---

## Configuration Examples

### Rate Limiting
```json
{
  "rate_limit": {
    "requests_per_minute": 100
  }
}
```

### Monthly Budget Cap
```json
{
  "monthly_limit_usd": 100
}
```

### PII Scrubbing
```json
{
  "pii_scrubbing_level": "high"  // low | medium | high
}
```

---

## Error Monitoring (Optional)

The Dashboard UI supports **optional** error monitoring with Sentry. Each deployment uses its own Sentry account - your data stays under your control.

### How It Works

- ✅ **Optional**: No monitoring unless you configure it
- ✅ **User-controlled**: Each deployment uses its own Sentry DSN
- ✅ **Privacy-first**: No data sharing with project maintainers
- ✅ **Self-hosted friendly**: Perfect for open-source deployments

### Quick Setup

```bash
# 1. Create your own Sentry account (free tier available)
#    https://sentry.io/signup/

# 2. Create a new project → Select "Next.js"

# 3. Add your DSN to environment variables
#    Local: .dev.vars
#    Production: Cloudflare Pages environment variables
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0

# 4. Rebuild and deploy
cd apps/dashboard-ui
npm run build
```

### Features

When enabled, Sentry provides:
- 🐛 **Error tracking** - Automatic error capture with stack traces
- 📊 **Performance monitoring** - Page load times, API response times
- 🎥 **Session replay** - User interaction recordings when errors occur
- 🔍 **Source maps** - Readable stack traces in production

**[📖 Complete Sentry Setup Guide](./SENTRY-SETUP.md)** - Detailed configuration and troubleshooting

**Privacy Note**: This project does NOT collect data from users. Each deployment must configure its own Sentry instance to enable monitoring.

---

## Documentation

- [**SENTRY-SETUP.md**](./SENTRY-SETUP.md) - Error monitoring setup guide
- [**DOCKER.md**](./DOCKER.md) - Docker setup and configuration
- [**SELF_HOSTED.md**](./SELF_HOSTED.md) - Deployment guide
- [**SECURITY.md**](./SECURITY.md) - Security architecture
- [**CONTRIBUTING.md**](./CONTRIBUTING.md) - Contribution guidelines
- [**LICENSE**](./LICENSE) - MIT License

---

## Production Readiness

### ✅ Fully Tested & Production-Ready

**Test Coverage**: 305 tests passing (100% success rate)

**Security**: All critical vulnerabilities fixed and verified
- JWT expiration validation (1-hour max token age)
- IP-based auth rate limiting (10 req/min per IP)
- Race condition protection (atomic operations)
- Comprehensive penetration testing

**Performance**: Load tested with k6
- P95 latency: < 2000ms
- P99 latency: < 5000ms
- Error rate: < 5%
- Throughput: 50+ req/s

**Resilience**: Production-ready patterns
- Circuit breaker prevents cascading failures
- Request timeout protects against slow providers
- Bulkhead limits concurrency per project
- Retry logic handles transient failures

**Deployment**: Safe, gradual rollout
- Pre-deployment validation (87 checks)
- Post-deployment smoke tests (8 test sections)
- Canary deployment (10% → 50% → 100%)
- Automated rollback triggers
- Comprehensive runbook

---

## Contributing

We welcome contributions!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes with clear commits
4. Run tests: `npm run test`
5. Open pull request

**Areas We Welcome**:
- New AI provider integrations
- Security improvements
- Documentation enhancements
- Bug fixes

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

[MIT License](./LICENSE) - Copyright (c) 2026

**Free for personal and commercial use.**

---

## Support

- **Issues**: [GitHub Issues](https://github.com/dongvannhan1000/micro-gateway/issues)
- **Security**: nhandong0205@gmail.com
- **Documentation**: [See above](#documentation)

---

**Built with**: Hono.js, Next.js, Cloudflare Workers, D1, KV

**Repository**: https://github.com/dongvannhan1000/micro-gateway

---

## ⚠️ Development Notes

### Next.js 16 Middleware Warning

You may see this warning when running the dev server:

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**This is expected and safe to ignore.** The middleware is used for Supabase auth token refresh and is fully supported in Next.js 16. The new `proxy` API is still experimental, so we'll continue using middleware until it becomes stable.

**No action needed** - your auth flow works perfectly.
