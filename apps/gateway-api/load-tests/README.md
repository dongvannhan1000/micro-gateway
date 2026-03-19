# Load Testing with k6

This directory contains comprehensive load tests for the Micro-Security Gateway using k6.

## Prerequisites

1. **Install k6**:
   ```bash
   # macOS
   brew install k6

   # Linux
   sudo apt-get install k6

   # Windows
   # Download from https://k6.io/open-source/
   ```

2. **Gateway Running Locally**:
   ```bash
   cd apps/gateway-api
   npm run dev
   ```
   Gateway will be available at `http://localhost:8787`

3. **Test API Key**:
   Create a test gateway API key in your D1 database or use environment variable.

## Test Scenarios

The main test (`main-test.js`) includes:

### Load Patterns

1. **Warm Up** (30s): 10 VUs
   - Verify system is functioning normally
   - Establish baseline metrics

2. **Normal Load** (2m): 50 VUs
   - Simulate typical production traffic
   - Verify system can handle expected load

3. **Spike Test** (1m): Ramp to 200 VUs
   - Test how system handles sudden traffic spikes
   - Verify circuit breaker and rate limiting work

4. **Cool Down** (2m): Back to 50 VUs
   - Verify system recovers from spike
   - Check circuit breaker resets properly

### Test Cases

Three different scenarios are randomly selected:
- **Simple Completion**: 10 tokens, quick response
- **Medium Completion**: 100 tokens, moderate response
- **Long Completion**: 500 tokens, longer response

## Running Tests

### Local Testing

```bash
# Basic test against local gateway
cd apps/gateway-api
export BASE_URL="http://localhost:8787"
export API_KEY="your-test-api-key"
k6 run load-tests/main-test.js

# With custom output
k6 run load-tests/main-test.js --out json=results.json

# With HTML report
k6 run load-tests/main-test.js --out json=results.json --summary-export=summary.json
```

### Production Testing (CAUTION!)

⚠️ **WARNING**: Only run against production during low-traffic periods and with careful monitoring!

```bash
# Production test - use reduced load first
export BASE_URL="https://your-gateway.production.com"
export API_KEY="your-production-api-key"
k6 run load-tests/main-test.js
```

**Safety Checklist**:
- [ ] Notify team members before testing
- [ ] Monitor production metrics during test
- [ ] Have rollback plan ready
- [ ] Start with 10% of planned load
- [ ] Test during low-traffic hours
- [ ] Set up alerts for error rates
- [ ] Gradually increase load

## Metrics Tracked

### Built-in k6 Metrics

- **http_req_duration**: Request duration (p50, p95, p99)
- **http_req_failed**: Failed request rate
- **vus**: Active virtual users
- **rps**: Requests per second

### Custom Metrics

- **errors**: Custom error rate
- **circuit_breaker_trips**: Number of circuit breaker activations
- **timeouts**: Request timeout count
- **rate_limit_hits**: Rate limit violation count
- **retry_attempts**: Number of retry attempts
- **response_time**: Response time trend
- **proxy_latency**: Gateway-reported latency (from headers)

## Thresholds

The test passes if:
- ✅ 95% of requests complete in under 2 seconds
- ✅ 99% of requests complete in under 5 seconds
- ✅ Error rate is below 5%
- ✅ Circuit breaker trips less than 10 times

## Interpreting Results

### Success Criteria

```
✓ status is 200
✓ has response ID
✓ has choices array
✓ not circuit broken
✓ not timed out
✓ not rate limited
✓ not server error
```

### Key Metrics to Watch

1. **Error Rate**: Should be < 5%
   - Higher = issues with upstream providers or gateway

2. **P95 Latency**: Should be < 2000ms
   - Higher = performance issues or slow providers

3. **Circuit Breaker Trips**: Should be minimal
   - Many trips = providers are failing frequently

4. **Timeout Count**: Should be low
   - High = requests taking too long or providers unresponsive

5. **Rate Limit Hits**: Should be minimal
   - Many hits = load exceeding rate limits

### Common Issues

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| High error rate | Provider down/slow | Check provider health, add circuit breaker |
| Many timeouts | Requests too slow | Increase timeout, optimize provider routing |
| Rate limit hits | Too many requests | Increase rate limits or add throttling |
| Circuit breaker trips | Provider failures | Check provider status, add fallback providers |

## Advanced Testing

### Stress Test

Find breaking point by ramping up VUs:

```javascript
export const options = {
    stages: [
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 400 },
        { duration: '2m', target: 800 },
        { duration: '2m', target: 0 },
    ],
};
```

### Soak Test

Sustained load over time:

```javascript
export const options = {
    stages: [
        { duration: '5m', target: 50 },
        { duration: '30m', target: 50 }, // Sustained load
        { duration: '5m', target: 0 },
    ],
};
```

### Spike Test

Sudden extreme spike:

```javascript
export const options = {
    stages: [
        { duration: '1m', target: 10 },
        { duration: '10s', target: 1000 }, // Extreme spike
        { duration: '1m', target: 10 },
    ],
};
```

## Monitoring During Tests

While tests are running, monitor:

1. **Gateway Logs**: Check for errors and warnings
   ```bash
   wrangler tail
   ```

2. **Admin Dashboard**: View real-time metrics
   ```
   https://your-gateway.com/admin
   ```

3. **Cloudflare Metrics**: Check worker CPU and memory usage

4. **Provider Status**: Verify AI providers are healthy

## Troubleshooting

### Connection Refused

**Error**: `connect ECONNREFUSED`

**Solution**:
- Verify gateway is running: `curl http://localhost:8787/health`
- Check BASE_URL environment variable
- Ensure no firewall blocking connections

### Authentication Errors

**Error**: `HTTP 401 Unauthorized`

**Solution**:
- Verify API_KEY is valid
- Check API key exists in D1 database
- Ensure API key is active and not expired

### Circuit Breaker Activations

**Warning**: `Circuit breaker detected`

**Solution**:
- Check provider health status
- Verify provider API keys are valid
- Consider adjusting circuit breaker thresholds
- Add fallback providers

### High Memory/CPU Usage

**Warning**: Worker CPU or memory near limits

**Solution**:
- Reduce number of VUs
- Add caching layer
- Optimize database queries
- Consider upgrading Cloudflare Workers plan

## Continuous Integration

Add to CI/CD pipeline:

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz -L | tar xvz
          sudo mv k6-v0.45.0-linux-amd64/k6 /usr/local/bin/
      - name: Start gateway
        run: npm run dev &
      - name: Run load tests
        run: k6 run load-tests/main-test.js
        env:
          BASE_URL: http://localhost:8787
          API_KEY: ${{ secrets.TEST_API_KEY }}
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Gateway Monitoring Guide](../docs/observability-setup.md)

## Expected Performance Baselines

Based on local testing with `wrangler dev`:

| Metric | Target | Acceptable |
|--------|--------|------------|
| P50 Latency | < 500ms | < 1000ms |
| P95 Latency | < 2000ms | < 5000ms |
| P99 Latency | < 5000ms | < 10000ms |
| Error Rate | < 1% | < 5% |
| Throughput | 50 req/s | 20 req/s |

*Note: Production performance will vary based on Cloudflare Workers plan, geographic distribution, and AI provider response times.*
