import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry if DSN is configured
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV === "development") {
      return null;
    }

    // Filter out sensitive data from headers and cookies
    if (event.request) {
      if (event.request.headers) {
        event.request.headers = Object.keys(event.request.headers)
          .filter(key => !key.toLowerCase().includes("authorization"))
          .reduce((acc, key) => ({ ...acc, [key]: event.request!.headers![key] }), {});
      }
    }

    return event;
  },

  // Ignore common non-critical errors
  ignoreErrors: [
    // Random plugins/extensions
    "top.GLOBALS",
    // Facebook flakiness
    "fb_xd_fragment",
    // Network errors that are usually transient
    "NetworkError",
    "Network request failed",
  ],

  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

    // Session replay
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
  });
}
