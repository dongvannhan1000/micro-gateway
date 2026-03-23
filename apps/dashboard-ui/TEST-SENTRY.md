# Quick Sentry Test

## Option 1: Test Error Page (Recommended)

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

## Option 2: Test Sentry API Directly

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

## How to Verify

1. **Build for production** (Sentry filters dev events):
   ```bash
   npm run build
   npm start
   ```

2. **Trigger the test error** using one of the buttons above

3. **Check Sentry dashboard**:
   - Go to https://sentry.io/
   - Navigate to your project
   - Check **Issues** tab (should see your test error within 30 seconds)
   - Check **Replays** tab (should have a session recording)

4. **Clean up**: Remove test code after verification

## Expected Results

✅ **Success**: Error appears in Sentry dashboard within 30 seconds
❌ **Failure**: No error appears → Check DSN configuration and environment variables

## Common Issues

### "No events received"
- Ensure `NEXT_PUBLIC_SENTRY_DSN` is set correctly
- Check you're in production mode (`npm run build && npm start`)
- Verify network requests to `*.ingest.sentry.io` in browser DevTools

### "Source maps not working"
- Ensure `SENTRY_AUTH_TOKEN` is set
- Check `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry project
- Rebuild after updating auth token: `npm run build`
