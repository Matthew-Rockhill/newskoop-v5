import * as Sentry from "@sentry/nextjs";

const isDevMode = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !isDevMode,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: isDevMode ? [] : [Sentry.replayIntegration()],
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
