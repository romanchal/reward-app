import crypto from 'node:crypto';

export function requestId() {
  return crypto.randomUUID();
}

export function createIdempotencyKey(prefix = 'idem') {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
