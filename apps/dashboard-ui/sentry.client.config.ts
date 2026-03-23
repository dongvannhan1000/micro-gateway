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

    // Filter out sensitive data from breadcrumbs and headers
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
        if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
          return !breadcrumb.data?.url?.includes("api/auth");
        }
        return true;
      });
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
    // Chrome extension errors
    "Non-Error promise rejection captured",
  ],

  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Distributed tracing - specify which origins to include
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/micro-gateway\.your-domain\.com/,
    process.env.NEXT_PUBLIC_GATEWAY_URL,
  ].filter(Boolean) as string[],

  // Session replay for debugging
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  });
}
