# Alerts Dashboard Improvement - Phase 2: Frontend Display Updates

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update alert card rendering to display complete information including scope, gateway key name, notification target, and proper status.

**Architecture:** Modify the AlertViewer component to render enhanced alert cards with metadata badges, icons, and proper status indicators based on data from Phase 1 backend changes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide icons

---

## Prerequisites

- [ ] **Phase 1 MUST be complete** - Backend API returns `gateway_key_name`
- [ ] Start local dev servers:
  ```bash
  # Terminal 1 - Gateway
  cd apps/gateway-api && npm run dev

  # Terminal 2 - Dashboard
  cd apps/dashboard-ui && npm run dev
  ```

---

## Task 0: Verify API Response Structure

**Files:**
- Test: `apps/dashboard-ui/src/app/dashboard/alerts/`

- [ ] **Step 1: Check API returns new fields**

Open browser DevTools → Console
Run (with your project ID):
```javascript
fetch('/api/projects/YOUR_PROJECT_ID/alerts')
  .then(r => r.json())
  .then(data => console.log(data))
```

Expected: Each alert object should have:
- `scope` field ('project' or 'key')
- `gateway_key_name` field (string or null)
- `is_enabled` field (0 or 1)

- [ ] **Step 2: If fields are missing, Phase 1 is not complete**

Do not proceed until Phase 1 backend changes are deployed and working.

- [ ] **Step 3: Document API verification**

✅ Confirmed API returns: scope, gateway_key_name, is_enabled

---

## Task 1: Remove Hardcoded "name" Field Usage

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx:229`

- [ ] **Step 1: Read current card rendering**

Run: `sed -n '220,245p' apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx`

Observe line 229 uses `{rule.name}` which doesn't exist in database

- [ ] **Step 2: Replace hardcoded name with auto-generated description**

Find this line:
```tsx
<h3 className="font-bold text-lg">{rule.name}</h3>
```

Replace with:
```tsx
<h3 className="font-bold text-lg">
  {rule.type === 'cost_threshold'
    ? 'Cost Threshold Alert'
    : 'Prompt Injection Alert'}
</h3>
```

- [ ] **Step 3: Test locally**

Open: `http://localhost:3000/dashboard/alerts`

Expected: Alert cards should show "Cost Threshold Alert" or "Prompt Injection Alert" instead of empty/undefined

- [ ] **Step 4: Commit this change**

```bash
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "fix: remove hardcoded name field from alert cards

- Replace rule.name with auto-generated alert type labels
- Fixes undefined display since name field doesn't exist in database
- Part of Phase 2: Frontend display updates"
```

---

## Task 2: Add All Required Icons (One-Time Setup)

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx:1-6`

- [ ] **Step 1: Update all imports at once**

Replace the entire import line (line 4) with:
```tsx
import { Bell, Plus, Trash2, ShieldAlert, DollarSign, AlertCircle, FolderIcon, KeyIcon, MailIcon, Link2Icon } from 'lucide-react';
```

This adds: `FolderIcon, KeyIcon, MailIcon, Link2Icon` to existing imports.

- [ ] **Step 2: Verify no other import changes needed**

All icons for all tasks are now imported in one place.

- [ ] **Step 3: Commit icon imports**

```bash
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "feat: add required icons for alert card enhancements

- Add FolderIcon, KeyIcon for scope badges
- Add MailIcon, Link2Icon for notification targets
- All icons imported from lucide-react"
```

---

## Task 3: Add Scope Badge with Color Coding

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx:235-242`

- [ ] **Step 2: Add scope badge after description**

Find the description paragraph (around line 234):
```tsx
<p className="text-xs text-muted mt-2">
  {rule.type === 'cost_threshold'
    ? `Triggers when project cost exceeds $${rule.threshold}`
    : `Triggers when prompt injection is detected`
  }
</p>
```

Add this immediately after:
```tsx
<div className="mt-3 flex items-center gap-2">
  {rule.scope === 'project' ? (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
      <FolderIcon className="w-3.5 h-3.5" />
      Project Level
    </div>
  ) : (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
      <KeyIcon className="w-3.5 h-3.5" />
      Key Level{rule.gateway_key_name ? `: ${rule.gateway_key_name}` : ''}
    </div>
  )}
</div>
```

- [ ] **Step 3: Test scope badges**

Open: `http://localhost:3000/dashboard/alerts`

Expected:
- Project-level alerts show blue "📁 Project Level" badge
- Key-level alerts show green "🔑 Key Level: [Key Name]" badge
- Deleted keys show "Key Level" (no name)

- [ ] **Step 4: Handle deleted key edge case**

Verify the conditional handles null `gateway_key_name`:
```tsx
Key Level{rule.gateway_key_name ? `: ${rule.gateway_key_name}` : ' (Deleted Key)'}
```

Update if you want "Deleted Key" text instead.

- [ ] **Step 5: Commit scope badge**

```bash
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "feat: add scope badges to alert cards

- Blue badge for project-level alerts
- Green badge for key-level alerts with key name
- Graceful handling for deleted keys
- Uses FolderIcon and KeyIcon from lucide-react"
```

---

## Task 4: Add Notification Target Display

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx`

- [ ] **Step 1: Add notification target section**

After the scope badge div (from Task 2), add:
```tsx
<div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
  {rule.action === 'email' ? (
    <>
      <MailIcon className="w-3.5 h-3.5" />
      <span>{rule.target || 'Not configured'}</span>
    </>
  ) : (
    <>
      <Link2Icon className="w-3.5 h-3.5" />
      <span className="truncate max-w-[150px]" title={rule.target}>
        {rule.target || 'Not configured'}
      </span>
    </>
  )}
</div>
```

- [ ] **Step 2: Import MailIcon and Link2Icon**

Add to imports if not present:
```tsx
import { MailIcon, Link2Icon } from 'lucide-react';
```

- [ ] **Step 3: Test notification display**

Open: `http://localhost:3000/dashboard/alerts`

Expected:
- Email alerts show "📧 admin@example.com"
- Webhook alerts show "🔗 https://hooks..." with truncation
- Empty targets show "Not configured" in gray

- [ ] **Step 4: Commit notification display**

```bash
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "feat: add notification target display to alert cards

- Show email/webhook target with appropriate icons
- Truncate long webhook URLs with hover tooltip
- Handle missing targets gracefully"
```

---

## Task 5: Update Status Indicator

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx:236-242`

- [ ] **Step 1: Find hardcoded status indicator**

Locate this section (around line 236-242):
```tsx
<div className="mt-4 pt-4 border-t border-glass-border flex items-center justify-between">
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
    <span className="text-[10px] font-bold uppercase tracking-widest text-green-500/80">Active</span>
  </div>
  <span className="text-[10px] text-muted font-medium italic">Checked real-time</span>
</div>
```

- [ ] **Step 2: Replace with dynamic status**

Replace entire section with:
```tsx
<div className="mt-4 pt-4 border-t border-glass-border flex items-center justify-between">
  <div className="flex items-center gap-2">
    <div className={clsx(
      "w-2 h-2 rounded-full",
      rule.is_enabled
        ? "bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        : "bg-gray-500"
    )}></div>
    <span className={clsx(
      "text-[10px] font-bold uppercase tracking-widest",
      rule.is_enabled ? "text-green-500/80" : "text-gray-500/80"
    )}>
      {rule.is_enabled ? 'Active' : 'Disabled'}
    </span>
  </div>
  {rule.is_enabled && (
    <span className="text-[10px] text-muted font-medium italic">Checked real-time</span>
  )}
</div>
```

- [ ] **Step 3: Test status changes**

Create a test alert with `is_enabled: false` via API or database, then refresh page.

Expected:
- Enabled alerts show green "Active" dot + "Checked real-time"
- Disabled alerts show gray "Disabled" dot + no real-time text

- [ ] **Step 4: Commit status indicator**

```bash
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "feat: add dynamic status indicator to alert cards

- Show Active/Disabled status based on is_enabled field
- Hide 'Checked real-time' for disabled alerts
- Color-coded indicators (green vs gray)"
```

---

## Task 6: Deploy and Test Frontend Changes

**Files:**
- Deploy: `apps/dashboard-ui/`

- [ ] **Step 1: Build for production**

Run:
```bash
cd apps/dashboard-ui
npm run build
```

Expected: No build errors

- [ ] **Step 2: Deploy to Cloudflare Pages**

Run:
```bash
npm run deploy:dashboard
```

Or use your deployment method.

- [ ] **Step 3: Test production dashboard**

Open: `https://<your-dashboard-url>.pages.dev/dashboard/alerts`

Verify:
- [ ] All cards show alert type correctly
- [ ] Scope badges display with proper colors
- [ ] Key names show for key-level alerts
- [ ] Notification targets display
- [ ] Status indicators work correctly

- [ ] **Step 4: Test with different data**

Create test alerts via Project Settings if needed:
1. Project-level cost alert
2. Key-level injection alert
3. Disabled alert

- [ ] **Step 5: Mark Phase 2 complete**

```bash
git tag -a phase2-alerts-frontend-display -m "Phase 2 complete: Alert cards display full information"
git push origin phase2-alerts-frontend-display
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] Alert cards show auto-generated type labels (not undefined)
- [ ] Blue "Project Level" badge appears for project-level alerts
- [ ] Green "Key Level: [name]" badge appears for key-level alerts
- [ ] Notification targets display with appropriate icons
- [ ] Status indicators reflect actual `is_enabled` field
- [ ] "Checked real-time" only shows for enabled alerts
- [ ] Production deployment tested and working
- [ ] Tag created for Phase 2 completion

---

## Next Phase

Phase 2 complete! Proceed to: **2025-03-21-alerts-phase3-form-create.md**

This will add the scope selector and gateway key dropdown to the alert creation form.
