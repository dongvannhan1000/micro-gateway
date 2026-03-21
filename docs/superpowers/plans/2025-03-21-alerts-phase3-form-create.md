# Alerts Dashboard Improvement - Phase 3: Form & Create Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scope selector and gateway key dropdown to alert creation form, enabling users to create key-level alerts.

**Architecture:** Extend the alert creation form in AlertViewer component to include scope selection (project/key) and conditional gateway key dropdown when key-level scope is selected.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4

---

## Prerequisites

- [ ] **Phases 1 & 2 MUST be complete**
- [ ] Backend API returns `gateway_key_name`
- [ ] Alert cards display scope and key information correctly
- [ ] Local dev servers running:
  ```bash
  # Terminal 1 - Gateway
  cd apps/gateway-api && npm run dev

  # Terminal 2 - Dashboard
  cd apps/dashboard-ui && npm run dev
  ```

---

## Task 1: Update Form State for Scope Support

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx:19-25`

- [ ] **Step 1: Read current form state**

Run: `sed -n '15,30p' apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx`

Observe `newRule` state object (lines 19-25)

- [ ] **Step 2: Add scope and gatewayKeyId to state**

Find this:
```tsx
const [newRule, setNewRule] = useState({
    name: '',
    type: 'cost_threshold',
    threshold: 0,
    action: 'email',
    target: ''
});
```

Replace with:
```tsx
const [newRule, setNewRule] = useState({
    type: 'cost_threshold',
    scope: 'project',  // ← NEW
    gatewayKeyId: '',  // ← NEW
    threshold: 0,
    action: 'email',
    target: ''
});
```

Note: Removed `name` field since it's not used anymore

- [ ] **Step 3: Add state for gateway keys list**

After the `newRule` state, add:
```tsx
const [gatewayKeys, setGatewayKeys] = useState<any[]>([]);
```

- [ ] **Step 4: Test that form still renders**

Open: `http://localhost:3000/dashboard/alerts`
Click "Create Rule" button

Expected: Form opens without errors (even though we haven't added UI yet)

- [ ] **Step 5: Commit state updates**

```bash
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "feat: add scope and gateway key fields to form state

- Add scope field (project/key)
- Add gatewayKeyId field for key-level alerts
- Add gatewayKeys state for dropdown options
- Remove unused name field"
```

---

## Task 2: Add Server Action for Gateway Keys

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/actions.ts`
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx`

- [ ] **Step 1: Add getGatewayKeys server action**

Add this to `apps/dashboard-ui/src/app/dashboard/actions.ts` (after line 180):

```typescript
export async function getGatewayKeys(projectId: string) {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Unauthorized');

    return fetchGateway(`/api/projects/${projectId}/gateway-keys`, session.access_token);
}
```

- [ ] **Step 2: Import useEffect in alert-viewer.tsx**

Update the React import (line 3):
```tsx
import React, { useState, useEffect } from 'react';
```

- [ ] **Step 3: Add useEffect to fetch keys using server action**

Add this after the state declarations in alert-viewer.tsx:

```tsx
useEffect(() => {
    const loadKeys = async () => {
        if (selectedProjectId) {
            try {
                const data = await getGatewayKeys(selectedProjectId);
                setGatewayKeys(data || []);
            } catch (err) {
                console.error('Failed to fetch gateway keys:', err);
                setGatewayKeys([]);
            }
        }
    };
    loadKeys();
}, [selectedProjectId]);
```

- [ ] **Step 4: Import getGatewayKeys in page.tsx and pass to component**

Update `apps/dashboard-ui/src/app/dashboard/alerts/page.tsx`:

Change import (line 2):
```tsx
import { getAlertRules, getProjects, getGatewayKeys } from '../actions';
```

Update the component call (line 35-39):
```tsx
return (
    <AlertViewer
        initialRules={initialRules}
        projects={projects}
        initialProjectId={selectedId}
        getGatewayKeys={getGatewayKeys}  // ← ADD THIS
    />
);
```

- [ ] **Step 5: Update AlertViewer interface and implementation**

Update the props interface in alert-viewer.tsx (line 8-12):
```tsx
interface AlertViewerProps {
    initialRules: any[];
    projects: any[];
    initialProjectId: string;
    getGatewayKeys: (projectId: string) => Promise<any[]>;  // ← ADD THIS
}
```

Update component signature:
```tsx
export function AlertViewer({ initialRules, projects, initialProjectId, getGatewayKeys }: AlertViewerProps) {
```

Update the useEffect to use the prop:
```tsx
useEffect(() => {
    const loadKeys = async () => {
        if (selectedProjectId) {
            try {
                const data = await getGatewayKeys(selectedProjectId);
                setGatewayKeys(data || []);
            } catch (err) {
                console.error('Failed to fetch gateway keys:', err);
                setGatewayKeys([]);
            }
        }
    };
    loadKeys();
}, [selectedProjectId, getGatewayKeys]);
```

- [ ] **Step 6: Test key fetching**

Open browser DevTools → Network
Open: `http://localhost:3000/dashboard/alerts`
Select a project

Expected: Should see API call to `/api/projects/{id}/gateway-keys`

- [ ] **Step 7: Commit server action**

```bash
git add apps/dashboard-ui/src/app/dashboard/actions.ts
git add apps/dashboard-ui/src/app/dashboard/alerts/page.tsx
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "feat: add getGatewayKeys server action

- Add server action following existing Supabase pattern
- Pass getGatewayKeys to AlertViewer as prop
- Load keys when selected project changes
- Uses server action, not direct fetch with token"
```

---

## Task 3: Add Scope Selector UI

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx:143-152`

- [ ] **Step 1: Find the Trigger Type selector**

Locate this section in the create form (around line 143):
```tsx
<div className="space-y-1.5">
    <label className="text-[10px] uppercase font-bold text-muted px-1">Trigger Type</label>
    <select ...>
```

- [ ] **Step 2: Add Scope Selector after Type selector**

After the closing `</div>` of the Trigger Type selector, add:
```tsx
<div className="space-y-1.5">
    <label className="text-[10px] uppercase font-bold text-muted px-1">Alert Scope</label>
    <select
        className="bg-glass-bg border border-glass-border rounded-xl px-3 py-2 text-sm w-full outline-none focus:border-accent-violet/50"
        value={newRule.scope}
        onChange={e => {
            setNewRule({...newRule, scope: e.target.value, gatewayKeyId: ''});
        }}
    >
        <option value="project">Project Level (All Keys)</option>
        <option value="key">Specific Gateway Key</option>
    </select>
</div>
```

- [ ] **Step 3: Test scope selector**

Open: `http://localhost:3000/dashboard/alerts`
Click "Create Rule"
Verify dropdown shows two options

Expected:
- "Project Level (All Keys)"
- "Specific Gateway Key"

- [ ] **Step 4: Test scope switching**

Select "Specific Gateway Key", then back to "Project Level"

Expected: `newRule.gatewayKeyId` should be cleared when switching scopes

- [ ] **Step 5: Commit scope selector**

```bash
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "feat: add alert scope selector to create form

- Add dropdown to choose project-level or key-level scope
- Clear gatewayKeyId when switching scopes
- Clear labels for user understanding"
```

---

## Task 4: Add Gateway Key Dropdown (Conditional)

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx`

- [ ] **Step 1: Add key dropdown after scope selector**

Immediately after the scope selector `</div>`, add:
```tsx
{newRule.scope === 'key' && (
    <div className="space-y-1.5">
        <label className="text-[10px] uppercase font-bold text-muted px-1">Select Gateway Key</label>
        <select
            className="bg-glass-bg border border-glass-border rounded-xl px-3 py-2 text-sm w-full outline-none focus:border-accent-violet/50"
            value={newRule.gatewayKeyId}
            onChange={e => setNewRule({...newRule, gatewayKeyId: e.target.value})}
            required
        >
            <option value="">Choose a key...</option>
            {gatewayKeys.map(key => (
                <option key={key.id} value={key.id}>
                    {key.name}
                </option>
            ))}
        </select>
        {gatewayKeys.length === 0 && (
            <p className="text-xs text-amber-500">No active gateway keys found. Create one first.</p>
        )}
    </div>
)}
```

- [ ] **Step 2: Test conditional dropdown**

Open: `http://localhost:3000/dashboard/alerts`
Click "Create Rule"
Select "Project Level" → Key dropdown should NOT show
Select "Specific Gateway Key" → Key dropdown SHOULD show

- [ ] **Step 3: Test with keys in project**

Make sure the selected project has at least one gateway key.
If not, create one via Project Settings first.

Expected: Dropdown lists all gateway keys for the project

- [ ] **Step 4: Test empty state**

Select a project with no gateway keys
Choose "Specific Gateway Key" scope

Expected: Shows "No active gateway keys found" message

- [ ] **Step 5: Commit key dropdown**

```bash
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "feat: add gateway key dropdown to create form

- Show key dropdown only when scope='key'
- List all active gateway keys for project
- Show helpful message when no keys available"
```

---

## Task 5: Update Create Payload

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx:67-72`

- [ ] **Step 1: Find current payload creation**

Locate the `handleCreate` function payload (around line 67):
```tsx
const payload = {
    type: newRule.type,
    threshold: newRule.threshold,
    action: newRule.action,
    target: newRule.target
};
```

- [ ] **Step 2: Add scope and gateway_key_id to payload**

Replace with:
```tsx
const payload = {
    type: newRule.type,
    scope: newRule.scope,
    gateway_key_id: newRule.scope === 'key' ? newRule.gatewayKeyId : null,
    threshold: newRule.threshold,
    action: newRule.action,
    target: newRule.target
};
```

- [ ] **Step 3: Update validation logic**

Find validation section (around line 49-64). Update to check for scope:

After existing validation, add:
```tsx
// Validate scope
if (!newRule.scope) {
    alert('Please select alert scope');
    return;
}

// Validate key selection for key-level scope
if (newRule.scope === 'key' && !newRule.gatewayKeyId) {
    alert('Please select a gateway key');
    return;
}
```

- [ ] **Step 4: Test creating project-level alert**

Open: `http://localhost:3000/dashboard/alerts`
Select a project
Click "Create Rule"
Fill form:
- Type: Cost Threshold
- Scope: Project Level
- Threshold: 50
- Action: Email
- Target: test@example.com

Click "Save Rule"

Expected: Alert created successfully

- [ ] **Step 5: Test creating key-level alert**

Click "Create Rule" again
Fill form:
- Type: Cost Threshold
- Scope: Specific Gateway Key
- Select a key from dropdown
- Threshold: 25
- Action: Email
- Target: test@example.com

Click "Save Rule"

Expected: Alert created successfully

- [ ] **Step 6: Commit payload updates**

```bash
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "feat: send scope and gateway_key_id in create payload

- Include scope field when creating alerts
- Send gateway_key_id for key-level alerts
- Add validation for key selection
- Support both project-level and key-level alert creation"
```

---

## Task 6: Reset Form After Creation

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx:75-76`

- [ ] **Step 1: Find form reset after successful creation**

Locate where form resets after `createAlertRule` succeeds (around line 75):
```tsx
setNewRule({ name: '', type: 'cost_threshold', threshold: 0, action: 'email', target: '' });
```

- [ ] **Step 2: Update reset to include new fields**

Replace with:
```tsx
setNewRule({
    type: 'cost_threshold',
    scope: 'project',
    gatewayKeyId: '',
    threshold: 0,
    action: 'email',
    target: ''
});
```

- [ ] **Step 3: Test form reset**

Create an alert, then click "Create Rule" again immediately

Expected: Form should be reset to defaults, not showing previous values

- [ ] **Step 4: Commit form reset fix**

```bash
git add apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "fix: reset form fields correctly after alert creation

- Include scope and gatewayKeyId in reset
- Ensures clean form state for next alert creation"
```

---

## Task 7: Final Testing & Deployment

**Files:**
- Test: `apps/dashboard-ui/src/app/dashboard/alerts/`

- [ ] **Step 1: Full local testing**

Test all scenarios:

1. **Project-level cost alert:**
   - Scope: Project Level
   - Type: Cost Threshold
   - Threshold: 100
   - Verify: Shows in list with blue "Project Level" badge

2. **Key-level injection alert:**
   - Scope: Specific Gateway Key
   - Select a key
   - Type: Prompt Injection
   - Verify: Shows in list with green "Key Level: [key name]" badge

3. **Delete alerts:**
   - Create then delete both types
   - Verify: Both delete successfully

- [ ] **Step 2: Build for production**

```bash
cd apps/dashboard-ui
npm run build
```

Expected: No build errors

- [ ] **Step 3: Deploy to production**

```bash
npm run deploy:dashboard
```

- [ ] **Step 4: Test production environment**

Open: `https://<your-dashboard-url>.pages.dev/dashboard/alerts`

Repeat all tests from Step 1 in production.

- [ ] **Step 5: Create summary documentation**

```bash
cat > ~/alerts-phase3-summary.md << 'EOF'
# Alerts Dashboard - Phase 3 Complete

## What Was Done
- Added scope selector (Project/Key level)
- Added gateway key dropdown for key-level alerts
- Updated create payload to include scope and gateway_key_id
- Added validation for key selection

## Testing Results
- ✅ Project-level alerts created successfully
- ✅ Key-level alerts created successfully
- ✅ Conditional dropdown works correctly
- ✅ Form resets properly after creation
- ✅ Production deployment tested

## Known Issues
None
EOF
```

- [ ] **Step 6: Mark Phase 3 complete**

```bash
git tag -a phase3-alerts-form-create -m "Phase 3 complete: Alert creation form supports key-level alerts"
git push origin phase3-alerts-form-create
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] Scope selector appears in create form
- [ ] Key dropdown only shows when "Specific Gateway Key" selected
- [ ] Key dropdown lists all active gateway keys
- [ ] Validation prevents creating key-level alerts without selecting a key
- [ ] Project-level alerts create successfully
- [ ] Key-level alerts create successfully with correct key_id
- [ ] Created alerts display with correct scope badges
- [ ] Form resets properly after creation
- [ ] Production deployment tested
- [ ] All 3 phases tagged and complete

---

## Full Project Complete!

🎉 **All 3 phases complete!**

The Alerts Dashboard now:
- ✅ Displays complete alert information (scope, key name, target, status)
- ✅ Supports creating both project-level and key-level alerts
- ✅ Shows proper status indicators
- ✅ Has graceful error handling

**Tags created:**
- `phase1-alerts-backend`
- `phase2-alerts-frontend-display`
- `phase3-alerts-form-create`

**Next Steps (Optional Future Enhancements):**
- Usage info display for keys ($X / $limit) - deferred to Phase 2
- Alert enable/disable toggle UI
- Alert editing (not just create/delete)
- Alert history / trigger logs
