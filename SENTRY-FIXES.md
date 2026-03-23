# Sentry Setup Fixes - TypeScript & Deprecation Warnings

## Issues Fixed

### ✅ 1. Fixed Deprecation Warnings in `next.config.ts`

**Before (Deprecated):**
```typescript
hideSourceMaps: true,           // ❌ Deprecated
disableLogger: true,             // ❌ Deprecated
automaticVercelMonitors: true,   // ❌ Deprecated (top-level)
```

**After (Current):**
```typescript
sourcemaps: {
  deleteSourcemapsAfterUpload: true,  // ✅ Correct property name
},

webpack: {
  treeshake: {
    removeDebugLogging: true,    // ✅ New API
  },
  automaticVercelMonitors: true,  // ✅ Moved to webpack config
},
```

### ✅ 2. Fixed TypeScript Error in `sentry.client.config.ts`

**Before (Error):**
```typescript
// ❌ TypeScript Error: 'browserTracingOptions' does not exist
browserTracingOptions: {
  trackNavigations: true,
  trackLongTasks: true,
},
```

**After (Fixed):**
```typescript
// ✅ Removed - browserTracingIntegration() handles this automatically
// No need for manual browserTracingOptions
```

**Why?**
- `browserTracingIntegration()` automatically enables navigation tracking and long task detection
- `browserTracingOptions` was removed from Sentry SDK type definitions
- The integration provides sensible defaults out of the box

### ℹ️ 3. Middleware Warning (Expected Behavior)

**Warning Message:**
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**Status:** ⚠️ **Expected - No Action Needed**

**Explanation:**
- This is a Next.js 16 warning about future deprecation
- Middleware is still fully supported in Next.js 16
- The new `proxy` convention is experimental and not recommended for production yet
- Supabase auth middleware relies on the stable middleware API

**Recommendation:** Keep using middleware until proxy API is stable

## Verification

### Run TypeScript Check
```bash
cd apps/dashboard-ui
npx tsc --noEmit
```

### Run Dev Server
```bash
npm run dev
```

**Expected Output:**
```
✓ Starting...
✓ Ready in 2.3s

○ Compiling / ...
✓ Compiled / in 5s

✓ No TypeScript errors
✓ No deprecation warnings
```

## Changes Summary

| File | Issue | Fix |
|------|-------|-----|
| `next.config.ts` | `hideSourceMaps` deprecated | Use `sourcemaps.deleteFilesAfterUpload` |
| `next.config.ts` | `disableLogger` deprecated | Use `webpack.treeshake.removeDebugLogging` |
| `next.config.ts` | `automaticVercelMonitors` deprecated | Move to `webpack.automaticVercelMonitors` |
| `sentry.client.config.ts` | `browserTracingOptions` TypeScript error | Remove (handled by integration) |
| `src/middleware.ts` | Middleware deprecation warning | Expected - keep as is |

## Testing

### 1. Verify TypeScript Compilation
```bash
cd apps/dashboard-ui
npx tsc --noEmit
# Should complete without errors
```

### 2. Verify Dev Server
```bash
npm run dev
# Should start without Sentry deprecation warnings
```

### 3. Verify Production Build
```bash
npm run build
# Should build successfully
```

## Sentry Configuration Status

### ✅ Working Features
- Conditional initialization (only if DSN set)
- Error tracking (client, server, edge)
- Performance monitoring (10% sampling)
- Session replay (100% error sessions)
- Source map uploads
- Sensitive data filtering

### ✅ Compatible With
- Next.js 16.1.6
- React 19.2.3
- Turbopack (webpack config ignored when using Turbopack)
- TypeScript 5

### ⚠️ Turbopack Limitations

When using Turbopack (`npm run dev --turbopack`):
- `webpack` config in `next.config.ts` is ignored
- `sourcemaps.deleteFilesAfterUpload` still works
- Sentry functionality is not affected

**Note:** Turbopack is still experimental for Sentry webpack plugin integration.

## Documentation Updates

All affected documentation has been updated:
- ✅ `SENTRY-SETUP.md` - Reflects new config options
- ✅ `SENTRY-SETUP-SUMMARY.md` - Updated with fixes
- ✅ `apps/dashboard-ui/SENTRY.md` - Technical details updated

## Next Steps

### If You Want to Use Sentry:
1. Create Sentry account: https://sentry.io/signup/
2. Create project → Select "Next.js"
3. Copy DSN and add to environment:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0
   ```
4. Rebuild: `npm run build`

### If You Don't Want Sentry:
- No action needed! App works perfectly without DSN
- All Sentry code is conditional and won't initialize

## Questions?

**Q: Should I migrate from middleware to proxy?**
A: Not yet. Proxy is experimental in Next.js 16. Wait until it's stable.

**Q: Do I need to set SENTRY_ORG and SENTRY_PROJECT?**
A: Only if you want source map uploads. For basic error tracking, DSN is enough.

**Q: Why is webpack config ignored with Turbopack?**
A: Turbopack has its own bundler and doesn't use webpack. Sentry still works fine.

**Q: Can I disable the middleware warning?**
A: No, it's a Next.js 16 warning. Keep middleware for now - it's still supported.
