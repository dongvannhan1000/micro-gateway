# Sentry Error Monitoring - Dashboard UI

Complete Sentry integration for the Dashboard UI with privacy-first, user-controlled design.

## ⚠️ Privacy & Data Ownership

**Each deployment uses its own Sentry account** - no data sharing with project maintainers.

- ✅ User-controlled: Your deployment → Your Sentry account
- ✅ Optional: App works perfectly without Sentry
- ✅ Privacy-first: Sensitive data filtered automatically

## Quick Setup

### 1. Create Sentry Account
```
https://sentry.io/signup/ (free tier: 5,000 errors/month)
```

### 2. Create Project
- Select "Next.js" as platform
- Copy DSN from Settings → Projects → Your Project → Client Keys

### 3. Configure Environment
```bash
# Local: .dev.vars
# Production: Cloudflare Pages environment variables
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0
```

### 4. Test & Verify
See "Testing Sentry" section below.

## Overview

## Overview

Sentry provides **error tracking** and **performance monitoring** for the Dashboard UI in production. It automatically captures:

- Runtime errors and exceptions
- React component errors
- API call failures
- Performance metrics (page load, API response times)
- User session replays (when errors occur)

## Configuration

### Environment Variables

Add these to your `.dev.vars` (local) or Cloudflare Pages environment variables (production):

```bash
# Required: Sentry Data Source Name (get from Sentry.io)
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0

# Optional: For source map uploads
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

### Getting Started with Sentry

### For Your Own Deployment

1. **Create your own Sentry account**: https://sentry.io/signup/ (free tier available)
2. **Create a new project**: Select "Next.js" as the platform
3. **Copy your DSN**: Found in Settings → Projects → Your Project → Client Keys (DSN)
4. **Add DSN to environment**: Set `NEXT_PUBLIC_SENTRY_DSN` in your environment variables

### Example DSN Format

```bash
# Your DSN will look like this (from YOUR Sentry account):
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

**Do NOT share DSNs across different deployments** - each deployment should have its own monitoring.

## Files Modified

- `sentry.client.config.ts` - Browser error tracking
- `sentry.server.config.ts` - Server-side error tracking (API routes, SSR)
- `sentry.edge.config.ts` - Edge runtime error tracking (middleware, edge functions)
- `next.config.ts` - Sentry webpack configuration for source maps
- `src/app/error.tsx` - Custom error boundary that reports to Sentry

## Features Enabled

### ✅ Error Tracking
- Automatic error capture from React components
- Unhandled promise rejections
- API call failures
- Network errors

### ✅ Performance Monitoring
- Page load times
- API response times
- Database query performance (if using server-side DB)
- Long task detection (>50ms)

### ✅ Session Replay
- Records user interactions when errors occur
- Helps reproduce bugs in production
- All sensitive data is masked by default

### ✅ Security & Privacy
- **No development errors sent**: Events filtered in `NODE_ENV=development`
- **Sensitive data filtered**: Authorization headers removed
- **Text masking**: All text content masked in replays
- **Blocked media**: All images/videos blocked in replays
- **Auth URLs filtered**: Authentication API calls excluded from breadcrumbs

## Testing Sentry Integration

### 1. Development Mode (No events sent)

```bash
npm run dev
```

In development, Sentry is initialized but **no events are sent** to the server.

### 2. Production Test (Intentional Error)

Add this temporarily to any component to test:

```tsx
"use client";

import * as Sentry from "@sentry/nextjs";

export default function TestSentry() {
  const triggerError = () => {
    try {
      throw new Error("Test error from Sentry");
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  return (
    <button onClick={triggerError}>Trigger Test Error</button>
  );
}
```

Or use the built-in test endpoint:

```tsx
// Add to any page temporarily
<Sentry.Button onClick={() => {
  Sentry.captureException(new Error("Manual test error"));
}}>
  Send Test Error
</Sentry.Button>
```

### 3. Verify in Sentry Dashboard

1. Go to your Sentry project dashboard
2. Check **Issues** tab for new errors
3. Check **Performance** tab for metrics
4. Check **Replays** tab for session recordings

## Testing Sentry Integration

### Option 1: Test Error Page (Recommended)

Add this to any page temporarily to trigger the error boundary:

```tsx
// Add to src/app/page.tsx or any component
"use client";

export default function TestSentryButton() {
  const triggerError = () => {
    throw new Error("Sentry test error - This is intentional!");
  };

  return (
    <button
      onClick={triggerError}
      className="px-4 py-2 bg-red-600 text-white rounded"
    >
      Test Sentry Error
    </button>
  );
}
```

### Option 2: Test Sentry API Directly

```tsx
"use client";

import * as Sentry from "@sentry/nextjs";

export default function TestSentryCapture() {
  const captureMessage = () => {
    Sentry.captureMessage("Test message from Sentry", "info");
  };

  const captureException = () => {
    try {
      throw new Error("Test exception from Sentry");
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  return (
    <div className="space-x-2">
      <button onClick={captureMessage} className="px-4 py-2 bg-blue-600 text-white rounded">
        Send Test Message
      </button>
      <button onClick={captureException} className="px-4 py-2 bg-red-600 text-white rounded">
        Send Test Exception
      </button>
    </div>
  );
}
```

### Expected Results

✅ **Success**: Error appears in Sentry dashboard within 30 seconds
❌ **Failure**: No error appears → Check DSN configuration and environment variables

### Common Issues

**"No events received"**
- Ensure `NEXT_PUBLIC_SENTRY_DSN` is set correctly
- Check you're in production mode (`npm run build && npm start`)
- Verify network requests to `*.ingest.sentry.io` in browser DevTools

**"Source maps not working"**
- Ensure `SENTRY_AUTH_TOKEN` is set
- Check `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry project
- Rebuild after updating auth token: `npm run build`

## Source Maps

Source maps are automatically uploaded in production builds:

```bash
npm run build
```

This provides readable stack traces instead of minified code.

**Note**: Source maps are hidden from client bundles for security.

## Cost & Limits

### Sentry Free Tier
- **5,000 errors/month**
- **10,000 transactions/month** (performance)
- **50 replays/month**

### Recommended Sampling Rates (Current Config)

```typescript
tracesSampleRate: 0.1  // 10% of transactions
replaysSessionSampleRate: 0.1  // 10% of sessions
replaysOnErrorSampleRate: 1.0  // 100% of error sessions
```

**Why 10% sampling?**
- Reduces cost in production
- Still provides statistically significant data
- 100% of error sessions captured for debugging

## Troubleshooting

### Events not appearing in Sentry

1. **Check DSN is set**: `console.log(process.env.NEXT_PUBLIC_SENTRY_DSN)`
2. **Check environment**: Events filtered in development mode
3. **Check browser console**: Look for Sentry initialization errors
4. **Check network tab**: Verify requests to `ingest.sentry.io`

### Source maps not working

1. **Check auth token**: `SENTRY_AUTH_TOKEN` must be set
2. **Check org/project**: `SENTRY_ORG` and `SENTRY_PROJECT` must match Sentry
3. **Rebuild**: `npm run build` after updating auth token

### Too many events

1. **Reduce sampling rate**: Lower `tracesSampleRate` in config files
2. **Add ignoreErrors**: Add common non-critical errors to ignore list
3. **Filter transactions**: Use `beforeSendTransaction` to filter

## Best Practices

### ✅ DO
- Keep DSN in environment variables (never commit)
- Filter sensitive data in `beforeSend`
- Use appropriate sampling rates for production
- Review error reports regularly
- Set up alerts for critical errors

### ❌ DON'T
- Commit DSN to repository
- Log sensitive data (passwords, tokens, PII)
- Use 100% sampling in production (expensive!)
- Ignore all errors to reduce noise

## Further Reading

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Session Replay Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/)
- [Performance Monitoring](https://docs.sentry.io/platforms/javascript/guides/nextjs/performance/)
