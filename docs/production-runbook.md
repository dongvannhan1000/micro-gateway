# Production Runbook
## Micro-Security Gateway - Operations Guide

**Version**: 1.0.0
**Last Updated**: 2025-03-20
**Purpose**: Comprehensive guide for operating the Micro-Security Gateway in production

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Emergency Procedures](#emergency-procedures)
4. [Monitoring & Debugging](#monitoring--debugging)
5. [Maintenance Tasks](#maintenance-tasks)
6. [Disaster Recovery](#disaster-recovery)
7. [Contact & Escalation](#contact--escalation)

---

## Quick Reference

### Essential Commands

```bash
# Deploy to production
cd apps/gateway-api
wrangler deploy src/index.ts

# View real-time logs
wrangler tail --format pretty

# Check deployment status
wrangler versions list

# Rollback to previous version
wrangler rollback

# Check database migrations
cd packages/db
npm run migrate:remote -- --dry-run

# Apply database migrations
npm run migrate:remote

# Run smoke tests
cd apps/gateway-api
./scripts/smoke-test.sh

# Run pre-deployment checks
./scripts/pre-deploy-check.sh
```

### Key URLs

- **Gateway API**: `https://gateway-api.your-subdomain.workers.dev`
- **Dashboard**: `https://dashboard.your-domain.com`
- **Monitoring**: Cloudflare Dashboard > Workers & Pages
- **Logs**: Cloudflare Dashboard > Logs > Workers Traces

### Environment Variables

| Variable | Purpose | Location |
|----------|---------|----------|
| `SUPABASE_URL` | Supabase auth URL | wrangler.toml |
| `SUPABASE_JWT_SECRET` | JWT verification | Secret |
| `ENCRYPTION_SECRET` | API key encryption | Secret |
| `RESEND_API_KEY` | Email service | Secret |

---

## Common Issues & Solutions

### Issue 1: High Error Rate (> 10%)

**Symptoms:**
- Error rate spike in monitoring dashboard
- Customer complaints about API failures
- Circuit breaker activating frequently

**Diagnosis:**
```bash
# Check real-time logs
wrangler tail --format pretty

# Check circuit breaker status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/circuit-breaker

# Check provider health
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/provider-health
```

**Solutions:**
1. **Check if all providers are healthy**
   - If one provider is down, circuit breaker should activate
   - Verify provider API status pages

2. **Check for rate limiting**
   - High traffic may trigger provider rate limits
   - Monitor circuit breaker activations per provider

3. **Check for code deployment issues**
   - Recent deployment may have introduced bugs
   - Check recent deployments: `wrangler versions list`

4. **Scale resources if needed**
   - Increase rate limits in KV
   - Add more provider API keys

**Escalation:** If error rate > 20% for > 5 minutes, page on-call.

---

### Issue 2: High Latency (> 5000ms P95)

**Symptoms:**
- Slow API responses
- Customer complaints about timeout
- P95 latency spike in dashboard

**Diagnosis:**
```bash
# Check response times in logs
wrangler tail --format pretty | grep "duration"

# Check database query performance
# (Look for slow queries in dashboard)

# Check provider response times
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/metrics
```

**Solutions:**
1. **Check provider latency**
   - OpenAI, Anthropic, or Google may be slow
   - Check provider status pages

2. **Check for cold starts**
   - Workers may have cold starts after deployment
   - Should warm up after a few requests

3. **Check database performance**
   - Long-running queries can slow down requests
   - Review database query optimization

4. **Check for network issues**
   - Cloudflare network issues
   - Check Cloudflare status page

**Escalation:** If P95 > 10000ms for > 5 minutes, page on-call.

---

### Issue 3: Circuit Breaker Activation

**Symptoms:**
- Requests failing for specific provider
- Circuit breaker state showing "OPEN"
- Provider marked as unhealthy

**Diagnosis:**
```bash
# Check circuit breaker status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/circuit-breaker

# Check provider health
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/provider-health

# View circuit breaker events
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/logs?type=circuit_breaker
```

**Solutions:**
1. **Check if provider is actually down**
   - Visit provider status page
   - Test provider API directly

2. **Wait for automatic recovery**
   - Circuit breaker will try to recover after timeout
   - Default timeout: 60 seconds

3. **Manually reset circuit breaker** (if needed)
   - Restart worker to reset circuit state
   - Only if provider is confirmed healthy

4. **Switch to alternative provider**
   - If available, use different provider for affected models

**Escalation:** If circuit breaker activates > 10 times/minute, investigate.

---

### Issue 4: Database Query Failures

**Symptoms:**
- Errors in logs about D1 database
- Failed requests with database errors
- Dashboard not loading data

**Diagnosis:**
```bash
# Check database migrations
cd packages/db
npm run migrate:remote -- --dry-run

# Test database connection
# (Look for D1 binding errors in logs)

# Check database size
wrangler d1 info ms-gateway-db
```

**Solutions:**
1. **Check for pending migrations**
   - Apply migrations: `npm run migrate:remote`
   - Verify migration success

2. **Check database size limits**
   - D1 limit: 500MB per database
   - Clean up old data if needed

3. **Check for schema issues**
   - Recent migrations may have broken queries
   - Review recent migration changes

4. **Restore from backup** (if needed)
   - Contact Cloudflare support for backup restoration

**Escalation:** If database failures > 50%, page on-call immediately.

---

### Issue 5: Authentication Failures

**Symptoms:**
- Users getting 401 Unauthorized
- JWT validation errors
- Admin dashboard inaccessible

**Diagnosis:**
```bash
# Check JWT secret is set
wrangler secret list

# Verify Supabase is accessible
curl $SUPABASE_URL

# Test API key validation
curl -H "Authorization: Bearer $TEST_KEY" \
     https://gateway-api.your-subdomain.workers.dev/v1/models
```

**Solutions:**
1. **Verify JWT secret is correct**
   - Check SUPABASE_JWT_SECRET is set
   - Verify it matches Supabase project

2. **Check Supabase status**
   - Supabase may be experiencing issues
   - Check Supabase status page

3. **Verify API keys are valid**
   - Check API key hashing
   - Verify encryption/decryption working

4. **Check rate limiting**
   - Auth requests may be rate limited
   - Verify KV namespace is accessible

**Escalation:** If auth failures > 10%, investigate immediately.

---

### Issue 6: Cost Spikes

**Symptoms:**
- Unexpected cost increases
- High token usage
- Expensive model usage

**Diagnosis:**
```bash
# Check cost metrics
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/costs

# Check per-project costs
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/projects

# Review recent usage logs
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/logs
```

**Solutions:**
1. **Identify high-cost projects**
   - Check which projects are using expensive models
   - Contact project owners if needed

2. **Check for abuse**
   - Look for unusual usage patterns
   - Check for API key leaks

3. **Adjust rate limits**
   - Reduce rate limits for high-cost projects
   - Implement cost caps

4. **Switch to cheaper models**
   - Encourage use of cost-effective models
   - Update pricing recommendations

**Escalation:** If costs > 2x baseline, investigate immediately.

---

## Emergency Procedures

### Procedure 1: Immediate Rollback

**When to Use:**
- Error rate > 20% for 5 minutes
- P95 latency > 10000ms for 5 minutes
- Critical security issue detected
- Database failures > 50%

**Steps:**
```bash
# 1. Immediate rollback to previous version
cd apps/gateway-api
wrangler rollback

# 2. Verify rollback
curl -H "Authorization: Bearer $TEST_KEY" \
     https://gateway-api.your-subdomain.workers.dev/v1/models

# 3. Monitor logs
wrangler tail --format pretty

# 4. Run smoke tests
./scripts/smoke-test.sh

# 5. Notify team
# Post in #incidents channel
```

**Verification:**
- [ ] Error rates return to baseline
- [ ] Latency returns to baseline
- [ ] No new errors in logs
- [ ] Dashboard shows normal operation

---

### Procedure 2: Emergency Maintenance Mode

**When to Use:**
- Critical security vulnerability
- Provider-wide outage
- Database corruption
- DDoS attack

**Steps:**
```bash
# 1. Enable maintenance mode
# Set MAINTENANCE_MODE=true in wrangler secrets
wrangler secret put MAINTENANCE_MODE
# Input: true

# 2. Deploy maintenance page
wrangler deploy src/index.ts

# 3. Notify users
# Post status page update
# Send email notification

# 4. Monitor and fix issue
# Work on fix in separate branch

# 5. Disable maintenance mode
wrangler secret put MAINTENANCE_MODE
# Input: false

# 6. Deploy fix
wrangler deploy src/index.ts
```

**Verification:**
- [ ] All requests return maintenance page
- [ ] No requests reach backend
- [ ] Fix tested in staging
- [ ] Maintenance mode disabled

---

### Procedure 3: Provider Outage Response

**When to Use:**
- OpenAI/Anthropic/Google API down
- Provider rate limiting all requests
- Provider API changes breaking compatibility

**Steps:**
```bash
# 1. Check provider status
# Visit provider status page

# 2. Check circuit breaker status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/circuit-breaker

# 3. Verify circuit breaker is active
# Should show "OPEN" for affected provider

# 4. Update status page
# Notify users of provider issues

# 5. Wait for provider recovery
# Circuit breaker will auto-recover

# 6. Verify recovery
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/provider-health
```

**Verification:**
- [ ] Circuit breaker activates for failing provider
- [ ] Other providers continue working
- [ ] Users receive helpful error messages
- [ ] Circuit breaker recovers when provider is back

---

### Procedure 4: Database Corruption Recovery

**When to Use:**
- Database queries failing
- Data integrity issues
- Accidental data deletion

**Steps:**
```bash
# 1. Stop all write operations
# Enable read-only mode
wrangler secret put READ_ONLY_MODE
# Input: true

# 2. Assess damage
cd packages/db
npm run migrate:remote -- --dry-run

# 3. Contact Cloudflare support
# Request database backup restoration

# 4. Restore from backup
# Follow Cloudflare support instructions

# 5. Verify data integrity
# Run validation queries

# 6. Disable read-only mode
wrangler secret put READ_ONLY_MODE
# Input: false
```

**Verification:**
- [ ] Database queries succeed
- [ ] Data integrity verified
- [ ] No data loss
- [ ] Application恢复正常

---

## Monitoring & Debugging

### Real-Time Log Monitoring

```bash
# View all logs
wrangler tail --format pretty

# Filter errors
wrangler tail --format pretty | grep -i error

# Filter by status code
wrangler tail --format pretty | grep "200"

# View specific endpoint logs
wrangler tail --format pretty | grep "/v1/chat/completions"

# Save logs to file
wrangler tail --format pretty > logs.txt
```

### Metrics Dashboard

**Key Metrics to Monitor:**

1. **Error Rate**
   - Target: < 2%
   - Warning: > 5%
   - Critical: > 10%

2. **Latency**
   - P50 Target: < 500ms
   - P95 Target: < 2000ms
   - P99 Target: < 5000ms

3. **Circuit Breaker**
   - Activations per minute
   - Open duration
   - Provider health

4. **Cost Tracking**
   - Cost per provider
   - Cost per project
   - Cost per model

5. **Throughput**
   - Requests per second
   - Tokens per second
   - Active users

### Cloudflare Workers Traces

```bash
# Enable traces in wrangler.toml
[observability.traces]
enabled = true
head_sampling_rate = 0.1  # 10% sampling

# View traces in Cloudflare Dashboard
# Navigate to: Workers & Pages > Your Worker > Monitoring > Traces
```

### Debugging Common Issues

**Issue: Worker not responding**
```bash
# Check worker is deployed
wrangler versions list

# Test worker endpoint
curl https://gateway-api.your-subdomain.workers.dev/

# Check worker logs
wrangler tail --format pretty
```

**Issue: Database connection errors**
```bash
# Verify database binding
cat wrangler.toml | grep -A 3 "\[\[d1_databases\]\]"

# Test database query
wrangler d1 execute ms-gateway-db --remote --command "SELECT 1"

# Check database migrations
cd packages/db && npm run migrate:remote -- --dry-run
```

**Issue: KV cache errors**
```bash
# Verify KV namespace binding
cat wrangler.toml | grep -A 3 "\[\[kv_namespaces\]\]"

# Test KV read/write
wrangler kv:key put --binding=RATE_LIMIT_KV "test-key" "test-value"
wrangler kv:key get --binding=RATE_LIMIT_KV "test-key"
```

---

## Maintenance Tasks

### Daily Tasks

- [ ] Review error rates (should be < 2%)
- [ ] Check latency metrics (P95 < 2000ms)
- [ ] Verify circuit breaker status
- [ ] Review cost tracking (no spikes)
- [ ] Check for security events

### Weekly Tasks

- [ ] Review performance trends
- [ ] Check database size (< 500MB)
- [ ] Review provider health history
- [ ] Analyze cost patterns
- [ ] Update documentation if needed

### Monthly Tasks

- [ ] Review and rotate secrets
- [ ] Clean up old logs
- [ ] Review and update rate limits
- [ ] Analyze usage patterns
- [ ] Optimize database queries
- [ ] Review and update runbook

### Quarterly Tasks

- [ ] Full security audit
- [ ] Disaster recovery test
- [ ] Performance optimization review
- [ ] Cost optimization analysis
- [ ] Architecture review

---

## Disaster Recovery

### Backup Strategy

**Database Backups:**
- **Frequency**: Automatic (Cloudflare managed)
- **Retention**: 30 days
- **Location**: Cloudflare D1 backup storage

**Code Backups:**
- **Repository**: Git (GitHub)
- **Branches**: main, dev, feature branches
- **Tags**: Version tags for each release

**Configuration Backups:**
- **wrangler.toml**: Version controlled
- **Secrets**: Documented in secure vault
- **Environment variables**: Documented in runbook

### Recovery Procedures

**Scenario 1: Worker Deployment Failure**
```bash
# 1. List previous versions
wrangler versions list

# 2. Rollback to known good version
wrangler rollback --version <version-id>

# 3. Verify rollback
./scripts/smoke-test.sh
```

**Scenario 2: Data Loss**
```bash
# 1. Contact Cloudflare support
# Request database restoration

# 2. Restore from backup
# Follow support instructions

# 3. Verify data integrity
# Run validation queries

# 4. Update application if needed
# Deploy any schema changes
```

**Scenario 3: Complete System Failure**
```bash
# 1. Assess damage
# Check all systems

# 2. Prioritize recovery
# Worker first, then database, then monitoring

# 3. Deploy to new Cloudflare account (if needed)
# Update DNS records

# 4. Verify all systems
# Run comprehensive tests

# 5. Notify stakeholders
# Provide recovery timeline
```

### Recovery Time Objectives

| Scenario | RTO (Recovery Time) | RPO (Data Loss) |
|----------|-------------------|-----------------|
| Worker failure | 5 minutes | 0 minutes |
| Database failure | 30 minutes | 5 minutes |
| Complete system | 2 hours | 15 minutes |

---

## Contact & Escalation

### On-Call Rotation

| Role | Name | Contact | Hours |
|------|------|---------|-------|
| Primary On-Call | [NAME] | [PHONE] | 24/7 |
| Secondary On-Call | [NAME] | [PHONE] | 24/7 |
| Engineering Lead | [NAME] | [PHONE] | Business hours |
| CTO | [NAME] | [PHONE] | Critical only |

### Escalation Matrix

**Level 1: Issue Detected**
- Post in #incidents Slack channel
- Include error details and metrics

**Level 2: No Response (5 min)**
- Page primary on-call
- Include incident details

**Level 3: No Response (15 min)**
- Page secondary on-call
- Escalate to engineering lead

**Level 4: Critical Incident (30 min)**
- Page engineering lead
- Prepare incident report

**Level 5: Sev 1 Incident**
- Page CTO immediately
- Mobilize entire team

### Communication Channels

- **#incidents**: Incident response and coordination
- **#deployments**: Deployment announcements and monitoring
- **#engineering**: General engineering discussions
- **#alerts**: Automated alert notifications

### Incident Response Template

```markdown
## Incident Report

**Severity**: [Sev 1/2/3/4]
**Start Time**: [YYYY-MM-DD HH:MM:SS]
**Incident Commander**: [Name]

### Summary
[Brief description of the incident]

### Impact
- [x] Customer-facing
- [x] Internal tools
- [ ] Data loss
- [ ] Security breach

### Timeline
- [HH:MM] Incident detected
- [HH:MM] Investigation started
- [HH:MM] Mitigation implemented
- [HH:MM] Service restored
- [HH:MM] Incident resolved

### Root Cause
[What caused the incident]

### Resolution
[How it was fixed]

### Follow-up Actions
- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]

### Lessons Learned
[What can we improve]
```

---

## Appendix: Useful Queries

### Database Queries

```sql
-- Check total requests per project
SELECT project_id, COUNT(*) as request_count
FROM metrics
GROUP BY project_id
ORDER BY request_count DESC
LIMIT 10;

-- Check error rate by provider
SELECT provider,
       COUNT(*) as total_requests,
       SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors,
       ROUND(SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as error_rate
FROM metrics
WHERE timestamp > datetime('now', '-1 hour')
GROUP BY provider;

-- Check circuit breaker activations
SELECT provider, COUNT(*) as activations
FROM circuit_breaker_events
WHERE event_type = 'OPEN'
  AND timestamp > datetime('now', '-24 hours')
GROUP BY provider;

-- Check costs by project
SELECT project_id,
       SUM(cost) as total_cost,
       SUM(token_count) as total_tokens
FROM metrics
WHERE timestamp > datetime('now', '-24 hours')
GROUP BY project_id
ORDER BY total_cost DESC;
```

### Curl Commands

```bash
# Test health endpoint
curl https://gateway-api.your-subdomain.workers.dev/health

# Test models endpoint
curl -H "Authorization: Bearer $API_KEY" \
     https://gateway-api.your-subdomain.workers.dev/v1/models

# Test chat completions
curl -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}],"max_tokens":10}' \
     https://gateway-api.your-subdomain.workers.dev/v1/chat/completions

# Get admin metrics
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/metrics

# Get circuit breaker status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     https://gateway-api.your-subdomain.workers.dev/api/admin/circuit-breaker
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-03-20 | DevOps Automator | Initial runbook creation |

---

**Next Steps**: Review this runbook, customize contact information, and distribute to on-call team.
