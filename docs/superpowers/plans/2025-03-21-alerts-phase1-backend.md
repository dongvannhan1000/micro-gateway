# Alerts Dashboard Improvement - Phase 1: Backend API Enhancement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update backend API to return gateway key names and verify database schema is correct for alerts.

**Architecture:** Modify the alert repository query to LEFT JOIN with gateway_keys table, returning key names alongside alert rules. This enables frontend to display which gateway key each alert applies to.

**Tech Stack:** Cloudflare D1 (SQLite), Hono.js, TypeScript

---

## Prerequisites

- [ ] Verify migration 0021 is applied
- [ ] Start local dev server: `cd apps/gateway-api && npm run dev`

---

## Task 1: Verify Database Schema

**Files:**
- Check: `packages/db/migrations/0021_add_alert_scope.sql`
- Check: `apps/gateway-api/wrangler.toml`

- [ ] **Step 1: Check migration file exists**

Run: `ls packages/db/migrations/ | grep 0021`
Expected: `0021_add_alert_scope.sql`

- [ ] **Step 2: Verify migration adds scope column**

Run: `cat packages/db/migrations/0021_add_alert_scope.sql`
Expected content includes:
```sql
ALTER TABLE alert_rules ADD COLUMN scope TEXT NOT NULL DEFAULT 'project';
ALTER TABLE alert_rules ADD COLUMN gateway_key_id TEXT;
```

- [ ] **Step 3: Apply migration locally if needed**

Run:
```bash
cd packages/db
npm run migrate:local
```

Expected output: `Migration 0021 applied successfully` or `Already applied`

- [ ] **Step 4: Verify schema with wrangler**

Run:
```bash
cd apps/gateway-api
wrangler d1 execute MICRO_GATEWAY_DB --local --command="PRAGMA table_info(alert_rules);"
```

Expected: Should see `scope` and `gateway_key_id` columns in output

- [ ] **Step 5: Commit verification**

```bash
git add packages/db/migrations/
git commit -m "chore: verify migration 0021 for alert scope support"
```

---

## Task 2: Update Backend Repository Query

**Files:**
- Modify: `apps/gateway-api/src/repositories/alert.repository.ts`

- [ ] **Step 1: Read current repository implementation**

Run: `cat apps/gateway-api/src/repositories/alert.repository.ts`

Observe current `findRulesByProject` method uses simple SELECT without JOIN

- [ ] **Step 2: Update query to include LEFT JOIN**

Replace the `findRulesByProject` method:

```typescript
async findRulesByProject(projectId: string): Promise<AlertRule[]> {
  const result = await this.db.prepare(`
    SELECT
      ar.*,
      gk.name as gateway_key_name
    FROM alert_rules ar
    LEFT JOIN gateway_keys gk ON ar.gateway_key_id = gk.id
    WHERE ar.project_id = ?
    ORDER BY ar.created_at DESC
  `).bind(projectId).all();

  return result.results as any[];
}
```

- [ ] **Step 3: Update TypeScript interface if needed**

Check if `AlertRule` interface needs `gateway_key_name?: string` field

If interface exists in file, add:
```typescript
gateway_key_name?: string;
```

- [ ] **Step 4: Test API response locally**

First, ensure gateway is running:
```bash
cd apps/gateway-api
npm run dev
```

Then test with a real project ID:
```bash
# Get a project ID from dashboard first
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8787/api/projects/PROJECT_ID/alerts
```

Expected response should include `gateway_key_name` field:
```json
{
  "id": "abc123",
  "type": "cost_threshold",
  "scope": "key",
  "gateway_key_id": "key456",
  "gateway_key_name": "My API Key",
  "threshold": 50,
  "action": "email",
  "target": "admin@example.com",
  "is_enabled": 1,
  "created_at": "2025-03-21T10:00:00Z"
}
```

- [ ] **Step 5: Commit backend changes**

```bash
git add apps/gateway-api/src/repositories/alert.repository.ts
git commit -m "feat: add gateway_key_name to alerts API response

- LEFT JOIN with gateway_keys table to fetch key names
- Enables frontend to display which key each alert applies to
- Null gateway_key_name for deleted keys (graceful degradation)"
```

---

## Task 3: Deploy and Test Backend Changes

**Files:**
- Deploy: `apps/gateway-api/` (entire backend)

- [ ] **Step 1: Deploy to Cloudflare Workers**

Run:
```bash
cd apps/gateway-api
npm run deploy
```

Expected: `Published <worker-name>` output

- [ ] **Step 2: Test production API**

```bash
curl -H "Authorization: Bearer YOUR_PRODUCTION_TOKEN" \
  https://<your-worker-url>.workers.dev/api/projects/PROJECT_ID/alerts
```

Expected: Response includes `gateway_key_name` field

- [ ] **Step 3: Create test data for verification**

If you have key-level alerts, verify they return with key names.
If not, create one via dashboard first.

- [ ] **Step 4: Document any issues**

Create notes file if you encounter problems:
```bash
echo "Backend deployment notes: $(date)" > ~/alerts-phase1-notes.md
```

- [ ] **Step 5: Mark Phase 1 complete**

```bash
git tag -a phase1-alerts-backend -m "Phase 1 complete: Backend returns gateway_key_name"
git push origin phase1-alerts-backend
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] Migration 0021 is applied in production
- [ ] `findRulesByProject` includes LEFT JOIN
- [ ] API returns `gateway_key_name` for key-level alerts
- [ ] API returns `null` for `gateway_key_name` when key is deleted
- [ ] Production API tested and working
- [ ] Tag created for Phase 1 completion

---

## Next Phase

Phase 1 complete! Proceed to: **2025-03-21-alerts-phase2-frontend-display.md**

This will update the frontend card rendering to display all the new information.
