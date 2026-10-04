import * as Sentry from '@sentry/node';

let enabled = false;

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_COMMIT,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
  enabled = true;
}

export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (!enabled) return;
  if (context) Sentry.setContext('request', context);
  Sentry.captureException(err);
}

export function flushSentry(timeoutMs = 2000) {
  if (!enabled) return Promise.resolve();
  return Sentry.flush(timeoutMs).catch(() => undefined);
}
