# Observability Setup Guide

## Overview

This gateway uses **Cloudflare Workers Traces** (OpenTelemetry-compatible) for observability. Traces are automatically collected and can be exported to your preferred observability platform.

## What's Traced

**Automatic Instrumentation** (provided by Cloudflare):
- Fetch requests (outbound calls to AI providers)
- KV operations (rate limiting)
- D1 database queries
- Durable Objects operations

**Custom Attributes** (added by gateway):
- `project_id` - Project identifier
- `api_key_id` - Gateway key used
- `correlation_id` - Request correlation ID for tracing
- `provider` - AI provider (openai, anthropic, google, etc.)
- `model` - Model requested

## Configuration

### Step 1: Choose Observability Platform

Supported platforms (OTLP-compatible):
- **Grafana Cloud** - Recommended for full-featured dashboards
- **Honeycomb** - Excellent for exploratory analysis
- **Axiom** - Fast and affordable

### Step 2: Configure Export Destination

#### Option A: Grafana Cloud (Recommended)

1. Sign up for [Grafana Cloud](https://grafana.com/products/cloud/)
2. Create a new stack or use existing
3. Go to **Stack → Connections → Add connection → OpenTelemetry**
4. Copy the **OTLP Endpoint** and **Credentials**

Add to `wrangler.toml`:

```toml
[observability.traces]
enabled = true
head_sampling_rate = 0.1

[vars]
OTEL_EXPORTER_OTLP_ENDPOINT = "https://otlp-gateway-prod-us-central-0.grafana.net/otlp"
OTEL_EXPORTER_OTLP_HEADERS = "Authorization=Basic YOUR_BASE64_ENCODED_CREDENTIALS"
```

Or set as secrets:

```bash
wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT
wrangler secret put OTEL_EXPORTER_OTLP_HEADERS
```

#### Option B: Honeycomb

1. Sign up for [Honeycomb](https://www.honeycomb.io/)
2. Create a new environment
3. Get your **API Key** from Account Settings

```toml
[observability.traces]
enabled = true
head_sampling_rate = 0.1

[vars]
OTEL_EXPORTER_OTLP_ENDPOINT = "https://api.honeycomb.io:443/v1/traces"
OTEL_EXPORTER_OTLP_HEADERS = "x-honeycomb-team=YOUR_API_KEY"
```

#### Option C: Axiom

1. Sign up for [Axiom](https://axiom.co/)
2. Create a new dataset
3. Get your **API Token**

```toml
[observability.traces]
enabled = true
head_sampling_rate = 0.1

[vars]
OTEL_EXPORTER_OTLP_ENDPOINT = "https://api.axiom.co/v1/traces"
OTEL_EXPORTER_OTLP_HEADERS = "Authorization=Bearer YOUR_API_TOKEN"
```

### Step 3: Deploy

```bash
npm run deploy
```

Traces will automatically start flowing to your observability platform.

## Dashboard Setup

### Key Metrics to Track

1. **Request Metrics**
   - Total requests per project
   - Request duration (P50, P95, P99)
   - Error rate by status code
   - Requests per provider/model

2. **Provider Health**
   - Success rate per provider
   - Latency per provider
   - Error types and frequency

3. **Cost Tracking**
   - Tokens used per project
   - Cost USD per project
   - Cost per model

### Example Queries

#### Grafana/PromQL

```promql
# Request rate by project
sum by (project_id) (rate(http_requests_total[5m]))

# P95 latency by provider
histogram_quantile(0.95, sum by (provider, le) (rate(http_request_duration_seconds_bucket[5m])))

# Error rate by status
sum by (status) (rate(http_requests_total{status=~"5.."}[5m]))
```

#### Honeycomb

```sql
# Average latency by provider
SELECT AVG(duration_ms), provider
FROM traces
GROUP BY provider

# Error rate over time
SELECT COUNT(*) / COUNT(*) AS error_rate
FROM traces
WHERE status >= 400
GROUP BY time(1m)
```

## Sampling Configuration

Current sampling rate: **10%** (`head_sampling_rate = 0.1`)

Adjust based on your volume:
- **High volume** (>10k requests/min): Use 0.01-0.05 (1-5%)
- **Medium volume** (1k-10k requests/min): Use 0.1 (10%)
- **Low volume** (<1k requests/min): Use 1.0 (100%)

## Cost Considerations

- **Cloudflare Workers Traces**: FREE during beta (until March 1, 2026)
- **Observability platforms**:
  - Grafana Cloud: Free tier available (50GB logs/mo)
  - Honeycomb: Free tier available (10M events/mo)
  - Axiom: Free tier available (500GB data)

## Troubleshooting

### No traces appearing

1. Check traces are enabled:
   ```bash
   wrangler tail --format=pretty
   ```
   Look for trace-related logs

2. Verify environment variables are set:
   ```bash
   wrangler secret list
   ```

3. Check observability platform for ingest errors

### Missing custom attributes

Check that `proxy.ts` is setting trace headers:
```typescript
const traceHeaders = {
    'X-Trace-Project-ID': project.id,
    'X-Trace-API-Key-ID': gatewayKey.id,
    'X-Trace-Correlation-ID': correlationId,
    'X-Trace-Provider': providerName,
    'X-Trace-Model': targetModel,
};
```

## Admin Dashboard Integration

The admin dashboard (Task 14) will query traces via:

1. **Direct API** (Honeycomb/Axiom provide REST APIs)
2. **Grafana Embedded** (iframe with pre-built dashboards)
3. **Custom queries** using platform SDKs

Example: Query Honeycomb from dashboard

```typescript
const response = await fetch('https://api.honeycomb.io/1/query', {
    headers: {
        'X-Honeycomb-Team': apiKey,
        'X-Honeycomb-Dataset': 'gateway-traces'
    },
    body: JSON.stringify({
        calculations: [
            { op: 'COUNT' },
            { op: 'AVG', column: 'duration_ms' }
        ],
        group_by: ['project_id', 'provider']
    })
});
```

## References

- [Cloudflare Workers Traces Documentation](https://developers.cloudflare.com/workers/observability/traces/)
- [OpenTelemetry Protocol Specification](https://opentelemetry.io/docs/reference/specification/protocol/otlp/)
- [Grafana OTLP Setup](https://grafana.com/docs/grafana-cloud/infrastructure/ingestion/otel-traces/)
