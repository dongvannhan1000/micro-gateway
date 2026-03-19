# Production Rollout Plan
## Micro-Security Gateway - Gradual Deployment Strategy

**Version**: 1.0.0
**Last Updated**: 2025-03-20
**Deployment Type**: Canary Rollout with Automated Rollback
**Target Environment**: Cloudflare Workers Production

---

## Executive Summary

This document outlines the comprehensive gradual rollout strategy for the Micro-Security Gateway to production. The plan uses a **canary deployment approach** with automated rollback triggers, comprehensive monitoring, and clear success criteria at each phase.

### Key Safety Features
- **Zero-downtime deployment** using Cloudflare Workers instant rollout
- **Automated rollback triggers** based on error rates and latency
- **Gradual traffic shifting** (10% → 50% → 100%)
- **Comprehensive monitoring** with Cloudflare Workers Traces
- **Feature flags** for risky functionality

---

## Deployment Strategy: Canary with Traffic Splitting

### Why Canary Deployment?

**Advantages for Cloudflare Workers:**
1. **Instant rollback** - Revert to previous version in seconds
2. **Real traffic validation** - Test with production data patterns
3. **Risk containment** - Limit blast radius to small user subset
4. **Metric-driven** - Objective go/no-go decisions

### Canary Phases Overview

```
Phase 0: Pre-Production Validation
Phase 1: Canary 10% (30 minutes)
Phase 2: Canary 50% (1 hour)
Phase 3: Full Rollout 100%
Phase 4: Post-Deployment Monitoring (24 hours)
```

---

## Phase 0: Pre-Production Validation

### Timeline: 1-2 hours before deployment

### Checklist

- [ ] **All tests pass**: `npm run test:all` from gateway root
- [ ] **Database migrations applied**: `cd packages/db && npm run migrate:remote`
- [ ] **Security audit passed**: No critical vulnerabilities
- [ ] **Load test completed**: P95 latency < 2000ms at 1000 RPS
- [ ] **Monitoring configured**: Cloudflare Workers Traces enabled
- [ ] **Alerts configured**: Error rate, latency, circuit breaker
- [ ] **Rollback plan tested**: Verified previous version can be redeployed
- [ ] **Stakeholder notification**: Engineering team on standby
- [ ] **Documentation updated**: Runbooks and runbooks reviewed

### Validation Commands

```bash
# Run full test suite
cd apps/gateway-api
npm run test:all

# Verify database migrations
cd packages/db
npm run migrate:remote -- --dry-run

# Check current production version
wrangler versions list --limit 1

# Verify secrets are set
wrangler secret list
```

### Success Criteria
- All unit and integration tests pass
- No database migration conflicts
- Load test meets performance baseline
- All monitoring dashboards are receiving data

---

## Phase 1: Canary Deployment - 10% Traffic

### Timeline: 30 minutes minimum

### Deployment Steps

1. **Deploy new version** to production (doesn't receive traffic yet)
   ```bash
   cd apps/gateway-api
   wrangler deploy src/index.ts
   ```

2. **Verify deployment success**
   ```bash
   # Check deployment status
   wrangler versions list --limit 5

   # Verify worker is responding
   curl -H "Authorization: Bearer $TEST_KEY" \
        https://gateway-api.your-subdomain.workers.dev/v1/models
   ```

3. **Enable 10% traffic splitting** via Cloudflare Workers Analytics
   - Use Cloudflare API to set traffic split
   - OR use feature flag in code for gradual enablement

4. **Monitor metrics continuously** for 30 minutes

### Monitoring Dashboard - Watch These Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | < 5% | Continue monitoring |
| P95 Latency | < 2000ms | Continue monitoring |
| Circuit Breaker Trips | < 5/min | Continue monitoring |
| Provider Health | All healthy | Continue monitoring |
| Cost Tracking | No spikes | Continue monitoring |

### Automated Rollback Triggers

**Immediate rollback (< 5 min) if:**
- Error rate > 20% for 2 minutes
- P95 latency > 10000ms for 2 minutes
- Any critical security issue detected
- Database query failures > 50%

**Manual rollback if:**
- Unexpected cost spikes > 2x baseline
- Customer complaints > 5 in 15 minutes
- Dashboard shows degraded performance
- Circuit breaker activations > 20/min

### Success Criteria for Phase 1

- [ ] Error rate < 5% for entire 30-minute period
- [ ] P95 latency < 2000ms for entire period
- [ ] No circuit breaker trips for critical providers
- [ ] No customer complaints or support tickets
- [ ] Dashboard metrics show normal operation
- [ ] Cost tracking within expected ranges

**IF ANY CRITERIA FAIL**: Execute rollback immediately

### Rollback Procedure

```bash
# Rollback to previous version
wrangler rollback --version <previous-version-id>

# Verify rollback
curl -H "Authorization: Bearer $TEST_KEY" \
     https://gateway-api.your-subdomain.workers.dev/v1/models

# Check logs for errors
wrangler tail --format pretty
```

---

## Phase 2: Canary Deployment - 50% Traffic

### Timeline: 1 hour minimum

### Prerequisites
- Phase 1 success criteria met
- No anomalies detected in first 30 minutes
- Team approves progression to Phase 2

### Deployment Steps

1. **Increase traffic to 50%**
   - Update traffic split via Cloudflare API
   - OR update feature flag percentage

2. **Intensive monitoring** for 1 hour
   - Watch for any degradation
   - Monitor circuit breaker activations
   - Check provider health closely

3. **Run smoke tests** against production endpoint
   ```bash
   # Test all major endpoints
   ./scripts/smoke-test.sh
   ```

### Enhanced Monitoring - Additional Checks

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error Rate | < 3% | Continue monitoring |
| P95 Latency | < 1500ms | Continue monitoring |
| P99 Latency | < 5000ms | Continue monitoring |
| Circuit Breaker Trips | < 10/min | Investigate if > 5/min |
| Provider Failures | < 2% | Investigate immediately |

### Success Criteria for Phase 2

- [ ] Error rate < 3% for entire 60-minute period
- [ ] P95 latency < 1500ms (improved from Phase 1)
- [ ] No circuit breaker trips for extended periods
- [ ] All provider health checks passing
- [ ] No customer complaints
- [ ] Dashboard shows stable performance

**IF ANY CRITERIA FAIL**: Rollback to Phase 1 (10%) or previous version

---

## Phase 3: Full Rollout - 100% Traffic

### Timeline: Immediate after Phase 2 success

### Deployment Steps

1. **Increase traffic to 100%**
   - Update traffic split to 100%
   - Remove canary infrastructure

2. **Final verification**
   ```bash
   # Run comprehensive smoke test
   ./scripts/smoke-test.sh --comprehensive

   # Verify all endpoints responding
   curl -H "Authorization: Bearer $TEST_KEY" \
        https://gateway-api.your-subdomain.workers.dev/v1/models

   # Check worker health
   wrangler tail --format pretty
   ```

3. **Announce deployment** to stakeholders
   - Post in #deployments Slack channel
   - Update status page
   - Notify on-call team

### Post-Deployment Checklist

- [ ] All traffic on new version
- [ ] No errors in Cloudflare Workers logs
- [ ] Monitoring dashboards show normal operation
- [ ] No customer complaints within 15 minutes
- [ ] Performance metrics meet baseline
- [ ] Cost tracking normal

---

## Phase 4: Post-Deployment Monitoring

### Timeline: 24 hours

### Monitoring Schedule

**First Hour (Critical Period)**
- Check metrics every 5 minutes
- Monitor error rates closely
- Watch for any latency spikes
- Review circuit breaker activations

**Next 4 Hours**
- Check metrics every 15 minutes
- Monitor provider health
- Review cost tracking
- Check for any customer complaints

**Next 24 Hours**
- Hourly metric reviews
- Daily performance report
- Cost analysis
- Customer feedback review

### Daily Health Check Report

Generate automated report at end of day:

```bash
# Generate daily health report
./scripts/generate-health-report.sh --date 2025-03-20
```

Report includes:
- Total requests handled
- Error rate and error breakdown
- P50, P95, P99 latency
- Circuit breaker activations
- Provider health status
- Cost tracking summary
- Top error patterns

### Success Criteria for 24-Hour Period

- [ ] Error rate < 2% overall
- [ ] P95 latency < 1500ms overall
- [ ] No extended outages (> 5 minutes)
- [ ] No critical customer complaints
- [ ] Cost tracking within budget
- [ ] All providers healthy > 99% of time

---

## Monitoring and Alerting Configuration

### Cloudflare Workers Traces

**Current Configuration** (wrangler.toml):
```toml
[observability.traces]
enabled = true
head_sampling_rate = 0.1  # 10% sampling
```

**For Production Rollout**:
- Increase sampling to 20% for better visibility
- Enable for 48 hours during rollout
- Reduce back to 10% after stable

### Alert Thresholds

| Alert | Severity | Threshold | Duration | Action |
|-------|----------|-----------|----------|--------|
| High Error Rate | Critical | > 10% | 5 min | Page on-call |
| Extreme Latency | Critical | > 10000ms | 5 min | Page on-call |
| High Latency | Warning | > 5000ms | 10 min | Slack notification |
| Circuit Breaker | Warning | > 5/min | 5 min | Investigate |
| Provider Down | Critical | Any provider down | Immediate | Page on-call |
| Cost Spike | Warning | > 2x baseline | 15 min | Review |

### Monitoring Dashboards

**Required Dashboards:**
1. **Overview Dashboard** - High-level metrics
2. **Performance Dashboard** - Latency histograms
3. **Error Dashboard** - Error rates and breakdown
4. **Circuit Breaker Dashboard** - Circuit state per provider
5. **Provider Health Dashboard** - Provider availability
6. **Cost Tracking Dashboard** - Cost per provider/model

### Alert Escalation Path

1. **Level 1**: Slack notification to #engineering
2. **Level 2**: Page on-call engineer (5 min no response)
3. **Level 3**: Page engineering lead (15 min no response)
4. **Level 4**: Page CTO (30 min critical incident)

---

## Rollback Procedures

### Automated Rollback

Triggered by monitoring system when thresholds exceeded.

**Rollback Script** (executed automatically):
```bash
#!/bin/bash
# scripts/auto-rollback.sh

echo "Executing automated rollback..."

# Get previous version
PREVIOUS_VERSION=$(wrangler versions list --limit 2 | tail -1 | awk '{print $1}')

# Rollback to previous version
wrangler rollback --version $PREVIOUS_VERSION

# Notify team
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"🚨 Automated rollback executed. Reverted to version $PREVIOUS_VERSION\"}"

echo "Rollback complete. Version: $PREVIOUS_VERSION"
```

### Manual Rollback

**Emergency Rollback** (< 2 minutes):
```bash
# Quick rollback to previous version
wrangler rollback

# Verify rollback
curl -H "Authorization: Bearer $TEST_KEY" \
     https://gateway-api.your-subdomain.workers.dev/v1/models
```

**Specific Version Rollback**:
```bash
# List recent versions
wrangler versions list

# Rollback to specific version
wrangler rollback --version <version-id>
```

### Rollback Verification

After rollback, verify:
1. [ ] Error rates return to baseline
2. [ ] Latency returns to baseline
3. [ ] No new errors in logs
4. [ ] Dashboard shows normal operation
5. [ ] Customer complaints stop

---

## Feature Flags

### Implementation

For risky changes, use feature flags to enable functionality gradually.

**Example Feature Flag:**
```typescript
// src/lib/feature-flags.ts
export const FEATURE_FLAGS = {
  NEW_CIRCUIT_BREAKER: env.NEW_CIRCUIT_BREAKER_ENABLED === 'true',
  ENHANCED_RATE_LIMITING: env.ENHANCED_RATE_LIMITING === 'true',
  ADVANCED_ANOMALY_DETECTION: env.ADVANCED_ANOMALY_DETECTION === 'true',
} as const;
```

### Feature Flag Rollout Process

1. **Deploy with flag disabled** (default)
2. **Enable for test users** (5% of traffic)
3. **Monitor for 1 hour**
4. **Enable for 50% of traffic**
5. **Monitor for 2 hours**
6. **Enable for 100% of traffic**

### Rollback with Feature Flags

If issue detected with feature flag:
1. **Disable flag immediately** via environment variable
2. **Deploy new version** with flag disabled
3. **Monitor for improvement**
4. **Investigate issue** separately

---

## Communication Plan

### Pre-Deployment (1 week before)

**Audience**: Engineering team, stakeholders

**Message**:
```
📢 Scheduled Production Deployment
Date: [DATE]
Time: [TIME WINDOW]
Duration: 2-3 hours
Impact: Zero downtime expected
Plan: Canary rollout (10% → 50% → 100%)
```

### Deployment Start

**Audience**: Engineering team

**Message**:
```
🚀 Deployment Started
Phase 0: Pre-production validation
Next: Phase 1 (10% traffic) in 1 hour
Monitor: #deployment-watch
```

### Phase Transitions

**Audience**: Engineering team

**Message**:
```
✅ Phase 1 Complete
Error rate: 2.3%
P95 latency: 1,450ms
Circuit breakers: Normal
Proceeding to Phase 2 (50% traffic)
```

### Deployment Complete

**Audience**: All stakeholders

**Message**:
```
✅ Deployment Complete
Version: [VERSION]
Duration: 2 hours
Impact: Zero downtime
Next: 24-hour monitoring period
```

---

## Post-Deployment Review

### 24-Hour Review Meeting

**Attendees**: Engineering team, product manager

**Agenda**:
1. Review deployment metrics
2. Discuss any issues encountered
3. Customer feedback summary
4. Lessons learned
5. Action items for next deployment

### 7-Day Review

**Deliverables**:
1. **Performance Report** - Compare to baseline
2. **Cost Analysis** - Actual vs. projected costs
3. **Incident Report** - Any incidents and resolutions
4. **Customer Feedback** - Summary of feedback
5. **Improvement Plan** - Action items for next release

---

## Success Metrics

### Deployment Success Criteria

- [ ] Zero downtime during deployment
- [ ] Error rate < 2% for 24 hours
- [ ] P95 latency < 1500ms for 24 hours
- [ ] No critical incidents
- [ ] Customer satisfaction maintained
- [ ] Cost tracking within budget

### Performance Baselines

| Metric | Baseline | Target | Actual |
|--------|----------|--------|--------|
| Error Rate | < 5% | < 2% | TBD |
| P50 Latency | < 500ms | < 400ms | TBD |
| P95 Latency | < 2000ms | < 1500ms | TBD |
| P99 Latency | < 5000ms | < 3000ms | TBD |
| Throughput | 1000 RPS | 1500 RPS | TBD |
| Availability | 99.9% | 99.95% | TBD |

---

## Emergency Contacts

### On-Call Rotation

| Role | Name | Contact | Hours |
|------|------|---------|-------|
| Primary On-Call | [NAME] | [PHONE] | 24/7 |
| Secondary On-Call | [NAME] | [PHONE] | 24/7 |
| Engineering Lead | [NAME] | [PHONE] | Business hours |
| CTO | [NAME] | [PHONE] | Critical only |

### Escalation Matrix

1. **Issue Detected** → Post in #incidents
2. **5 min no response** → Page primary on-call
3. **15 min no response** → Page secondary on-call
4. **30 min critical** → Page engineering lead
5. **Critical incident** → Page CTO immediately

---

## Appendix: Deployment Commands Reference

### Quick Reference

```bash
# Deploy to production
cd apps/gateway-api
wrangler deploy src/index.ts

# Check deployment status
wrangler versions list

# Rollback to previous version
wrangler rollback

# View real-time logs
wrangler tail --format pretty

# Run smoke tests
./scripts/smoke-test.sh

# Check database migrations
cd packages/db
npm run migrate:remote -- --dry-run

# Apply database migrations
npm run migrate:remote

# Check worker health
curl -H "Authorization: Bearer $TEST_KEY" \
     https://gateway-api.your-subdomain.workers.dev/v1/models

# Generate health report
./scripts/generate-health-report.sh
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-03-20 | DevOps Automator | Initial rollout plan |

---

**Next Steps**: Review and approve this plan, then proceed to execute pre-production checklist.
