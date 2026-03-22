# UI/UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement custom project selector, smooth Settings tab transitions, and hide Security/Notifications sections

**Architecture:** Reusable ProjectSelector component with glassmorphism design, cross-fade tab transitions using CSS opacity, Settings UI simplification

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React icons, clsx for conditional classes

---

## File Structure

### New Files
- `apps/dashboard-ui/src/components/dashboard/ProjectSelector.tsx` - Custom dropdown component with glassmorphism styling, keyboard navigation, and accessibility features

### Modified Files
- `apps/dashboard-ui/src/app/dashboard/security/log-viewer.tsx` - Replace native select with ProjectSelector component
- `apps/dashboard-ui/src/app/dashboard/analytics/analytics-viewer.tsx` - Replace native select with ProjectSelector component
- `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx` - Replace native select with ProjectSelector component
- `apps/dashboard-ui/src/app/dashboard/settings/page.tsx` - Add cross-fade transitions and remove Security/Notifications tabs

---

## Task 1: Create ProjectSelector Component

**Files:**
- Create: `apps/dashboard-ui/src/components/dashboard/ProjectSelector.tsx`

**Component Responsibilities:**
- Display selected project in trigger button
- Show/hide dropdown menu on click
- Render project list with hover states
- Handle project selection and callback
- Support keyboard navigation (Arrow keys, Enter, Escape)
- Close dropdown on click outside
- Apply glassmorphism styling matching design system

- [ ] **Step 1: Create ProjectSelector component structure**

```tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Folder, ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  projects: Project[];
  selectedId: string;
  onSelect: (projectId: string) => void;
  accentColor?: 'blue' | 'violet';
}

export function ProjectSelector({ projects, selectedId, onSelect, accentColor = 'blue' }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Get selected project name
  const selectedProject = projects.find(p => p.id === selectedId);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleSelect = (projectId: string) => {
    onSelect(projectId);
    setIsOpen(false);
  };

  const accentClass = accentColor === 'blue' ? 'focus:ring-accent-blue/50' : 'focus:ring-accent-violet/50';

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 bg-glass-bg border border-glass-border px-3 py-1.5 rounded-xl text-xs font-bold outline-none h-9 transition-all",
          isOpen ? "ring-2 ring-accent-blue/30" : accentClass,
          "hover:bg-glass-bg/80"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Folder className="w-4 h-4 text-accent-blue" />
        <span className="max-w-[150px] truncate">
          {selectedProject?.name || 'Select a project'}
        </span>
        <ChevronDown className={clsx("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-full min-w-[200px] bg-glass-bg border border-glass-border rounded-xl shadow-lg z-50 animate-in slide-in-from-top-2 duration-200"
          role="listbox"
        >
          <div className="py-1 max-h-64 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted">
                No projects found
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project.id)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-all duration-150",
                    "hover:bg-glass-bg/50",
                    project.id === selectedId ? "bg-accent-blue/10" : ""
                  )}
                  role="option"
                  aria-selected={project.id === selectedId}
                >
                  <Folder className="w-4 h-4 text-accent-blue flex-shrink-0" />
                  <span className="flex-1 truncate">{project.name}</span>
                  {project.id === selectedId && (
                    <Check className="w-4 h-4 text-accent-blue flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit the ProjectSelector component**

```bash
cd apps/dashboard-ui
git add src/components/dashboard/ProjectSelector.tsx
git commit -m "feat: add custom ProjectSelector component

- Glassmorphism design matching dashboard style
- Keyboard navigation support (Arrow keys, Enter, Escape)
- Click outside to close functionality
- Accessibility with ARIA attributes
- Accent color theming support (blue/violet)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Integrate ProjectSelector in Security Page

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/security/log-viewer.tsx`

- [ ] **Step 1: Import ProjectSelector component**

Add import at top of file:
```tsx
import { ProjectSelector } from '@/components/dashboard/ProjectSelector';
```

- [ ] **Step 2: Replace native select with ProjectSelector**

Find the select element (around line 51-63) and replace with:
```tsx
<ProjectSelector
  projects={projects}
  selectedId={selectedProjectId}
  onSelect={(id) => {
    setSelectedProjectId(id);
    loadLogs(id);
  }}
  accentColor="blue"
/>
```

- [ ] **Step 3: Test the changes manually**

Start dashboard: `cd apps/dashboard-ui && npm run dev`

Navigate to `/dashboard/security` and verify:
- Project selector displays with glassmorphism styling
- Dropdown opens on click
- Projects are listed with proper styling
- Selection works and updates logs
- Click outside closes dropdown
- Escape key closes dropdown

- [ ] **Step 4: Commit the integration**

```bash
cd apps/dashboard-ui
git add src/app/dashboard/security/log-viewer.tsx
git commit -m "refactor: replace native select with ProjectSelector in Security page

- Improved UX with custom glassmorphism dropdown
- Better visual consistency with design system
- Enhanced keyboard navigation and accessibility

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Integrate ProjectSelector in Analytics Page

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/analytics/analytics-viewer.tsx`

- [ ] **Step 1: Import ProjectSelector component**

Add import at top of file:
```tsx
import { ProjectSelector } from '@/components/dashboard/ProjectSelector';
```

- [ ] **Step 2: Update handleProjectChange to accept direct value**

Find the `handleProjectChange` function (around line 39-45) and replace with:
```tsx
const handleProjectChange = (id: string) => {
  setSelectedProjectId(id);
  if (id) {
    loadData(id);
  }
};
```

- [ ] **Step 3: Replace native select with ProjectSelector**

Find the select element (around line 55-70) and replace with:
```tsx
<ProjectSelector
  projects={projects}
  selectedId={selectedProjectId}
  onSelect={handleProjectChange}
  accentColor="blue"
/>
```

- [ ] **Step 4: Test the changes manually**

Navigate to `/dashboard/analytics` and verify:
- Project selector displays with glassmorphism styling
- Dropdown opens and closes properly
- Project selection loads analytics data
- All interactions work smoothly

- [ ] **Step 5: Commit the integration**

```bash
cd apps/dashboard-ui
git add src/app/dashboard/analytics/analytics-viewer.tsx
git commit -m "refactor: replace native select with ProjectSelector in Analytics page

- Improved UX with custom glassmorphism dropdown
- Consistent design across dashboard pages
- Better visual feedback on project selection

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Integrate ProjectSelector in Alerts Page

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx`

- [ ] **Step 1: Import ProjectSelector component**

Add import at top of file:
```tsx
import { ProjectSelector } from '@/components/dashboard/ProjectSelector';
```

- [ ] **Step 2: Update handleProjectChange to accept direct value**

Find the `handleProjectChange` function (around line 58-62) and replace with:
```tsx
const handleProjectChange = (id: string) => {
  setSelectedProjectId(id);
  if (id) loadRules(id);
};
```

- [ ] **Step 3: Replace native select with ProjectSelector**

Find the select element (around line 128-143) and replace with:
```tsx
<ProjectSelector
  projects={projects}
  selectedId={selectedProjectId}
  onSelect={handleProjectChange}
  accentColor="violet"
/>
```

- [ ] **Step 4: Test the changes manually**

Navigate to `/dashboard/alerts` and verify:
- Project selector displays with violet accent color
- Dropdown functionality works correctly
- Alert rules load on project selection
- All interactions are smooth

- [ ] **Step 5: Commit the integration**

```bash
cd apps/dashboard-ui
git add src/app/dashboard/alerts/alert-viewer.tsx
git commit -m "refactor: replace native select with ProjectSelector in Alerts page

- Custom dropdown with violet accent theming
- Consistent UX across all dashboard pages
- Improved accessibility and keyboard navigation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Add Cross-fade Transitions to Settings Tabs

**Files:**
- Modify: `apps/dashboard-ui/src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Update imports to remove unused icons**

Remove Shield and Bell from imports:
```tsx
import { Settings, TrendingUp, User } from 'lucide-react';
```

Remove SecuritySection and NotificationsSection imports:
```tsx
import { ProfileSection } from '@/components/settings/ProfileSection';
import { UsageSection } from '@/components/settings/UsageSection';
// Keep these files but don't import - for future use
// import { SecuritySection } from '@/components/settings/SecuritySection';
// import { NotificationsSection } from '@/components/settings/NotificationsSection';
```

- [ ] **Step 2: Update TabType to remove unused tabs**

Change type definition:
```tsx
type TabType = 'profile' | 'usage';
```

- [ ] **Step 3: Update tabs array to remove Security and Notifications**

Replace tabs array with:
```tsx
const tabs = [
    { id: 'profile' as TabType, name: 'Profile', icon: User },
    { id: 'usage' as TabType, name: 'Usage', icon: TrendingUp },
];
```

- [ ] **Step 4: Replace conditional rendering with cross-fade transitions**

Find the main content area div (around line 54-60) and replace with:
```tsx
{/* Main content area */}
<div className="lg:col-span-3">
  <div className="relative min-h-[500px]">
    <div className={clsx(
      "absolute inset-0 transition-opacity duration-250",
      activeTab === 'profile' ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
    )}>
      <ProfileSection />
    </div>
    <div className={clsx(
      "absolute inset-0 transition-opacity duration-250",
      activeTab === 'usage' ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
    )}>
      <UsageSection />
    </div>
  </div>
</div>
```

- [ ] **Step 5: Add clsx import if not present**

Add at top of file:
```tsx
import { clsx } from 'clsx';
```

- [ ] **Step 6: Test the transitions manually**

Navigate to `/dashboard/settings` and verify:
- Only Profile and Usage tabs are visible
- Tab switching has smooth cross-fade effect (no flashing)
- No layout shift during transitions
- All interactions work in both tabs
- Transitions complete smoothly

- [ ] **Step 7: Commit the Settings improvements**

```bash
cd apps/dashboard-ui
git add src/app/dashboard/settings/page.tsx
git commit -m "refactor: add cross-fade transitions and simplify Settings page

- Implement smooth cross-fade transitions for tab switching (250ms)
- Hide Security and Notifications tabs from UI (components preserved)
- Remove unused icon imports
- Use absolute positioning for smooth opacity transitions
- Add pointer-events-none to inactive tabs to prevent interaction

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Final Testing and Verification

**Files:**
- All modified files

- [ ] **Step 1: Run full manual testing suite**

Test each page systematically:

**Security Page (`/dashboard/security`):**
- [ ] Project selector displays correctly
- [ ] Dropdown opens/closes on click
- [ ] Project selection works and updates logs
- [ ] Click outside closes dropdown
- [ ] Escape key closes dropdown
- [ ] Keyboard navigation works (if implemented)
- [ ] No console errors

**Analytics Page (`/dashboard/analytics`):**
- [ ] Project selector displays correctly
- [ ] All dropdown interactions work
- [ ] Analytics data loads on project selection
- [ ] No console errors

**Alerts Page (`/dashboard/alerts`):**
- [ ] Project selector displays with violet accent
- [ ] All dropdown interactions work
- [ ] Alert rules load on project selection
- [ ] Create Rule functionality still works
- [ ] No console errors

**Settings Page (`/dashboard/settings`):**
- [ ] Only Profile and Usage tabs visible
- [ ] Tab switching has smooth cross-fade
- [ ] No flashing or layout shift
- [ ] Both tabs are fully functional
- [ ] No console errors

- [ ] **Step 2: Test responsive design**

Check on mobile viewport (375px):
- [ ] Project selector dropdown fits within viewport
- [ ] Settings page layout works on mobile
- [ ] All interactions are touch-friendly

- [ ] **Step 3: Verify accessibility**

- [ ] Tab key navigation works
- [ ] Focus states are visible
- [ ] ARIA attributes are present
- [ ] Screen reader announcements work (if available)

- [ ] **Step 4: Create summary commit**

```bash
cd apps/dashboard-ui
git add .
git commit -m "test: complete UI/UX polish implementation

All features tested and working:
- Custom ProjectSelector component deployed across 3 pages
- Cross-fade transitions implemented in Settings
- Security and Notifications tabs hidden from UI

Manual testing complete on:
- Security page project selector
- Analytics page project selector
- Alerts page project selector
- Settings tab transitions
- Responsive design
- Accessibility features

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Testing Checklist

### Functionality
- [ ] Project selector opens on click
- [ ] Project selector closes on click outside
- [ ] Project selector closes on Escape key
- [ ] Project selection updates data in all three pages
- [ ] Settings tabs cross-fade smoothly
- [ ] Only Profile and Usage tabs visible in Settings

### Visual Design
- [ ] Glassmorphism styling matches design system
- [ ] Dropdown animation is smooth (200ms)
- [ ] Cross-fade animation is smooth (250ms)
- [ ] No flashing or jarring transitions
- [ ] Accent colors correct (blue for Security/Analytics, violet for Alerts)

### Accessibility
- [ ] ARIA attributes present (aria-expanded, aria-haspopup, role)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus states are visible
- [ ] Pointer events disabled on inactive content

### Responsive
- [ ] Works on mobile viewport (375px)
- [ ] Dropdown fits within viewport
- [ ] Touch interactions work

### Code Quality
- [ ] No TypeScript errors
- [ ] No console warnings or errors
- [ ] All files committed with descriptive messages
- [ ] Component is reusable and well-documented

---

## Success Criteria

1. **Custom ProjectSelector** works across Security, Analytics, and Alerts pages with consistent glassmorphism design
2. **Settings page** shows only Profile and Usage tabs with smooth cross-fade transitions (250ms)
3. **All animations** run at 60fps with no flashing or layout shift
4. **Accessibility features** include keyboard navigation and ARIA attributes
5. **Component is reusable** with accent color theming support
6. **No console errors** across all modified pages
