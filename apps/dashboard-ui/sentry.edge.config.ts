import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry if DSN is configured
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Filter out sensitive data in edge runtime
  beforeSend(event, hint) {
    if (process.env.NODE_ENV === "development") {
      return null;
    }

    // Filter sensitive headers
    if (event.request?.headers) {
      event.request.headers = Object.keys(event.request.headers)
        .filter(key => !key.toLowerCase().includes("authorization"))
        .reduce((acc, key) => ({ ...acc, [key]: event.request!.headers![key] }), {});
    }

    return event;
  },

    ignoreErrors: [
      "top.GLOBALS",
      "fb_xd_fragment",
      "NetworkError",
      "Network request failed",
    ],
  });
}
