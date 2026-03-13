# Security Policy

## Reporting a Vulnerability

**DO NOT** report security vulnerabilities through public GitHub issues.

**Email**: nhandong0205@gmail.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

Response time: Within 48 hours

---

## Encryption Architecture

### At Rest
- **Algorithm**: AES-256-GCM (NIST-approved)
- **Key Derivation**: HKDF-SHA256
- **Per-user keys**: Isolation between users
- **No plaintext**: Credentials never stored in plain

### In Transit
- **Protocol**: TLS 1.3
- **Certificate Pinning**: Enforced on provider endpoints
- **Forward Secrecy**: Ephemeral Diffie-Hellman

### Authentication
- **Gateway Keys**: SHA-256 hashed + salted
- **Dashboard**: Supabase Auth (OAuth 2.0 + JWT)
- **Sessions**: HTTP-only, Secure, SameSite cookies

---

## Key Management

### Self-Hosted (Recommended)
```
Your Infrastructure
├── You control ENCRYPTION_SECRET
├── You control access logs
└── 100% data ownership
```

**Setup**:
```bash
# Generate strong secret
ENCRYPTION_SECRET=$(openssl rand -base64 32)
```

**Best Practices**:
- Rotate secrets every 90 days
- Use environment variable management
- Monitor security event logs

### Managed (Optional)
```
Cloud Infrastructure
├── Encrypted key storage
├── Per-user encryption keys
└── Security audit logging
```

---

## Security Features

| Feature | Description |
|---------|-------------|
| **Rate Limiting** | Per-key configurable limits |
| **Anomaly Detection** | Prompt injection attack blocking |
| **PII Scrubbing** | GDPR/HIPAA data redaction |
| **Hard Spending Caps** | Prevent bill shock |
| **Audit Logging** | All key access events |
| **Content Filtering** | Sensitive data detection |

---

## Compliance

### GDPR
- ✅ PII scrubbing (low/medium/high levels)
- ✅ Right to deletion (immediate with receipts)
- ✅ Data portability
- ✅ EU data residency (self-hosted)

### HIPAA
- ✅ PII scrubbing configurable for PHI
- ✅ Audit logging for all access
- ⚠️ Managed version requires BAA

---

## Best Practices

### Deployment
1. **Generate strong secrets**:
   ```bash
   ENCRYPTION_SECRET=$(openssl rand -base64 32)
   SUPABASE_JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **Use separate environments**:
   - Dev, staging, production
   - Different Supabase projects
   - Different encryption keys

3. **Enable monitoring**:
   - Review security event logs
   - Set up alerts for suspicious activity
   - Monitor rate limit violations

### Key Rotation
```bash
# Every 90 days
npx wrangler secret put ENCRYPTION_SECRET
# Update all encrypted provider keys
```

### Network Security
- ✅ HTTPS only (TLS 1.3)
- ✅ Cloudflare WAF enabled
- ✅ IP whitelist (optional, enterprise)

---

## Data Handling

### What We Log
- Request metadata (model, tokens, cost, latency)
- Security events (auth failures, rate limits, anomalies)
- PII-scrubbed samples (for monitoring)

### What We DON'T Log
- Request/response bodies (prompts, AI responses)
- Sensitive data (automatically scrubbed)
- Plain API keys (never logged)

### Data Deletion
- **User Initiated**: Immediate deletion + cryptographic erasure
- **Automatic**: Inactive projects deleted after 12 months
- **Verification**: Deletion receipts provided

---

## Anomaly Detection

**Patterns Detected**:
- Prompt injection attacks
- Suspicious request frequency
- Unusual model parameters
- Potential data exfiltration

**Response**:
- Block with 403 status
- Log security event
- Alert via dashboard
- Rate limit offending IP

---

## Dependency Security

**Vulnerability Management**:
- Automated scanning (Dependabot)
- Security updates within 7 days
- Semantic versioning

**Current Status** (March 2026):
- 0 critical vulnerabilities
- 0 high vulnerabilities
- All dependencies up-to-date

---

## Comparison: Self-Hosted vs Managed

| Feature | Self-Hosted | Managed |
|---------|-------------|---------|
| Key Storage | Your infra | Encrypted cloud |
| Encryption | You control | Per-user keys |
| Access Control | 100% you | Zero-access |
| Compliance | Self-managed | SOC2 ready |
| Cost | FREE | $29/month |

---

## Contact

- **Security**: nhandong0205@gmail.com
- **Issues**: [GitHub Issues](https://github.com/dongvannhan1000/micro-gateway/issues)
- **Documentation**: [README.md](./README.md)

---

**Last Updated**: March 13, 2026
