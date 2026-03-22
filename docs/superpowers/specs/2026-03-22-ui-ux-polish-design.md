# UI/UX Polish Design Document

**Date:** 2026-03-22
**Author:** Claude (Sonnet 4.6)
**Status:** Approved

## Overview

This document describes UI/UX improvements for the Micro-Security Gateway dashboard, focusing on three main areas:
1. Custom project selector component for Security, Analytics, and Alerts pages
2. Smooth cross-fade transitions for Settings tab switching
3. Simplification of Settings page by hiding Security and Notifications sections

## Part 1: Custom Project Selector Component

### Problem Statement
The current implementation uses native HTML `<select>` elements across Security, Analytics, and Alerts pages. These native dropdowns have:
- Inconsistent styling across browsers
- Limited customization options
- Poor visual feedback (project names only appear clearly on hover)
- Don't match the glassmorphism design system

### Solution
Create a reusable `ProjectSelector` component with full glassmorphism styling.

### Component Structure

```
ProjectSelector
├── Trigger Button (shows selected project)
│   ├── Project icon + name
│   ├── ChevronDown icon
│   └── Glassmorphism styling
└── Dropdown Menu
    ├── Project list with hover states
    └── Selected state indicator
```

### Visual Design Specifications

**Trigger Button:**
- Background: `bg-glass-bg`
- Border: `border-glass-border`
- Border radius: `rounded-xl`
- Height: `h-9`
- Padding: `px-3 py-1.5`
- Text: `text-xs font-bold`
- Focus state: `focus:ring-accent-blue/50 outline-none`

**Dropdown Menu:**
- Position: Absolute, below trigger
- Background: `bg-glass-bg`
- Border: `border-glass-border`
- Shadow: `shadow-lg`
- Border radius: `rounded-xl`
- Z-index: `z-50`
- Min width: Match trigger width
- Max height: `max-h-64` with overflow scroll

**Menu Items:**
- Padding: `px-3 py-2`
- Text: `text-sm`
- Hover state: `hover:bg-glass-bg/50`
- Selected state: Accent color background with checkmark icon
- Transition: `transition-all duration-150`

**Icons:**
- Project: `Folder` from lucide-react
- Selected: `Check` from lucide-react
- Dropdown indicator: `ChevronDown` from lucide-react

### Animation Specifications

**Dropdown Opening:**
- Animation: `animate-in slide-in-from-top-2 duration-200`
- Easing: Default CSS ease

**Item Hover:**
- Transition: `transition-all duration-150`
- Property: Background color and transform

### Behavior Specifications

1. **Open/Close:**
   - Click trigger → toggle dropdown
   - Click outside → close dropdown
   - Press Escape → close dropdown

2. **Selection:**
   - Click item → select project
   - On selection: close dropdown, trigger `onSelect` callback
   - Update trigger button to show selected project

3. **Keyboard Navigation:**
   - Arrow Up/Down → navigate items
   - Enter → select highlighted item
   - Escape → close dropdown

### Technical Implementation

**File Location:**
`apps/dashboard-ui/src/components/dashboard/ProjectSelector.tsx`

**Component Interface:**
```tsx
interface ProjectSelectorProps {
  projects: Array<{ id: string; name: string }>;
  selectedId: string;
  onSelect: (projectId: string) => void;
  accentColor?: 'blue' | 'violet'; // For theming per page
}
```

**State Management:**
- `isOpen` - boolean for dropdown open/close state
- Use `useEffect` with click-outside detection

**Accessibility:**
- ARIA attributes: `aria-expanded`, `aria-haspopup`
- Keyboard navigation support
- Focus management

### Integration Points

Replace native `<select>` in:
1. `apps/dashboard-ui/src/app/dashboard/security/log-viewer.tsx`
2. `apps/dashboard-ui/src/app/dashboard/analytics/analytics-viewer.tsx`
3. `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx`

## Part 2: Settings Tab Cross-fade Transitions

### Problem Statement
Currently, Settings page uses conditional rendering without transitions:
```tsx
{activeTab === 'profile' && <ProfileSection />}
{activeTab === 'usage' && <UsageSection />}
```

This causes an abrupt "flashing" effect when switching between tabs.

### Solution
Implement cross-fade transitions using absolute positioning and opacity control.

### Implementation Details

**Container Structure:**
```tsx
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
```

**Animation Properties:**
- Duration: 250ms
- Easing: Default CSS ease
- Technique: Simultaneous cross-fade (both opacity changes happen together)
- Hidden state: `opacity-0 pointer-events-none`

**Z-index Strategy:**
- Active tab: `z-10` (ensures it's on top and interactive)
- Inactive tab: Lower z-index (default, underneath)

### Visual Behavior

1. User clicks new tab button
2. State update: `activeTab` changes
3. CSS classes update automatically
4. Old content: opacity 1 → 0 over 250ms, pointer events disabled
5. New content: opacity 0 → 1 over 250ms
6. Both animations happen simultaneously (cross-fade effect)

### Files to Modify

- `apps/dashboard-ui/src/app/dashboard/settings/page.tsx`

## Part 3: Hide Security & Notifications Sections

### Problem Statement
Settings page currently shows 4 tabs (Profile, Usage, Security, Notifications). Security and Notifications should be hidden from UI while keeping component files intact for potential future use.

### Solution
Remove tabs from navigation array and update type definition.

### Changes Required

**Update TabType:**
```tsx
// Before:
type TabType = 'profile' | 'usage' | 'security' | 'notifications';

// After:
type TabType = 'profile' | 'usage';
```

**Update tabs array:**
```tsx
// Before:
const tabs = [
    { id: 'profile' as TabType, name: 'Profile', icon: User },
    { id: 'usage' as TabType, name: 'Usage', icon: TrendingUp },
    { id: 'security' as TabType, name: 'Security', icon: Shield },
    { id: 'notifications' as TabType, name: 'Notifications', icon: Bell },
];

// After:
const tabs = [
    { id: 'profile' as TabType, name: 'Profile', icon: User },
    { id: 'usage' as TabType, name: 'Usage', icon: TrendingUp },
];
```

**Remove conditional rendering:**
```tsx
// Remove these lines from the main content area:
{activeTab === 'security' && <SecuritySection />}
{activeTab === 'notifications' && <NotificationsSection />}
```

**Optional - Remove imports:**
```tsx
// Can remove or comment out (keeping for future reference):
// import { Shield } from 'lucide-react';
// import { Bell } from 'lucide-react';
// import { SecuritySection } from '@/components/settings/SecuritySection';
// import { NotificationsSection } from '@/components/settings/NotificationsSection';
```

### Files Modified

- `apps/dashboard-ui/src/app/dashboard/settings/page.tsx`

### Files Preserved (unchanged)

- `apps/dashboard-ui/src/components/settings/SecuritySection.tsx`
- `apps/dashboard-ui/src/components/settings/NotificationsSection.tsx`

These files remain in the codebase for easy restoration if needed in the future.

## Summary of Changes

### Files to Create
1. `apps/dashboard-ui/src/components/dashboard/ProjectSelector.tsx`

### Files to Modify
1. `apps/dashboard-ui/src/app/dashboard/security/log-viewer.tsx`
2. `apps/dashboard-ui/src/app/dashboard/analytics/analytics-viewer.tsx`
3. `apps/dashboard-ui/src/app/dashboard/alerts/alert-viewer.tsx`
4. `apps/dashboard-ui/src/app/dashboard/settings/page.tsx`

### Design Principles Applied

1. **Consistency:** Custom dropdown matches existing glassmorphism design system
2. **Performance:** CSS transitions for smooth 60fps animations
3. **Accessibility:** Keyboard navigation and ARIA attributes
4. **Reusability:** Single ProjectSelector component used across three pages
5. **Maintainability:** Component files preserved for future use
6. **User Experience:** Smooth transitions reduce cognitive load

## Testing Checklist

- [ ] Project selector opens/closes on click
- [ ] Project selector closes on click outside
- [ ] Project selector closes on Escape key
- [ ] Project selector keyboard navigation works (Arrow keys, Enter)
- [ ] Project selector updates trigger button on selection
- [ ] Data refreshes after project selection
- [ ] Settings tabs cross-fade smoothly (no flashing)
- [ ] Settings transitions don't cause layout shifts
- [ ] Only Profile and Usage tabs visible in Settings
- [ ] No console errors during transitions
- [ ] Responsive design works on mobile

## Success Criteria

1. Project selector is visually consistent with glassmorphism design
2. Project names are clearly visible without hover
3. Settings tab switching is smooth with cross-fade effect
4. Settings page shows only Profile and Usage tabs
5. All animations run at 60fps on modern hardware
6. Component is reusable across Security, Analytics, and Alerts pages
