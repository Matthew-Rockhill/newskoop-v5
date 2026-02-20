import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV !== "development",
  tracesSampleRate: 1.0,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
});
