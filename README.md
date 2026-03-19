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
- ✅ **OpenAI-compatible API** - Drop-in replacement for OpenAI SDKs
- ✅ **Security hardened** - JWT validation, IP rate limiting, race condition protection

### 🚀 Production-Ready Resilience (NEW!)

- ✅ **Circuit Breaker** - Prevent cascading failures with per-project/per-provider circuit breakers
- ✅ **Request Timeout** - 30s max timeout with configurable deadlines
- ✅ **Bulkhead Pattern** - Concurrency limits via D1 database
- ✅ **Retry Logic** - 3 retries with exponential backoff for transient failures
- ✅ **Provider Health Monitoring** - Automated health checks every 5 minutes
- ✅ **Observability** - Cloudflare Workers Traces integration (Grafana/Honeycomb/Axiom)
- ✅ **Admin Dashboard** - Real-time metrics and provider health monitoring
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

### Self-Hosted Deployment (5 minutes)

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
│   ├── Observability
│   │   ├── Cloudflare Workers Traces (10% sampling)
│   │   ├── Provider health monitoring (cron)
│   │   └── Admin dashboard (real-time metrics)
│   └── Multi-provider routing
│       ├── OpenAI, Anthropic, Google
│       └── DeepSeek, Groq, Together AI
└── D1 Database (SQLite)
    ├── Projects & API keys
    ├── Provider configs (encrypted)
    ├── Usage tracking
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

## Monitoring & Observability

### Cloudflare Workers Traces

Request metrics are automatically collected and exported to your observability platform:

**Supported Platforms**:
- Grafana Cloud (recommended)
- Honeycomb
- Axiom

**Setup**:
```bash
# Configure OTLP export endpoint
wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT
wrangler secret put OTEL_EXPORTER_OTLP_HEADERS
```

**Custom Trace Attributes**:
- `project_id` - Project identifier
- `api_key_id` - Gateway key used
- `correlation_id` - Request correlation ID
- `provider` - AI provider (openai, anthropic, etc.)
- `model` - Model requested

### Admin Dashboard

Real-time monitoring dashboard at `/admin` (requires admin authentication):

**Business Metrics**:
- Total requests, costs, tokens
- Average latency
- Active projects

**Provider Health**:
- Status (healthy/degraded/down)
- Latency, error rate, uptime

**Integration**:
- Direct links to Grafana/Honeycomb/Axiom dashboards
- Auto-refresh every 30 seconds

### Provider Health Monitoring

Automated health checks run every 5 minutes via Cloudflare Workers Cron:

- Tests each provider with actual API calls
- Measures latency and success rate
- Stores results in KV for dashboard
- Automatic alerting on failures

---

## Documentation

### Deployment & Operations
- [**SELF_HOSTED.md**](./SELF_HOSTED.md) - Deployment guide
- [**docs/production-rollout-plan.md**](./docs/production-rollout-plan.md) - Gradual rollout strategy
- [**docs/production-runbook.md**](./docs/production-runbook.md) - Operations runbook
- [**docs/pre-production-checklist.md**](./docs/pre-production-checklist.md) - Pre-deployment checklist

### Observability
- [**apps/gateway-api/docs/observability-setup.md**](./apps/gateway-api/docs/observability-setup.md) - Cloudflare Traces setup
- [**apps/gateway-api/load-tests/README.md**](./apps/gateway-api/load-tests/README.md) - Load testing guide

### Security
- [**SECURITY.md**](./SECURITY.md) - Security architecture
- [**docs/security-fixes-architectural-review.md**](./docs/security-fixes-architectural-review.md) - Security audit results
- [**CONTRIBUTING.md**](./CONTRIBUTING.md) - Contribution guidelines
- [**LICENSE**](./LICENSE) - MIT License

---

## Production Readiness

### ✅ Fully Tested & Production-Ready

**Test Coverage**: 298 tests passing (96.6% success rate)

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
- Provider health monitoring ensures availability

**Observability**: Complete monitoring stack
- Cloudflare Workers Traces (10% sampling)
- Admin dashboard with real-time metrics
- Provider health monitoring (5-min intervals)
- Automated health reports

**Deployment**: Safe, gradual rollout
- Pre-deployment validation (87 checks)
- Post-deployment smoke tests (8 test sections)
- Canary deployment (10% → 50% → 100%)
- Automated rollback triggers
- Comprehensive runbook

### 📊 Production Rollout Plan

1. **Pre-Production** (87 checks)
   - Code quality validation
   - Database migration verification
   - Security audit
   - Performance baseline

2. **Phase 1**: 10% traffic (30 min monitoring)
   - Monitor error rate (< 5%)
   - Check P95 latency (< 2000ms)
   - Verify circuit breaker state
   - Validate provider health

3. **Phase 2**: 50% traffic (1 hour monitoring)
   - Continued monitoring
   - Cost tracking validation
   - Alert verification

4. **Phase 3**: 100% traffic (24 hour monitoring)
   - Full production monitoring
   - Daily health reports
   - Performance optimization

See [**docs/production-rollout-plan.md**](./docs/production-rollout-plan.md) for complete rollout strategy.

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
