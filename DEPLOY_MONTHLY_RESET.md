# Monthly Usage Reset Feature - Deployment Guide

## Summary

The Monthly Usage Reset cron job has been successfully implemented for the Micro-Security Gateway. This feature automatically resets API key usage on the 1st of every month at 00:00 UTC.

## Files Created/Modified

### Created Files
1. **C:\Users\duyen\OneDrive\Desktop\projects_2025\micro-gateway\apps\gateway-api\src\cron\monthly-reset.ts**
   - Main cron handler implementation
   - Functions: `scheduled()`, `monthlyUsageReset()`, `manualTrigger()`
   - Includes audit logging to cron_logs table

2. **C:\Users\duyen\OneDrive\Desktop\projects_2025\micro-gateway\packages\db\migrations\0006_add_cron_logs.sql**
   - Creates `cron_logs` table for audit trail
   - Tracks job execution status and results

3. **C:\Users\duyen\OneDrive\Desktop\projects_2025\micro-gateway\apps\gateway-api\src\cron\monthly-reset.test.ts**
   - Unit tests for cron functionality
   - Tests success cases, error handling, and logging

4. **C:\Users\duyen\OneDrive\Desktop\projects_2025\micro-gateway\apps\gateway-api\docs\MONTHLY_RESET_CRON.md**
   - Comprehensive documentation
   - Testing instructions and troubleshooting

### Modified Files
1. **C:\Users\duyen\OneDrive\Desktop\projects_2025\micro-gateway\apps\gateway-api\wrangler.toml**
   - Added cron trigger configuration: `schedule = "0 0 1 * *"`

2. **C:\Users\duyen\OneDrive\Desktop\projects_2025\micro-gateway\apps\gateway-api\src\index.ts**
   - Exported `scheduled` handler for Cloudflare Workers

## Cron Schedule Configuration

```
Schedule: 0 0 1 * *
Timezone: UTC
Frequency: Monthly (1st day at 00:00 UTC)
```

## Deployment Steps

### Step 1: Apply Database Migration

The migration has already been applied locally. Apply to production:

```bash
cd C:/Users/duyen/OneDrive/Desktop/projects_2025/micro-gateway/apps/gateway-api
npx wrangler d1 migrations apply ms-gateway-db --remote
```

Expected output:
```
✅ 0006_add_cron_logs.sql
```

### Step 2: Deploy Worker

Deploy the updated worker to Cloudflare:

```bash
cd C:/Users/duyen/OneDrive/Desktop/projects_2025/micro-gateway/apps/gateway-api
npm run deploy
```

### Step 3: Verify Cron Trigger

After deployment, verify the cron trigger is registered:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select `gateway-api`
3. Navigate to Triggers tab
4. Verify cron trigger: `0 0 1 * *`

### Step 4: Test Execution

Test the cron trigger manually:

1. In Cloudflare Dashboard, go to Workers & Pages → gateway-api → Triggers
2. Click "Send test" button next to the cron trigger
3. Check the Logs tab for execution output

Expected logs:
```
[CronJob] Action: scheduled_event_received (Metadata: cron="0 0 1 * *", scheduled_time=...)
[CronJob] Action: monthly_usage_reset_started (Metadata: timestamp=...)
[CronJob] Action: monthly_usage_reset_completed (Metadata: timestamp=..., keys_reset=...)
[CronJob] Action: audit_log_created (Metadata: timestamp=..., keys_reset=..., status=success)
```

## Testing Instructions

### Option 1: Manual Testing via Cloudflare Dashboard

1. Deploy the worker
2. Navigate to Workers & Pages → gateway-api → Triggers
3. Click "Send test" next to the cron trigger
4. Verify logs show successful execution

### Option 2: Local Testing (Requires Wrangler)

You can test the reset logic locally by creating a temporary test endpoint (see documentation).

### Option 3: Unit Tests

Run the unit tests:

```bash
cd C:/Users/duyen/OneDrive/Desktop/projects_2025/micro-gateway/apps/gateway-api
npm run test
```

## Verification Queries

After the cron job executes, verify in the database:

```sql
-- Check if usage was reset
SELECT id, name, current_month_usage_usd, status
FROM gateway_keys
WHERE revoked_at IS NULL;

-- All active keys should show current_month_usage_usd = 0.00

-- Check cron log entry
SELECT * FROM cron_logs
WHERE job_name = 'monthly_usage_reset'
ORDER BY executed_at DESC
LIMIT 1;
```

## Key Features Implemented

### 1. Automatic Monthly Reset
- Resets `current_month_usage_usd` to 0 for all active API keys
- Only affects keys where `revoked_at IS NULL` (active keys)
- Revoked keys are not reset

### 2. Comprehensive Logging
- Structured logging following project conventions
- Logs include action name and metadata format
- All operations logged to Cloudflare Workers logs

### 3. Audit Trail
- Creates entry in `cron_logs` table for each execution
- Records: job_name, status, keys_reset, error_message, executed_at
- Immutable audit trail for compliance

### 4. Error Handling
- Try-catch blocks around database operations
- Graceful error logging on failures
- Continues execution even if audit log fails (uses waitUntil)

### 5. Cloudflare Workers Integration
- Properly exports `scheduled` handler
- Uses `ctx.waitUntil()` for background operations
- Compatible with Cloudflare Workers cron triggers

## Security Considerations

### Secured by Design
- Cron triggers are internal to Cloudflare infrastructure
- No HTTP endpoint exposed by default
- Cannot be triggered externally (except via Dashboard "Send test")

### Manual Trigger Endpoint
The `manualTrigger()` function exists for testing but is NOT exposed as an HTTP route.

If you want to expose it for testing, SECURE IT PROPERLY:

```typescript
import { verifyAuth } from '../middleware/session-auth';

managementRouter.post('/cron/test/monthly-reset', verifyAuth, async (c) => {
  const result = await manualTrigger(c.env);
  return result;
});
```

## Monitoring and Alerts

### Cloudflare Workers Logs
Monitor execution in real-time:

```bash
wrangler tail --format pretty
```

### Dashboard Integration (Future)
Consider adding to the dashboard:
- Last execution time
- Number of keys reset
- Recent cron log entries
- Failure alerts

## Troubleshooting

### Issue: Cron job not executing

**Solutions:**
1. Verify `wrangler.toml` has `[[triggers.crons]]` section
2. Redeploy: `npm run deploy`
3. Check Cloudflare Dashboard → Triggers tab

### Issue: Database errors

**Solutions:**
1. Verify migration applied: Check `cron_logs` table exists
2. Check D1 database binding in wrangler.toml
3. Review Cloudflare Workers logs

### Issue: Keys not being reset

**Solutions:**
1. Verify there are active keys: `SELECT COUNT(*) FROM gateway_keys WHERE revoked_at IS NULL`
2. Check cron_logs table for execution status
3. Review Workers logs for errors

## Rollback Procedure

If needed, disable the cron trigger:

1. Comment out in `wrangler.toml`:
```toml
# [[triggers.crons]]
# schedule = "0 0 1 * *"
```

2. Redeploy: `npm run deploy`

3. To restore data (if reset incorrectly):
```sql
UPDATE gateway_keys g
SET current_month_usage_usd = (
  SELECT COALESCE(SUM(rl.cost_usd), 0)
  FROM request_logs rl
  WHERE rl.gateway_key_id = g.id
    AND rl.created_at >= DATE('now', 'start of month')
);
```

## Next Steps

### Recommended Actions
1. Deploy to production
2. Test cron trigger via Cloudflare Dashboard
3. Monitor first execution on the 1st of next month
4. Set up monitoring/alerts for failures

### Future Enhancements
1. Add cron job status page to dashboard
2. Implement email notifications for failures
3. Add usage archival before reset
4. Support per-project billing cycles

## Documentation

Full documentation available at:
- **C:\Users\duyen\OneDrive\Desktop\projects_2025\micro-gateway\apps\gateway-api\docs\MONTHLY_RESET_CRON.md**

## Support Resources

- [Cloudflare Workers Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)

---

**Status**: Implementation Complete
**Ready for Deployment**: Yes
**Testing Status**: Unit tests created, manual testing required
**Migration Status**: Applied locally, ready for remote
