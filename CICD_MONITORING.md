# CI/CD Monitoring Guide

**Purpose**: Monitor and troubleshoot GitHub Actions deployments

---

## Quick Access

**Actions Dashboard**: https://github.com/dongvannhan1000/micro-gateway/actions
**Workflow Runs**: https://github.com/dongvannhan1000/micro-gateway/actions/workflows

---

## Workflow Status Indicators

### Status Icons
- ✅ **Green check**: Success (deployment completed)
- ❌ **Red X**: Failed (deployment failed - check logs)
- 🟡 **Yellow dot**: In progress (currently running)
- ⚪ **Gray circle**: Queued (waiting to run)
- 🔄 **Orange arrows**: Retrying (automatic retry in progress)

### Status Badges (Optional)
Add to README.md:
```markdown
[![Deploy Dashboard](https://github.com/dongvannhan1000/micro-gateway/actions/workflows/deploy-dashboard.yml/badge.svg)](https://github.com/dongvannhan1000/micro-gateway/actions/workflows/deploy-dashboard.yml)
[![Deploy Gateway](https://github.com/dongvannhan1000/micro-gateway/actions/workflows/deploy-gateway.yml/badge.svg)](https://github.com/dongvannhan1000/micro-gateway/actions/workflows/deploy-gateway.yml)
```

---

## Monitoring Deployments

### Real-Time Monitoring

**During Deployment**:
1. Go to: https://github.com/dongvannhan1000/micro-gateway/actions
2. Click on running workflow (yellow dot)
3. Watch each step:
   - Checkout (5-10 seconds)
   - Setup Node.js (10-20 seconds)
   - Install Dependencies (1-2 minutes, cached)
   - Build (1-2 minutes)
   - Deploy (30-60 seconds)

**Total Time**: ~3-5 minutes (first run), ~2-3 minutes (cached)

---

### Deployment Logs

**View Logs**:
1. Click on workflow run
2. Expand each step to see logs
3. Look for:
   - **Worker URL** in "Deploy" step
   - **Build output** in "Build" step
   - **Error messages** in red (if failed)

**Example Successful Log**:
```
Deploying *.open-next to ms-gateway-dashboard.YOUR_SUBDOMAIN.workers.dev
Published ms-gateway-dashboard (X.YZ sec)
  https://ms-gateway-dashboard.YOUR_SUBDOMAIN.workers.dev
Current Version ID: <version-id>
```

---

## Common Issues and Solutions

### Issue 1: Secrets Not Configured

**Symptoms**:
- Workflow fails immediately
- Error: `Input required and not supplied: CLOUDFLARE_API_TOKEN`

**Solution**:
1. Go to: Settings → Secrets and variables → Actions
2. Verify both secrets exist:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

---

### Issue 2: Invalid API Token

**Symptoms**:
- Deploy step fails
- Error: `Invalid Cloudflare API token`

**Solution**:
1. Verify token has "Edit Cloudflare Workers" permission
2. Regenerate token if expired
3. Check token hasn't been revoked

---

### Issue 3: Build Failure

**Symptoms**:
- Build step fails
- Error: TypeScript error, dependency conflict

**Solution**:
1. Check build logs for specific error
2. Test locally first:
   ```bash
   cd apps/dashboard-ui
   npm ci
   npm run build
   ```
3. Fix error → Push commit → Auto-retry

---

### Issue 4: Test Failure (Gateway Only)

**Symptoms**:
- Test step fails (red X)
- Error: Unit test failed

**Solution**:
1. Check test logs for failed test
2. Run tests locally:
   ```bash
   cd apps/gateway-api
   npm run test
   ```
3. Fix test → Push commit → Auto-retry

---

## Deployment Metrics

### Track These Metrics

**Frequency**: How often deployments occur
- Goal: Multiple deploys per day
- Monitor: Number of workflow runs per week

**Success Rate**: Percentage of successful deployments
- Goal: >95% success rate
- Monitor: Failed vs successful runs

**Lead Time**: Time from commit to deployment
- Goal: <5 minutes
- Monitor: Workflow duration

**Mean Time to Recovery (MTTR)**: Time to fix failed deployment
- Goal: <30 minutes
- Monitor: Time between failure and next success

---

## Alerting Strategy

### Enable Notifications

**Option 1: GitHub Email** (Default)
- Settings → Notifications → Actions
- Enable email notifications for failed workflows

**Option 2: Slack Integration**
- Use GitHub Actions Slack app
- Configure workflow notifications

**Option 3: Custom Webhook**
- Add to workflow:
  ```yaml
  - name: Notify on Failure
    if: failure()
    run: |
      curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
        -d '{"text":"Deployment failed: ${{ github.sha }}"}'
  ```

---

## Rollback Monitoring

### After Rollback

**Verify**:
1. Previous version deployed successfully (green check)
2. Worker URL returns expected response
3. No errors in logs
4. Application functionality restored

**Monitor**:
- Watch for recurring failures
- Investigate root cause before re-deploying

---

## Performance Optimization

### Build Time Optimization

**Current**: ~3-5 minutes

**Optimizations**:
- ✅ Dependency caching (enabled)
- ✅ Parallel workflows (independent deployments)
- ⬜ Build artifacts (future enhancement)
- ⬜ Custom runner (future enhancement)

**Target**: <2 minutes per workflow

---

## Security Monitoring

### Regular Checks

**Weekly**:
- Review access to secrets (Settings → Secrets)
- Check for unauthorized workflow runs
- Verify API token permissions

**Monthly**:
- Rotate API tokens (best practice)
- Review workflow permissions
- Audit workflow logs for anomalies

---

## Maintenance Tasks

### Daily
- Monitor failed deployments
- Review workflow durations

### Weekly
- Check secret expiration dates
- Review deployment metrics
- Update dependencies (security patches)

### Monthly
- Rotate API tokens
- Review and update workflows
- Optimize build performance

---

## Emergency Procedures

### Deployment Failure in Production

**Steps**:
1. Identify failure (Actions tab → failed workflow)
2. Review logs (expand failed step)
3. Rollback if needed:
   ```bash
   git revert HEAD
   git push origin main
   ```
4. Fix issue in separate branch
5. Test thoroughly
6. Re-deploy via pull request

---

## Resources

**Documentation**:
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler Action](https://github.com/cloudflare/wrangler-action)

**Project Docs**:
- [DEPLOYMENT_CI_CD.md](./DEPLOYMENT_CI_CD.md) - Complete CI/CD documentation
- [CICD_QUICK_START.md](./CICD_QUICK_START.md) - Setup guide

---

**DevOps Automator**: Claude (DevOps Automator Agent)
**Last Updated**: March 12, 2026
**Status**: Active monitoring
