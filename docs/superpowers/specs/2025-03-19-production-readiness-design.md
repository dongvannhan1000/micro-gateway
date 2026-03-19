# Production Readiness Design: Load Handling & Observability

**Date:** 2025-03-19
**Status:** Draft
**Author:** Claude Sonnet 4.6
**Approach:** Cloudflare-Native (Recommended)

## Problem Statement

Micro-Security Gateway is preparing for production launch. Current implementation has basic rate limiting and security middleware, but lacks production-grade load handling and observability features needed for reliable operation.

### Key Concerns (Priority Order)

**Load Handling:**
1. Sudden Traffic Spike - One project sending thousands of requests, crashing gateway
2. Upstream Outage - AI providers (OpenAI/Anthropic/Google) going down
3. Resource Exhaustion - KV/DB quota exceeded, system-wide failure
4. Slow AI Provider - Provider responses taking 10+ seconds

**Observability:**
1. Hard to Debug - Cannot trace requests from start to finish
2. No Visibility - Don't know how many requests are failing or why
3. No Alerting - Must manually check to discover issues
4. No Trend Analysis - Cannot see if performance is degrading over time

### Constraints

- **Scale:** < 50 req/s (startup phase, will scale later)
- **Budget:** $0 (FREE TIER ONLY - no paid services)
- **Infrastructure:** Cloudflare Workers, D1, KV (free tiers)
- **Testing:** Production as staging (no users yet)
- **Admin Auth:** Email-based admin list (simple, migrate to RBAC later)

## Solution Overview: Cloudflare-Native Approach

Leverage Cloudflare's built-in features + free tier tools to add production readiness without additional infrastructure costs.

### Architecture Changes

```
Current Gateway Flow:
Request → Auth → Rate Limit → Anomaly → Content Filter → Proxy → AI Provider

New Gateway Flow (with production readiness):
Request → Auth → Rate Limit → [Circuit Breaker] → [Request Timeout] → Anomaly →
         Content Filter → Proxy → [Retry Logic] → AI Provider
                     ↓                ↓                    ↓
              [Metrics Collector]  [Logger]         [Health Tracker]
```

### Three New Layers

1. **Load Handling Layer**
   - Circuit Breaker - Prevent cascading failures from unhealthy providers
   - Request Timeout - Prevent indefinite hangs
   - Bulkhead - Limit concurrent requests per project

2. **Observability Layer**
   - Metrics Collector - Track performance metrics
   - Structured Logging - Correlation IDs for request tracing
   - Health Monitoring - Provider health checks

3. **Admin Dashboard**
   - Real-time system metrics
   - Provider health status
   - Circuit breaker states
   - Alert history

## Component Specifications

### 1. Circuit Breaker

**Purpose:** Stop sending requests to unhealthy AI providers to prevent cascading failures.

**Logic:**
```
State: CLOSED (normal)
├─ Track failure rate per provider
├─ If failure rate > 50% in 60s → OPEN
└─ Continue routing requests

State: OPEN (failing)
├─ Reject all requests immediately
├─ Return 503 Service Unavailable
├─ Wait 30 seconds
└─ Transition to HALF_OPEN

State: HALF_OPEN (testing)
├─ Allow 1 test request
├─ If success → CLOSED (recovered)
└─ If failure → OPEN (still failing)
```

**Storage:**
- KV key: `breaker:{provider}:state` (OPEN/CLOSED/HALF_OPEN)
- KV key: `breaker:{provider}:failures` (failure count)
- KV key: `breaker:{provider}:last_failure_time` (timestamp)

**FREE TIER OPTIMIZATION:**
- **Cache state in Worker memory** (global variable)
- Check KV every 100 requests instead of every request
- Reduces KV reads by 99%
- Falls back to KV if Worker memory is empty (cold start)
- **KV usage: ~43K reads/day** (within 100K free tier limit)

**Scope:**
- **Global per provider** (not per-project)
- All projects share the same circuit breaker state for OpenAI
- Prevents cascading failures across all projects when provider is down
- More efficient than per-project circuit breakers

**Configuration:**
- Failure threshold: 50%
- Time window: 60 seconds
- Cooldown period: 30 seconds

### 2. Request Timeout

**Purpose:** Prevent requests from hanging indefinitely and exhausting resources.

**Configuration:**
- Proxy requests: 30 seconds max
- Connection timeout: 10 seconds
- Streaming requests: 60 seconds max
- Per-provider configurable (slower providers get longer timeout)

**Implementation:**
```typescript
fetch(providerURL, {
    signal: AbortSignal.timeout(30000) // 30s
})
```

**Error Handling:**
- Timeout → Return 504 Gateway Timeout
- Log detailed info (provider, model, duration)
- Circuit breaker counts timeout as failure

### 3. Bulkhead (Concurrent Request Limit)

**Purpose:** Limit concurrent requests per project to prevent resource exhaustion and ensure fair allocation.

**Configuration per Tier:**

**Tier System Design:**
```typescript
// Database schema: Add tier column to projects table
interface Project {
    id: string;
    name: string;
    tier: 'free' | 'pro' | 'custom';  // NEW field
    concurrent_limit: number;          // NEW field (derived from tier)
}

// Tier configurations (optimized for 50 req/s total)
const TIER_CONFIGS = {
    free: { concurrent: 5, name: 'Free' },
    pro: { concurrent: 10, name: 'Pro' },
    custom: { concurrent: 20, name: 'Custom' }  // Configurable per project
};

// Migration: Set default tier for existing projects
ALTER TABLE projects ADD COLUMN tier TEXT DEFAULT 'free';
ALTER TABLE projects ADD COLUMN concurrent_limit INTEGER DEFAULT 5;
```

**Concurrent Request Limits (Free Tier Optimized):**
- Free: 5 concurrent requests
- Pro: 10 concurrent requests
- Custom: 20 concurrent requests (configurable per project)

**Calculation (for 50 req/s):**
- 5 concurrent × 5s avg response = ~1 req/s per free project
- 10 concurrent × 5s avg response = ~2 req/s per pro project
- Supports ~25-50 projects at 50 req/s total
- Fair allocation across all projects

**Logic:**
```
1. On request start:
   - Increment counter: `project:{id}:concurrent`
   - If > limit → Return 429 Too Many Requests

2. On request end:
   - Decrement counter
   - Use waitUntil() for async cleanup

3. Cleanup strategy (for crashed requests):
   - Set TTL on counter keys (5 minutes)
   - If request crashes, counter auto-expires
   - Prevents counter drift from crashes
```

**Storage (FREE TIER OPTIMIZED):**
- **Use D1 instead of KV** for bulkhead counters
- D1 Free Tier: 25M read/day, 5M write/day
- Much higher limits than KV (100K read/day, 1K write/day)
- Query: `UPDATE projects SET concurrent_count = concurrent_count + 1 WHERE id = ?`
- Fallback to KV only if D1 fails

**Calculation:**
- 20 concurrent × 5s avg response = ~4 req/s per project
- Supports ~25 projects at 100 req/s total

**Why 20 concurrent?**
- Fits current scale (< 100 req/s)
- Headroom for bursts
- Fair resource allocation
- AI provider safety
- Cost-effective (minimize failed requests)

### 4. Metrics Collector

**Purpose:** Track performance metrics for debugging and monitoring.

**Metrics Collected:**
```typescript
{
  requestId: "uuid",
  timestamp: "2025-01-15T10:30:00Z",
  project: "proj_xxx",
  apiKey: "hash_xxx",
  provider: "openai",
  model: "gpt-4o",
  duration: 3247, // ms
  status: "success",
  error: null,
  tokens: { input: 100, output: 500 },
  cost: 0.015
}
```

**Storage:**
- Cloudflare Workers Analytics (automatic, free)
  - Retention: 24 hours on free tier, 30 days on paid
  - Aggregation: Automatic per-minute metrics
- Structured logs (24h retention on free tier)
  - Retention: 24 hours (free), up to 7 days (paid)
  - Export: Can export to external storage for longer retention
- Aggregation: per minute/hour/day
  - Store aggregated metrics in D1 for longer retention
  - Daily rollups for historical trends

### 5. Structured Logging with Correlation IDs

**Purpose:** Trace requests from start to finish for debugging.

**Implementation:**
```typescript
// Generate UUID at request start
const requestId = crypto.randomUUID();

// Pass through middleware chain
c.set('requestId', requestId);

// Log key events
logger.info({
  requestId,
  event: "proxy_request",
  provider: "openai",
  model: "gpt-4o"
});

// Final log
logger.info({
  requestId,
  event: "request_complete",
  duration: 3247,
  status: "success"
});
```

**Log Format (JSON):**
```json
{
  "requestId": "uuid",
  "timestamp": "2025-01-15T10:30:00Z",
  "project": "proj_xxx",
  "provider": "openai",
  "model": "gpt-4o",
  "duration": 3247,
  "status": "success",
  "tokens": { "input": 100, "output": 500 },
  "cost": 0.015,
  "error": null
}
```

### 6. Health Monitoring

**Purpose:** Track gateway and AI provider health.

**Health Checks:**

1. **Gateway Health:** `/health` endpoint (already exists)
   ```json
   {
     "status": "ok",
     "environment": "production",
     "timestamp": "2025-01-15T10:30:00Z"
   }
   ```

2. **Provider Health:** Cron Trigger checks every 5 minutes
   ```typescript
   // Cloudflare Workers Cron Trigger
   // wrangler.toml: [triggers.crons] = "*/5 * * * *"
   // Test each provider with simple request
   // Track: uptime, latency, error rate
   // Store in KV: provider:health:openai
   // Export from gateway-api/src/cron/health-check.ts
   ```

3. **Circuit Breaker State:** Track state transitions
   ```json
   {
     "provider": "openai",
     "state": "CLOSED",
     "failures": 2,
     "lastFailure": "2025-01-15T10:25:00Z"
   }
   ```

**Alerting (via Resend):**
- Provider error rate > 50%
- Gateway error rate > 10%
- Circuit breaker opens
- Health check fails

**Rate Limits (to prevent spam):**
- Same alert type: max once per 5 minutes
- Different alert types: no limit
- Alert aggregation: Group similar alerts within 5min window

### 7. Admin Dashboard

**Purpose:** Real-time system monitoring for operators.

**Access Control:**
- Endpoint: `/internal/dashboard`
- Auth: Email-based admin list
- Admin emails: `['your-email@example.com']`

**Metrics Displayed:**

**Real-Time Metrics:**
- Request rate (req/s)
- Active concurrent requests
- Latency: p50, p95, p99
- Error rate (%)
- Error types breakdown

**Provider Health:**
```
OpenAI:
  Status: ✅ Healthy
  Error Rate: 2.3%
  Avg Latency: 1234ms
  Circuit Breaker: CLOSED
  Uptime: 99.9%

Anthropic:
  Status: ✅ Healthy
  Error Rate: 0.8%
  Avg Latency: 987ms
  Circuit Breaker: CLOSED
  Uptime: 99.95%

Google:
  Status: ⚠️ Degraded
  Error Rate: 15.2%
  Avg Latency: 3456ms
  Circuit Breaker: OPEN
  Uptime: 94.5%
```

**Alert History:**
- 10:30 AM: Circuit breaker OPEN for Google
- 09:15 AM: Provider Anthropic timeout surge
- 08:00 AM: Gateway error rate spike

**System Resources:**
- KV read/write operations
- D1 database queries
- Worker CPU time usage

**Implementation:**
- Simple HTML page with auto-refresh (30s)
- Fetch metrics from `/api/management/metrics` (protected endpoint)
- No external dependencies (pure JS)
- **Dashboard deployment:** Separate Worker endpoint, NOT integrated into Next.js dashboard UI
- **Reasoning:** Gateway-internal metrics should be served from Gateway API for performance and reliability

## Error Handling & Recovery

### Error Categories

**1. Provider Errors:**
- 429 Rate Limit → Circuit breaker tracks, exponential backoff
- 500 Server Error → Circuit breaker counts failures
- 503 Service Unavailable → Circuit breaker OPEN immediately
- Timeout → Increment failure counter, log details

**2. Gateway Errors:**
- Authentication failure → Return 401, log attempt
- Rate limit exceeded → Return 429 with Retry-After
- Validation error → Return 400 with specific message
- Resource exhausted → Return 503, circuit breaker trigger

**3. System Errors:**
- Database connection failed → Fallback to cached data
- KV operation failed → Log error, fail open
- Worker CPU limit exceeded → Return 503, scale warning

### Recovery Strategies

**1. Automatic Retry (with exponential backoff):**
- **Retry happens BEFORE circuit breaker evaluation**
- Retry transient errors (timeout, 5xx)
- Max 3 retries per request
- Backoff: 1s → 2s → 4s
- Jitter to prevent thundering herd
- **Circuit breaker tracks retry failures, not original request failures**
- If all retries exhausted → circuit breaker evaluates the failure

**Execution Order:**
```
1. Request → Proxy Handler
2. Fetch from AI Provider
3. If transient error (timeout, 5xx):
   a. Retry with backoff (up to 3 times)
   b. If retry succeeds → Return response
   c. If retry fails → Increment circuit breaker failure counter
4. Circuit breaker evaluates total failure rate
5. If > 50% failures → OPEN circuit
```

**2. Circuit Breaker Recovery:**
- OPEN → HALF_OPEN after 30s
- HALF_OPEN → 1 test request
- Success → CLOSED
- Failure → OPEN again

**3. Graceful Degradation:**
- Metrics collection fails → Log warning, continue
- Health check fails → Use last known state
- Alerting fails → Log error, don't block

### Error Response Format

```json
{
  "error": {
    "message": "Provider OpenAI is temporarily unavailable. Please try again later.",
    "type": "service_unavailable",
    "code": "provider_unavailable",
    "details": {
      "provider": "openai",
      "circuitBreaker": "OPEN",
      "retryAfter": 30
    }
  }
}
```

## Implementation Architecture

### File Structure

```
apps/gateway-api/src/
├── middleware/
│   ├── circuit-breaker.ts      // NEW - Circuit breaker logic
│   ├── request-timeout.ts      // NEW - Request timeout handler
│   ├── bulkhead.ts             // NEW - Concurrent request limiter
│   ├── admin-auth.ts           // NEW - Admin authentication
│   └── metrics-collector.ts    // NEW - Metrics collection
├── utils/
│   ├── retry.ts                // NEW - Retry logic with backoff
│   ├── correlation-id.ts       // NEW - Request correlation IDs
│   └── logger.ts               // NEW - Structured logging
├── monitoring/
│   ├── metrics.ts              // NEW - Metrics storage/aggregation
│   └── alerts.ts               // NEW - Alerting logic
├── cron/
│   └── health-check.ts         // NEW - Provider health checks (Cron Trigger)
└── admin/
    ├── dashboard.ts            // NEW - Admin dashboard handler
    └── metrics-api.ts          // NEW - Metrics API endpoint
```

### Middleware Order

```typescript
gateway.use('*', gatewayKeyAuth);
gateway.use('*', correlationId);      // NEW - MUST BE FIRST for complete tracing
gateway.use('*', metricsCollector);   // NEW - Start tracking immediately
gateway.use('*', rateLimiter);
gateway.use('*', bulkhead);           // NEW - Check concurrency limits
gateway.use('*', requestTimeout);     // NEW - Set timeout deadline
gateway.use('*', piiScrubber);
gateway.use('*', anomalyHandler);
gateway.use('*', contentFilter);
gateway.use('*', circuitBreaker);     // NEW - Check provider health before proxy
gateway.use('*', retryHandler);       // NEW - Retry BEFORE circuit breaker evaluation
```

### Data Flow

```
Request
  ↓
Correlation ID (generate)
  ↓
Metrics (start timer)
  ↓
Bulkhead (check concurrency)
  ↓
Auth
  ↓
Rate Limit
  ↓
Timeout (set deadline)
  ↓
Anomaly Detection
  ↓
Content Filter
  ↓
Proxy
  ↓
Circuit Breaker (check provider health)
  ↓
Retry (if failed)
  ↓
Response
  ↓
Metrics (record duration, status)
  ↓
Log (structured)
```

## Testing Strategy

### Unit Tests
- Circuit breaker state transitions
- Retry logic with backoff
- Bulkhead counter increment/decrement
- Metrics collection accuracy
- Correlation ID propagation

### Integration Tests
- End-to-end request flow
- Circuit breaker integration with proxy
- Metrics storage and retrieval
- Admin authentication

### Load Testing

**Tools:**
- **k6** - Open-source load testing tool (free)
- **Artillery** - Alternative load testing framework
- **wrangler** - Local development server for testing

**Methodology:**

1. **Sudden Traffic Spike Test:**
   ```bash
   # Start with 10 req/s
   # Spike to 200 req/s over 30 seconds
   # Hold for 2 minutes
   # Monitor: Gateway doesn't crash, circuit breaker triggers
   ```

2. **Sustained Load Test:**
   ```bash
   # 100 req/s for 10 minutes
   # Monitor: Memory usage stable, no leaks
   # Verify: Bulkhead limits work correctly
   ```

3. **Provider Outage Simulation:**
   ```bash
   # Mock AI provider endpoint that returns 503
   # Route 10% of traffic to mock provider
   # Verify: Circuit breaker opens after 50% failures
   # Verify: Gateway continues serving requests to healthy providers
   ```

4. **Concurrent Request Limit Test:**
   ```bash
   # Send 50 concurrent requests to single project (limit: 20)
   # Verify: 20 requests process, 30 get 429
   # Verify: Counter decrements correctly after requests complete
   ```

**Safety Precautions:**
- Use mock provider endpoints for outage tests
- Never test with real production provider credentials
- Run tests during low-traffic periods
- Have rollback plan ready (instant Cloudflare rollback)

### Testing Approach

**Phase 1: Local Development (wrangler dev)**
- Unit tests for individual components
- Mock external dependencies
- Basic functionality verification

**Phase 2: Production with Gradual Rollout**
- Deploy to production
- Route 1% traffic to new version
- Monitor metrics for 15-30 minutes
- If OK: 5% → 25% → 50% → 100%
- If issues: Rollback instantly (30s)

### Rollback Strategy

Cloudflare Workers supports instant rollback:
```bash
# Rollback to previous version
wrangler rollback --name gateway-api
```

Monitoring during rollout:
- Error rate (should not increase)
- Latency (should not degrade)
- Circuit breaker states (should remain stable)

## Success Criteria

### Load Handling
✅ Gateway handles sudden traffic spikes without crashing (up to 50 req/s)
✅ Circuit breaker prevents cascading failures from unhealthy providers
✅ Request timeouts prevent resource exhaustion
✅ Bulkhead ensures fair resource allocation across projects (5/10/20 concurrent limits)

### Observability
✅ Every request has correlation ID for tracing
✅ Real-time metrics visible in admin dashboard
✅ Provider health status monitored
✅ Automatic alerting for critical issues

### Reliability
✅ Gateway uptime > 99.9%
✅ Automatic recovery from transient failures
✅ Graceful degradation when components fail
✅ Fast rollback capability (< 1 minute)

### Free Tier Compliance
✅ **$0/month operational cost** (all features working within free tier limits)
✅ KV usage < 100K reads/day, < 1K writes/day
✅ D1 usage < 25M reads/day, < 5M writes/day
✅ Workers usage optimized to minimize overage costs

## Migration Path

### Phase 1: Free Tier (Current - Startup)
- **Scale:** < 50 req/s
- **Cost:** $0/month (optimized)
- **Features:** All production readiness features
- **Constraints:** Aggressive caching, D1 for counters, in-memory state
- **Monitoring:** Manual dashboard checks, email alerts

### Phase 2: Paid Tier ($5-10/month - Growth)
- **Scale:** 50-500 req/s
- **Cost:** $5-10/month (Workers overage)
- **Features:** Same as Phase 1
- **Benefits:** No aggressive optimization needed, more accurate metrics
- **Trigger:** Reaching free tier limits consistently

### Phase 3: Production Tier ($50-100/month - Scale)
- **Scale:** 500-5000 req/s
- **Cost:** $50-100/month (Workers + KV paid)
- **Features:** Enhanced monitoring, dedicated support
- **Benefits:** Full KV usage, better retention, advanced analytics
- **Trigger:** Product-market fit, paying customers

### Phase 4: Enterprise (Custom - Large Scale)
- **Scale:** 5000+ req/s
- **Cost:** Custom pricing
- **Features:** Multi-region, advanced security, SLA
- **Benefits:** High availability, dedicated infrastructure
- **Trigger:** Enterprise customers, high revenue

## Cost Analysis

**Target: $0/month (FREE TIER ONLY)**

**Free Tier Usage:**
- Cloudflare Workers: 100,000 requests/day free
  - Expected: ~4.3M requests/day at 50 req/s
  - **Will exceed free tier** - Need to optimize or accept overage costs
- Cloudflare KV: 100,000 read/day, 1,000 write/day free
  - Expected: ~43K reads/day, ~1K writes/day (optimized)
  - ✅ **Within free tier**
- Cloudflare D1: 5GB storage, 25M read/day free
  - Expected: ~4.3M queries/day for bulkhead counters
  - ✅ **Within free tier**
- Cloudflare Analytics: Free with Workers
  - ✅ **Within free tier**

**Potential Overages:**
- Workers: 100K free → 4.3M actual = ~$5-10/month overage
- If overage is unacceptable, limit to 1 req/s (~86K requests/day)

**Optimization Strategy:**
1. **Aggressive caching** - Reduce redundant requests
2. **Request batching** - Combine multiple AI calls when possible
3. **D1 for all counters** - Minimize KV usage
4. **In-memory state** - Cache circuit breaker, rate limits
5. **Sampling** - Only log 10% of requests for metrics

**Final Cost Estimate:**
- **Best case (optimized):** $0/month ✅
- **Likely case (some overage):** $5-10/month (Workers overage only)
- **Unacceptable case:** Can't afford any overage → Limit to 1 req/s

**Expected Usage (< 50 req/s):**
- ~4.3M requests/day (within free tier)
- Target: Stay within KV free tier limits (100K reads/day, 1K writes/day)
- KV operations breakdown:
  * Rate limiting: ~8.6M/day (existing) - **MUST OPTIMIZE**
  * Circuit breaker state: ~4.3M reads/day + writes on state changes
  * Bulkhead counter: ~4.3M reads/day + ~4.3M writes/day - **MUST OPTIMIZE**
  * Health checks: 288 checks/day (every 5 minutes)

**Free Tier Constraints:**
- Cloudflare KV Free Tier: 100K reads/day, 1K writes/day
- Current usage would exceed by ~50x
- **Critical: Must optimize to stay within free tier**

**Optimization Strategies (REQUIRED):**
1. **In-memory circuit breaker state** - Cache in Worker memory, check KV every 100 requests
2. **D1 for bulkhead counters** - Replace KV with D1 (25M read/day free tier)
3. **Batch KV operations** - Aggregate multiple operations into single read/write
4. **Reduce rate limiting KV calls** - Cache rate limit state in Worker memory
5. **Lazy health checks** - Check on demand instead of every 5 minutes
6. **Sampling-based metrics** - Only log 10% of requests to D1

**Optimized KV Usage:**
- Circuit breaker: ~43K reads/day (check every 100 requests) ✅ Within free tier
- Health checks: 288 reads/day ✅ Within free tier
- Bulkhead counters: Moved to D1 ✅
- Rate limiting: Cached in memory ✅
- **Total KV: ~43K reads/day, ~1K writes/day** ✅ **FREE TIER**

**Cost: $0/month** - Completely free tier

## Security Considerations

### Admin Dashboard
- Email-based authentication (Phase 1)
- All admin endpoints require authentication
- Sensitive data (costs, API keys) hidden from non-admins

### Metrics & Logs
- PII scrubbing (already implemented)
- API keys hashed in logs
- IP addresses hashed for GDPR compliance

### Circuit Breaker
- Fail-safe defaults (closed circuit on error)
- No sensitive data in breaker state
- Automatic recovery prevents manual intervention

## Future Enhancements

### Short Term (1-3 months)
- Add distributed tracing (OpenTelemetry)
- Implement RBAC for admin management
- Add more sophisticated alerting rules
- Build custom dashboards for specific use cases

### Long Term (3-6 months)
- Auto-scaling based on load
- Multi-region deployment
- Advanced anomaly detection (ML-based)
- Cost optimization recommendations

## Appendix

### Cloudflare Workers Limits
- CPU time: 10ms (free), 50s (paid)
- Memory: 128MB per instance
- Request size: 100MB
- Response size: 100MB

### AI Provider Rate Limits
- OpenAI: ~10,000 req/min (gpt-4o)
- Anthropic: ~50,000 req/min
- Google: ~60 req/min (free), higher for paid

### Related Documentation
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Retry Pattern with Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)

---

**Document Version:** 1.0
**Last Updated:** 2025-03-19
**Status:** Ready for Review
