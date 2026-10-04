import * as Sentry from '@sentry/react';

let enabled = false;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_COMMIT,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
  enabled = true;
}

export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (!enabled) return;
  if (context) Sentry.setContext('ui', context);
  Sentry.captureException(err);
}
