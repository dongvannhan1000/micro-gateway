# Self-Hosted Deployment

Deploy Micro-Security Gateway on your own infrastructure. **Your provider keys never leave your servers.**

## Why Self-Hosted?

- **Privacy**: Keys and AI requests stay on your infra
- **Security**: Full control over encryption and logs
- **Compliance**: GDPR/HIPAA compliant with data residency
- **Cost**: Free for most projects (Cloudflare free tier)

---

## Quick Start (5 minutes)

```bash
# 1. Clone repository
git clone https://github.com/yourorg/micro-gateway.git
cd micro-gateway
npm install

# 2. Create Supabase project (free)
#    Go to https://supabase.com → New Project
#    Copy Project URL + JWT Secret

# 3. Configure gateway
cd apps/gateway-api
cp wrangler.toml.example wrangler.toml
# Edit wrangler.toml with your Supabase credentials

# 4. Create D1 database + KV namespace
npx wrangler d1 create ms-gateway-db  # Copy database_id
npx wrangler kv:namespace create "RATE_LIMIT_KV"  # Copy namespace id
# Update wrangler.toml with both IDs

# 5. Set secrets
npx wrangler secret put SUPABASE_JWT_SECRET  # From Supabase dashboard
npx wrangler secret put ENCRYPTION_SECRET  # Generate: openssl rand -base64 32

# 6. Deploy
npx wrangler deploy

# 7. Test
curl https://your-worker.workers.dev/health
# Expected: {"status":"ok"}
```

---

## Add Provider Keys

**After deployment**, add provider keys via dashboard UI:

1. Access dashboard: `https://your-dashboard.vercel.app`
2. Create project
3. Go to **Settings → Provider Configs**
4. Add keys: OpenAI `sk-xxx`, Anthropic `sk-ant-xxx`, etc.

Keys are encrypted and stored in **YOUR** D1 database (not ours).

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase | ✅ Yes |
| `ENCRYPTION_SECRET` | For encrypting provider keys | ✅ Yes |

Get secrets from: Supabase Dashboard → Settings → API

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

## Troubleshooting

**Issue**: "Invalid JWT Token"
- Verify `SUPABASE_JWT_SECRET` matches your Supabase project

**Issue**: "Database Connection Failed"
- Check `SUPABASE_URL` in wrangler.toml
- Verify D1 migrations: `cd packages/db && npm run migrate:remote`

**Issue**: "Encryption Failed"
- Verify `ENCRYPTION_SECRET` is set
- Must be same as when keys were added

---

## Cost

**Cloudflare Workers Free Tier**:
- 100K requests/day
- D1 Database: 5M reads/day
- KV Storage: 100K reads/day
- **Total**: $0-5/month for most projects

---

## Next Steps

1. [View Security Architecture](./SECURITY.md)
2. [Contributing Guidelines](./CONTRIBUTING.md)
3. [Report Security Issues](mailto:security@example.com)

---

**Deployed successfully?** 🎉 Star the repo to support the project!
