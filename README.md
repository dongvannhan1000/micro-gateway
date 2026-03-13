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
│   ├── Multi-provider routing
│   ├── Rate limiting (KV)
│   ├── Anomaly detection
│   └── PII scrubbing
└── D1 Database (SQLite)
    ├── Projects & API keys
    ├── Provider configs (encrypted)
    └── Usage tracking
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

## Documentation

- [**SELF_HOSTED.md**](./SELF_HOSTED.md) - Deployment guide
- [**SECURITY.md**](./SECURITY.md) - Security architecture
- [**CONTRIBUTING.md**](./CONTRIBUTING.md) - Contribution guidelines
- [**LICENSE**](./LICENSE) - MIT License

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
