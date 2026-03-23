export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Filter out sensitive data
      beforeSend(event, hint) {
        if (process.env.NODE_ENV === "development") {
          return null;
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
}
