# GitHub Actions CI/CD Pipeline

**Date**: March 12, 2026
**Status**: Active (Awaiting Cloudflare Secrets Configuration)

---

## Overview

Professional CI/CD pipeline for automated deployment to Cloudflare Workers, eliminating Windows `.wasm` build issues and enabling seamless continuous deployment.

**Repository**: https://github.com/dongvannhan1000/micro-gateway
**Actions**: https://github.com/dongvannhan1000/micro-gateway/actions

---

## Workflows

### 1. Dashboard Deployment (`.github/workflows/deploy-dashboard.yml`)

**Triggers**:
- Push to `main` branch (changes in `apps/dashboard-ui/`)
- Pull requests to `main`
- Manual trigger (workflow_dispatch)

**Process**:
1. Checkout code
2. Setup Node.js 20 with caching
3. Install dependencies (`npm ci`)
4. Build with `@opennextjs/cloudflare`
5. Deploy to Cloudflare Workers

**Target Worker**: `ms-gateway-dashboard`

---

### 2. Gateway API Deployment (`.github/workflows/deploy-gateway.yml`)

**Triggers**:
- Push to `main` branch (changes in `apps/gateway-api/` or `packages/db/`)
- Pull requests to `main`
- Manual trigger (workflow_dispatch)

**Process**:
1. Checkout code
2. Setup Node.js 20 with caching
3. Install dependencies
4. **Run unit tests** (vitest)
5. Deploy to Cloudflare Workers

**Target Worker**: `gateway-api` (existing)

---

### 3. Database Migration (`.github/workflows/database-migration.yml`)

**Trigger**: Manual only (workflow_dispatch)

**Options**:
- `remote`: Deploy to production D1 database
- `local`: Deploy to local D1 database

**Use**: Run migrations after schema changes

---

## Required Secrets

### Setup Location

Repository → Settings → Secrets and variables → Actions → New repository secret

---

### Secret 1: `CLOUDFLARE_API_TOKEN`

**Purpose**: Authenticate with Cloudflare API for Workers deployment

**How to Create**:
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use template: "Edit Cloudflare Workers" (or custom)
4. Required Permissions:
   - Account - Cloudflare Workers: Edit
   - Account - Account Settings: Read
   - Zone - Zone: Read (if using custom domains)
5. Account Resources: Include → All accounts
6. Click "Continue to summary" → "Create Token"
7. **Copy the token** (you'll only see it once!)

**Add to GitHub**:
- Name: `CLOUDFLARE_API_TOKEN`
- Value: `<paste token here>`
- Click "Add secret"

---

### Secret 2: `CLOUDFLARE_ACCOUNT_ID`

**Purpose**: Identify which Cloudflare account to deploy to

**How to Find**:
1. Go to https://dash.cloudflare.com
2. Click on your account (top right)
3. Copy "Account ID" from right sidebar
4. Alternatively: Workers & Pages → Overview → Account ID

**Add to GitHub**:
- Name: `CLOUDFLARE_ACCOUNT_ID`
- Value: `<paste account ID here>`
- Click "Add secret"

---

## Deployment Process

### Automatic Deployment

```bash
# Make changes to dashboard or gateway
git add .
git commit -m "feat: new feature"
git push origin main
```

**Result**: GitHub Actions automatically triggers, builds on Linux, and deploys to Cloudflare Workers.

---

### Manual Deployment

1. Go to: https://github.com/dongvannhan1000/micro-gateway/actions
2. Select workflow:
   - "Deploy Dashboard to Cloudflare Workers"
   - "Deploy Gateway API to Cloudflare Workers"
   - "Database Migration"
3. Click "Run workflow" → Select branch → Click "Run workflow"

---

## URLs

### Production

- **Gateway API**: https://gateway-api.nhandong0205.workers.dev
- **Dashboard UI**: https://ms-gateway-dashboard.YOUR_SUBDOMAIN.workers.dev (after first deployment)

### Development

- **Repository**: https://github.com/dongvannhan1000/micro-gateway
- **Actions**: https://github.com/dongvannhan1000/micro-gateway/actions
- **Settings**: https://github.com/dongvannhan1000/micro-gateway/settings

---

## Benefits

### Automation
- No manual deployment commands
- Auto-deploy on push to `main`
- Build and test automation

### Reliability
- Builds on Linux (no Windows `.wasm` issues)
- Automated testing before deployment
- Consistent build environment

### Speed
- Cached dependencies (faster builds)
- Parallel deployment (dashboard + gateway)
- ~3-5 minute build time (first run)

### Monitoring
- GitHub Actions UI for deployment status
- Detailed logs for each step
- Easy rollback (revert commit)

---

## Monitoring Deployments

### View Status

1. Go to: https://github.com/dongvannhan1000/micro-gateway/actions
2. See recent workflow runs
3. Click on any run for details:
   - Commit info
   - Step-by-step logs
   - Deployment status
   - Worker URLs

### Workflow Status Indicators

- ✅ Green: Success (deployed)
- ❌ Red: Failed (check logs)
- 🟡 Yellow: In progress
- ⚪ Gray: Queued

---

## Troubleshooting

### Issue: Deployment Fails

**Check**:
1. Secrets configured correctly?
2. Cloudflare API token has "Edit Cloudflare Workers" permission?
3. Account ID is correct?
4. Network connectivity (GitHub Actions to Cloudflare)?

**Debug**:
1. Click on failed workflow run
2. Expand failed step
3. Read error message
4. Fix issue → Push commit → Auto-retry

---

### Issue: Build Fails

**Common Causes**:
- Dependency conflict
- TypeScript error
- Missing environment variable

**Debug**:
1. Check "Install Dependencies" step logs
2. Check "Build" step logs
3. Test locally first:
   ```bash
   cd apps/dashboard-ui
   npm ci
   npm run build
   ```

---

### Issue: Tests Fail

**Gateway API only** - Dashboard has no tests yet

**Debug**:
1. Check "Run Unit Tests" step logs
2. Run tests locally:
   ```bash
   cd apps/gateway-api
   npm run test
   ```

---

## Rollback Procedure

### Automatic Rollback

```bash
# Revert problematic commit
git revert HEAD

# Or reset to previous commit (force push)
git reset --hard HEAD~1
git push --force origin main
```

**Result**: GitHub Actions automatically deploys previous version.

---

### Manual Rollback

1. Go to: https://github.com/dongvannhan1000/micro-gateway/actions
2. Find successful deployment (before issue)
3. Click "Re-run this workflow" → "Re-run all jobs"

---

## Next Steps

### Immediate Actions

1. **Configure Secrets** (Required)
   - Add `CLOUDFLARE_API_TOKEN`
   - Add `CLOUDFLARE_ACCOUNT_ID`

2. **Test Deployment**
   - Push a commit or manually trigger workflow
   - Monitor deployment in Actions tab
   - Verify deployed Worker URL

3. **Enable Branch Protection** (Recommended)
   - Settings → Branches → Add rule
   - Branch name pattern: `main`
   - Require pull request reviews (optional)
   - Require status checks to pass (test workflow)

---

### Future Enhancements

- [ ] Add integration tests
- [ ] Add staging environment
- [ ] Add performance monitoring
- [ ] Add security scanning (Snyk, Dependabot)
- [ ] Add automated backups
- [ ] Add multi-region deployment

---

## Architecture

```
Push to Main Branch
        ↓
GitHub Actions (Linux)
        ↓
┌──────────────────────────────┐
│  Checkout & Setup Node.js    │
│  Install Dependencies        │
│  Build / Test                │
└──────────────────────────────┘
        ↓
Cloudflare Workers Deploy
        ↓
┌──────────────────────────────┐
│  Gateway API Worker          │
│  Dashboard UI Worker         │
└──────────────────────────────┘
```

---

## Support

**GitHub Issues**: https://github.com/dongvannhan1000/micro-gateway/issues
**Cloudflare Dashboard**: https://dash.cloudflare.com
**GitHub Actions Docs**: https://docs.github.com/en/actions

---

**DevOps Automator**: Claude (DevOps Automator Agent)
**Created**: March 12, 2026
**Last Updated**: March 12, 2026
**Status**: Active (Awaiting secrets configuration)
