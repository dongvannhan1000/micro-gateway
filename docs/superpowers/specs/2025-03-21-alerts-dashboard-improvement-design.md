# Alerts Dashboard Improvement Design

**Date:** 2025-03-21
**Status:** Approved
**Author:** Claude (Sonnet 4.6)

## Overview

Improve the Dashboard Alerts page (`/dashboard/alerts`) to display complete alert information, enabling users to distinguish between alerts effectively. The two Alerts sections serve different purposes and will both be retained.

## Prerequisites

- [ ] Migration `0021_add_alert_scope.sql` applied to database
- [ ] Backend restarted after migration
- [ ] Verify `alert_rules` table has `scope` and `gateway_key_id` columns

**Verification commands:**
```bash
# Check current database schema
cd apps/gateway-api
wrangler d1 execute <DB_NAME> --command="PRAGMA table_info(alert_rules);"

# Verify migration applied
wrangler d1 migrations list <DB_NAME> | grep 0021
```

## Breaking Changes

⚠️ **Frontend will break after backend update!**

**Issue:** Current frontend displays `{rule.name}` (line 229 in alert-viewer.tsx) but this field doesn't exist in database.

**Solution:** Update frontend to use auto-generated descriptions:
```typescript
// Replace this:
<h3 className="font-bold text-lg">{rule.name}</h3>

// With this:
<h3 className="font-bold text-lg">
  {rule.type === 'cost_threshold'
    ? `Cost Threshold Alert`
    : `Prompt Injection Alert`}
</h3>
```

## Problem Statement

The Dashboard Alerts page currently shows limited information:
- Alert name
- Alert type (cost/injection)
- Threshold value
- Hardcoded "Active" status

**Missing critical information:**
- Alert scope (project-level vs key-level)
- Gateway key details (for key-level alerts)
- Notification target (email/webhook destination)
- Actual enabled/disabled status from database

## Context

Two Alerts sections exist and serve different purposes:

1. **Top-Level Alerts** (`/dashboard/alerts`)
   - Cross-project management
   - Quick overview across all projects
   - Project selection dropdown

2. **Project-Level Alerts** (`/dashboard/projects/[id]/settings`)
   - Single-project detailed configuration
   - Enhanced UX with key selection
   - Better form validation

**Decision:** Keep both sections (not duplicates - complementary features)

## Design: Expanded Card Display

### Card Layout & Information Hierarchy

```
┌────────────────────────────────────────────┐
│ [Icon]              [Delete button]        │
│                                              │
│ Alert Type & Description                     │
│ "Cost Threshold - Triggers when > $50"      │
│                                              │
│ ┌────────────────────────────────────┐     │
│ │ 📁 Project Level                    │     │
│ │ 📧 admin@example.com                │     │
│ └────────────────────────────────────┘     │
│                                              │
│ [Status indicator] [Real-time check text]   │
└────────────────────────────────────────────┘
```

**Information priority:**
1. **Top:** Alert type (icon + color) + Actions (delete)
2. **Primary:** Alert type + trigger description (auto-generated)
3. **Metadata block:** Scope + notification target
4. **Footer:** Status + monitoring indicator

**Alert Description Generation:**
- Cost Threshold: "Cost Threshold - Triggers when spending exceeds $X"
- Injection: "Prompt Injection - Triggers on high-risk attempts"

### Visual Treatment for Scope & Keys

| Scope | Icon | Color | Badge Text |
|-------|------|-------|------------|
| Project Level | 📁 FolderIcon | Blue | "Project Level" |
| Key Level | 🔑 KeyIcon | Green | "Key Level: [Key Name]" |

**Key-level alerts display:**
- Gateway key name (from JOIN query)
- Note: Usage display deferred to Phase 2 (requires aggregation queries)

**Notification target:**
- Email: 📧 icon + email address
- Webhook: 🔗 icon + truncated URL (first 30 chars)

### Status & State Handling

| State | Badge Color | Text | Icon |
|-------|-------------|------|------|
| Enabled | Green | "Active" | ● (filled circle) |
| Disabled | Gray | "Disabled" | ○ (outline circle) |

**Real-time monitoring:**
- Show "Checked real-time" only when `is_enabled = true`
- Hide when disabled (not monitoring)

### Database Fields Required

**Current Database Schema:**
```sql
CREATE TABLE alert_rules (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'cost_threshold' or 'injection_detected'
    scope TEXT NOT NULL,  -- 'project' or 'key'
    gateway_key_id TEXT,
    threshold REAL,
    action TEXT NOT NULL,  -- 'email' or 'webhook'
    target TEXT NOT NULL,
    is_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Frontend Interface (with backend enhancements):**
```typescript
interface AlertRule {
  id: string;
  project_id: string;
  type: 'cost_threshold' | 'injection_detected';
  threshold?: number;
  scope: 'project' | 'key';
  gateway_key_id?: string;
  gateway_key_name?: string;  // ← NEW (from JOIN)
  action: 'email' | 'webhook';
  target: string;
  is_enabled: boolean;
  created_at: string;
}
```

**Note:** `name` field was removed from spec (not in current schema). Alerts will be identified by type + scope + target.

### Edge Cases & Error Handling

**Missing data fallbacks:**
- No target → "Not configured" (gray)
- Key-level without key name → "Key Level (Unknown Key)"
- Key-level with deleted key → "Key Level (Deleted Key)"
- Invalid threshold → "N/A"
- Null `is_enabled` → Assume `true` (enabled)

**Empty states:**
- No project selected → Show prompt "Select a project"
- No alerts → Show empty state with description

### Mobile Responsiveness

**Responsive grid:**
- Large (≥1024px): 3 columns
- Medium (≥768px): 2 columns
- Small (<768px): 1 column

**Mobile card adjustments:**
- Reduce padding: `p-6` → `p-4`
- Smaller text sizes
- Stack metadata block vertically

## Backend Implementation Required

### API Enhancement

**Current:** `GET /api/projects/{id}/alerts`
```typescript
// Current implementation in apps/gateway-api/src/management/alerts.ts
async findRulesByProject(projectId: string) {
  return db.query(
    "SELECT * FROM alert_rules WHERE project_id = ?",
    [projectId]
  );
}
```

**Required:** Add LEFT JOIN to get gateway key names
```typescript
async findRulesByProject(projectId: string) {
  return db.query(`
    SELECT
      ar.*,
      gk.name as gateway_key_name
    FROM alert_rules ar
    LEFT JOIN gateway_keys gk ON ar.gateway_key_id = gk.id
    WHERE ar.project_id = ?
    ORDER BY ar.created_at DESC
  `, [projectId]);
}
```

**Implementation Status:** PENDING - Backend query needs update

**Error handling:** If `gateway_key_name` is NULL (key was deleted), frontend should display "Key Level (Deleted Key)"

### Fix Create Alert Form

**Current issue:** Create form doesn't send `scope` field

**Required fix in `alert-viewer.tsx`:**

1. **Add scope selector to create form:**
```typescript
// Add to form state (lines 19-25)
const [newRule, setNewRule] = useState({
    type: 'cost_threshold',
    scope: 'project',  // ← ADD THIS
    gatewayKeyId: '',  // ← ADD THIS for key-level
    threshold: 0,
    action: 'email',
    target: ''
});

// Fetch gateway keys for dropdown
const [gatewayKeys, setGatewayKeys] = useState([]);
useEffect(() => {
  if (selectedProjectId) {
    fetch(`${GATEWAY_URL}/api/projects/${selectedProjectId}/gateway-keys`)
      .then(r => r.json())
      .then(setGatewayKeys);
  }
}, [selectedProjectId]);
```

2. **Add UI for scope selection:**
```tsx
<!-- Add to create form after type selector -->
<div className="space-y-1.5">
  <label className="text-[10px] uppercase font-bold text-muted px-1">
    Alert Scope
  </label>
  <select
    value={newRule.scope}
    onChange={e => setNewRule({...newRule, scope: e.target.value})}
    className="bg-glass-bg border border-glass-border rounded-xl px-3 py-2 text-sm w-full"
  >
    <option value="project">Project Level (All Keys)</option>
    <option value="key">Specific Gateway Key</option>
  </select>
</div>

{newRule.scope === 'key' && (
  <div className="space-y-1.5">
    <label className="text-[10px] uppercase font-bold text-muted px-1">
      Select Gateway Key
    </label>
    <select
      value={newRule.gatewayKeyId}
      onChange={e => setNewRule({...newRule, gatewayKeyId: e.target.value})}
      className="bg-glass-bg border border-glass-border rounded-xl px-3 py-2 text-sm w-full"
      required
    >
      <option value="">Choose a key...</option>
      {gatewayKeys.map(key => (
        <option key={key.id} value={key.id}>
          {key.name}
        </option>
      ))}
    </select>
  </div>
)}
```

3. **Update payload to include scope:**
```typescript
const payload = {
    type: newRule.type,
    scope: newRule.scope,
    gateway_key_id: newRule.scope === 'key' ? newRule.gatewayKeyId : null,
    threshold: newRule.threshold,
    action: newRule.action,
    target: newRule.target
};
```

**Implementation Status:** PENDING - Form needs scope selector and key dropdown

## Implementation Plan

### API Contract Testing

Before starting frontend work, verify the backend API returns correct data:

```bash
# Test API response (after backend update)
curl -H "Authorization: Bearer <TOKEN>" \
  https://<gateway-url>/api/projects/<project-id>/alerts

# Expected response structure:
{
  "id": "abc123",
  "type": "cost_threshold",
  "scope": "project",
  "gateway_key_id": null,
  "gateway_key_name": null,
  "threshold": 50,
  "action": "email",
  "target": "admin@example.com",
  "is_enabled": true,
  "created_at": "2025-03-21T10:00:00Z"
}
```

### Rollback Plan

If implementation fails, rollback steps:

1. **Backend rollback:** Revert `findRulesByProject` to original query (remove JOIN)
2. **Frontend rollback:** Revert alert-viewer.tsx to previous version
3. **Database:** No rollback needed (migration only adds columns, never removes)

**Rollback command:**
```bash
git revert <commit-hash> --no-commit
npm run deploy:gateway
```

### Files to Modify

1. **`apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx`**
   - Update card rendering logic
   - Add visual treatment for scope/key/target
   - Update status indicator logic

2. **`apps/dashboard-ui/src/app/dashboard/alerts/actions.ts`** (if needed)
   - Check API response structure
   - Ensure backend returns complete fields

3. **Backend API** (if needed)
   - Verify `/api/projects/{id}/alerts` returns all required fields
   - Add `gateway_key_name`, `is_enabled` if missing

### Implementation Priority

**Phase 1 - Backend (Required First):**
1. [ ] Update `findRulesByProject` query to LEFT JOIN with gateway_keys
2. [ ] Verify migration 0021 is applied
3. [ ] Test API response includes `gateway_key_name`

**Phase 2 - Frontend Core:**
1. [ ] Update card rendering to display `is_enabled` status
2. [ ] Add scope badges (Project/Key level) with color coding
3. [ ] Add notification target display with icons
4. [ ] Update create form to include scope selector
5. [ ] Add gateway key dropdown when scope='key'

**Phase 3 - Visual Polish:**
1. [ ] Add icons and color coding
2. [ ] Implement responsive layout
3. [ ] Test edge cases and error states

## Testing Checklist

### Backend Tests
- [ ] API returns `gateway_key_name` for key-level alerts
- [ ] API returns `is_enabled` field correctly
- [ ] Create alert accepts `scope` and `gateway_key_id` fields
- [ ] LEFT JOIN query doesn't break when gateway_key_id is null

### Frontend Tests
- [ ] Project-level alerts display correctly with blue "Project Level" badge
- [ ] Key-level alerts display with green "Key Level: [name]" badge
- [ ] Email targets show with 📧 icon
- [ ] Webhook targets show with 🔗 icon and truncated URL
- [ ] Disabled alerts show gray "Disabled" status
- [ ] Enabled alerts show green "Active" status
- [ ] "Checked real-time" only shows for enabled alerts
- [ ] Empty states display correctly
- [ ] Mobile responsive layout works
- [ ] Delete functionality still works
- [ ] Project switching works correctly
- [ ] Create form includes scope selector
- [ ] Create form shows key dropdown when scope='key'
- [ ] Key-level alerts can be created successfully

## Success Criteria

Users can quickly identify and distinguish between alerts based on:
- Alert scope (project vs key)
- Associated gateway key (for key-level)
- Notification destination
- Current status (enabled/disabled)

All information visible without clicking or expanding.
