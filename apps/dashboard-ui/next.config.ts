import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Upload source maps for better error stack traces
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps in production
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",

  // Source maps configuration
  sourcemaps: {
    // Delete source map files after uploading to Sentry
    deleteSourcemapsAfterUpload: true,
  },

  // Webpack configuration (not supported with Turbopack)
  webpack: {
    // Remove debug logging to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Automatic Vercel monitoring
    automaticVercelMonitors: true,
  },
});
