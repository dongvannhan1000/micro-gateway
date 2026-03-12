# CI/CD Quick Setup Guide

**Time Required**: 10 minutes
**Goal**: Configure GitHub Actions to auto-deploy to Cloudflare Workers

---

## Step 1: Get Cloudflare API Token (5 min)

### Navigate to API Tokens
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"

### Create Token with Template
3. Click "Use template" → Select "Edit Cloudflare Workers"

### Or Create Custom Token
**Permissions**:
- Account - Cloudflare Workers: **Edit**
- Account - Account Settings: **Read**
- Zone - Zone: **Read** (optional, for custom domains)

**Account Resources**:
- Include → **All accounts** (or specific account)

**TTL**: No expiration (or set expiry date)

### Complete Creation
4. Click "Continue to summary"
5. Click "Create Token"
6. **COPY THE TOKEN** (you'll only see it once!)

---

## Step 2: Get Cloudflare Account ID (1 min)

### Option A: From Dashboard
1. Go to: https://dash.cloudflare.com
2. Click your account (top right)
3. Copy "Account ID" from right sidebar

### Option B: From Workers Page
1. Workers & Pages → Overview
2. Copy "Account ID" from right sidebar

**Format**: 32-character alphanumeric string (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

---

## Step 3: Add Secrets to GitHub (3 min)

### Navigate to Secrets
1. Go to: https://github.com/dongvannhan1000/micro-gateway/settings/secrets/actions
2. Click "New repository secret"

### Add API Token
3. Enter:
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Secret**: `<paste token from Step 1>`
   - Click "Add secret"

### Add Account ID
4. Click "New repository secret" again
5. Enter:
   - **Name**: `CLOUDFLARE_ACCOUNT_ID`
   - **Secret**: `<paste account ID from Step 2>`
   - Click "Add secret"

---

## Step 4: Trigger Deployment (1 min)

### Option A: Manual Trigger
1. Go to: https://github.com/dongvannhan1000/micro-gateway/actions
2. Click "Deploy Dashboard to Cloudflare Workers"
3. Click "Run workflow" → "Run workflow"

### Option B: Push Commit
```bash
git commit --allow-empty -m "ci: trigger dashboard deployment"
git push origin main
```

---

## Step 5: Monitor Deployment (3-5 min)

1. Watch workflow run: https://github.com/dongvannhan1000/micro-gateway/actions
2. Wait for all steps to complete (green checkmarks)
3. Click on workflow run for details
4. Find Worker URL in deployment logs

---

## Step 6: Verify Deployment (1 min)

### Get Worker URL
From workflow logs, look for:
```
Deploying *.open-next to ms-gateway-dashboard.<subdomain>.workers.dev
```

### Test Dashboard
```bash
curl https://ms-gateway-dashboard.<subdomain>.workers.dev
```

**Expected**: HTML response (Next.js app)

---

## Troubleshooting

### Secrets Not Working
**Error**: `Invalid Cloudflare API token`

**Fix**:
1. Verify token has "Edit Cloudflare Workers" permission
2. Regenerate token if needed
3. Check for typos in secret value

### Build Fails
**Error**: Build step fails

**Fix**:
1. Check "Build" step logs for specific error
2. Verify `@opennextjs/cloudflare` is installed
3. Test locally first (Linux environment)

### Permission Denied
**Error**: `Failed to deploy due to insufficient permissions`

**Fix**:
1. Check API token permissions
2. Verify Account ID is correct
3. Ensure token is not expired

---

## Success Checklist

After setup, you should have:

- [ ] GitHub repository created
- [ ] GitHub Actions workflows configured
- [ ] Cloudflare API token created and added to secrets
- [ ] Cloudflare Account ID added to secrets
- [ ] Dashboard deployed successfully
- [ ] Gateway API deployed successfully
- [ ] Workers accessible via URLs

---

## URLs

**Repository**: https://github.com/dongvannhan1000/micro-gateway
**Actions**: https://github.com/dongvannhan1000/micro-gateway/actions
**Secrets**: https://github.com/dongvannhan1000/micro-gateway/settings/secrets/actions

**Production**:
- Gateway API: https://gateway-api.nhandong0205.workers.dev
- Dashboard UI: https://ms-gateway-dashboard.YOUR_SUBDOMAIN.workers.dev

---

**See Also**: [DEPLOYMENT_CI_CD.md](./DEPLOYMENT_CI_CD.md) for complete documentation

---

**Created**: March 12, 2026
**Est. Setup Time**: 10 minutes
