# Deployment Scripts

This directory contains automated scripts for safe production deployment of the Micro-Security Gateway.

## Scripts

### pre-deploy-check.sh

Pre-deployment validation script that checks all requirements before deployment.

**What it checks**:
- Code quality & testing (unit tests, security audit, TypeScript compilation)
- Database & migrations (migration dry-run, migration files)
- Configuration & environment (wrangler.toml, secrets)
- Worker size & performance (bundle size, dependencies)
- Git status (clean working directory, branch check)
- Documentation (rollout plan, checklist, runbook)
- Deployment scripts (script existence, permissions)

**Usage**:
```bash
cd apps/gateway-api
./scripts/pre-deploy-check.sh
```

**Exit codes**:
- `0` - All checks passed (or warnings only)
- `1` - Critical checks failed

**Output**:
- Color-coded output (green = pass, yellow = warning, red = fail)
- Summary with pass/warning/fail counts

---

### smoke-test.sh

Post-deployment smoke test script that verifies all critical functionality.

**What it tests**:
- Health & connectivity (worker responding, health endpoint)
- OpenAI-compatible endpoints (/v1/models, /v1/chat/completions)
- Authentication (unauthorized requests, invalid API keys)
- Rate limiting (10 rapid requests)
- Error handling (invalid endpoints, malformed requests)
- Performance (response time measurement)
- Admin endpoints (metrics, circuit breaker, provider health)
- Provider health status

**Usage**:
```bash
cd apps/gateway-api
TEST_API_KEY=sk-xxx ./scripts/smoke-test.sh
```

**Required environment variables**:
- `TEST_API_KEY` - Valid API key for testing
- `ADMIN_AUTH_TOKEN` - (optional) Admin auth token for admin endpoints
- `GATEWAY_URL` - (optional) Gateway URL (default: production URL)

**Exit codes**:
- `0` - All tests passed (or success rate >= 80%)
- `1` - Critical tests failed

**Output**:
- Test-by-test results with pass/fail status
- Summary with total tests, passed, failed
- Success percentage

---

### generate-health-report.sh

Daily health report generator that fetches metrics and generates a Markdown report.

**What it includes**:
- Executive summary
- System metrics (requests, errors, latency)
- Circuit breaker status
- Provider health
- Cost tracking
- Performance analysis
- Incident summary
- Recommendations and next steps

**Usage**:
```bash
cd apps/gateway-api
ADMIN_TOKEN=xxx ./scripts/generate-health-report.sh [YYYY-MM-DD]
```

**Required environment variables**:
- `ADMIN_TOKEN` - Admin auth token for accessing admin endpoints
- `GATEWAY_URL` - (optional) Gateway URL (default: production URL)

**Parameters**:
- `YYYY-MM-DD` - (optional) Report date (default: today)

**Output**:
- Markdown file: `health-report-YYYY-MM-DD.md`
- Prompts to view report after generation

---

## Quick Start

### First-Time Setup

1. **Make scripts executable** (Linux/Mac only):
   ```bash
   chmod +x apps/gateway-api/scripts/*.sh
   ```

2. **Set up environment variables**:
   ```bash
   export TEST_API_KEY="sk-your-test-key"
   export ADMIN_TOKEN="your-admin-token"
   export GATEWAY_URL="https://gateway-api.your-subdomain.workers.dev"
   ```

3. **Run pre-deployment check**:
   ```bash
   cd apps/gateway-api
   ./scripts/pre-deploy-check.sh
   ```

### Complete Deployment Workflow

```bash
# 1. Pre-deployment validation
cd apps/gateway-api
./scripts/pre-deploy-check.sh

# 2. Apply database migrations
cd ../packages/db
npm run migrate:remote

# 3. Deploy to production
cd ../gateway-api
wrangler deploy src/index.ts

# 4. Post-deployment smoke tests
./scripts/smoke-test.sh

# 5. Monitor for 30 minutes
wrangler tail --format pretty

# 6. Generate health report
./scripts/generate-health-report.sh
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci
        working-directory: apps/gateway-api

      - name: Run pre-deployment checks
        run: ./scripts/pre-deploy-check.sh
        working-directory: apps/gateway-api
        env:
          TEST_API_KEY: ${{ secrets.TEST_API_KEY }}

      - name: Apply database migrations
        run: npm run migrate:remote
        working-directory: packages/db

      - name: Deploy to Cloudflare Workers
        run: wrangler deploy src/index.ts
        working-directory: apps/gateway-api
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Run smoke tests
        run: ./scripts/smoke-test.sh
        working-directory: apps/gateway-api
        env:
          TEST_API_KEY: ${{ secrets.TEST_API_KEY }}
          GATEWAY_URL: https://gateway-api.your-subdomain.workers.dev

      - name: Notify team on failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"❌ Deployment failed! Check the logs."}'
```

---

## Troubleshooting

### Script Permission Denied (Linux/Mac)

```bash
chmod +x apps/gateway-api/scripts/*.sh
```

### pre-deploy-check.sh Fails

1. **Unit tests failing**:
   ```bash
   cd apps/gateway-api
   npm run test
   ```

2. **Security vulnerabilities**:
   ```bash
   npm audit fix
   ```

3. **TypeScript compilation errors**:
   ```bash
   npx tsc --noEmit
   ```

4. **Migration conflicts**:
   ```bash
   cd packages/db
   npm run migrate:remote -- --dry-run
   ```

### smoke-test.sh Fails

1. **Invalid API key**:
   - Verify `TEST_API_KEY` is correct
   - Check API key is not expired

2. **Gateway not responding**:
   - Check `GATEWAY_URL` is correct
   - Verify worker is deployed: `wrangler versions list`

3. **Admin endpoint failures**:
   - Verify `ADMIN_AUTH_TOKEN` is set
   - Check admin endpoints are accessible

### generate-health-report.sh Fails

1. **Admin auth failure**:
   - Verify `ADMIN_TOKEN` is correct
   - Check admin endpoints are accessible

2. **Metrics not available**:
   - Check worker is deployed and running
   - Verify admin endpoints are responding

---

## Best Practices

1. **Always run pre-deploy-check.sh before deployment**
   - Catches issues before they reach production

2. **Run smoke-test.sh immediately after deployment**
   - Verifies deployment is healthy
   - Catches critical issues early

3. **Generate health reports daily**
   - Tracks system health over time
   - Identifies trends and issues

4. **Keep scripts up to date**
   - Update tests when adding new features
   - Review and improve scripts regularly

5. **Automate in CI/CD**
   - Run pre-deploy checks in pipeline
   - Block deployment if checks fail
   - Run smoke tests after deployment

---

## Support

For issues or questions:
- Review the production runbook: `docs/production-runbook.md`
- Check the rollout plan: `docs/production-rollout-plan.md`
- Contact on-call team (see runbook for contacts)

---

**Last Updated**: 2025-03-20
**Version**: 1.0.0
