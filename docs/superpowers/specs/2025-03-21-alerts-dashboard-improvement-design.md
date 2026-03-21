# Alerts Dashboard Improvement Design

**Date:** 2025-03-21
**Status:** Approved
**Author:** Claude (Sonnet 4.6)

## Overview

Improve the Dashboard Alerts page (`/dashboard/alerts`) to display complete alert information, enabling users to distinguish between alerts effectively. The two Alerts sections serve different purposes and will both be retained.

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
- Gateway key name (if available)
- Usage info: `$X / $limit` (if available)

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
- Key-level without key info → "Key Level (Unknown Key)"
- Invalid threshold → "N/A"

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

### Fix Create Alert Form

**Current issue:** Create form doesn't send `scope` field

**Required fix in `alert-viewer.tsx`:**
```typescript
// Add scope selector to create form (lines 126-209)
const [newRule, setNewRule] = useState({
    type: 'cost_threshold',
    scope: 'project',  // ← ADD THIS
    gatewayKeyId: '',  // ← ADD THIS for key-level
    threshold: 0,
    action: 'email',
    target: ''
});

// Update payload (lines 67-72)
const payload = {
    type: newRule.type,
    scope: newRule.scope,  // ← ADD THIS
    gateway_key_id: newRule.scope === 'key' ? newRule.gatewayKeyId : null,  // ← ADD THIS
    threshold: newRule.threshold,
    action: newRule.action,
    target: newRule.target
};
```

## Implementation Plan

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

1. Check backend API response structure first
2. Update frontend component to use available data
3. Add visual polish (icons, colors, badges)

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
