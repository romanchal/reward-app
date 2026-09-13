const BASE = '/api';

let accessToken: string | null = null;
let refreshInflight: Promise<boolean> | null = null;
let onSessionLost: (() => void) | null = null;

export function setToken(token: string | null) {
  accessToken = token;
}

export function getToken() {
  return accessToken;
}

export function bindSessionLostHandler(handler: () => void) {
  onSessionLost = handler;
}

async function attemptRefresh(): Promise<boolean> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
      });
      if (!res.ok) return false;
      const body = await res.json();
      if (body?.accessToken) { accessToken = body.accessToken; return true; }
      return false;
    } catch {
      return false;
    } finally {
      refreshInflight = null;
    }
  })();
  return refreshInflight;
}

async function requestOnce(path: string, opts: RequestInit): Promise<Response> {
  const headers = new Headers(opts.headers);
  if (!headers.has('Content-Type') && opts.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  let res = await requestOnce(path, opts);

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login' && path !== '/auth/register') {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      res = await requestOnce(path, opts);
    } else {
      accessToken = null;
      onSessionLost?.();
    }
  }

  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: text || `HTTP ${res.status}` }; }

  if (!res.ok) {
    const error = new Error(body?.error || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).body = body;
    throw error;
  }
  return body as T;
}

export async function tryRestoreSession(): Promise<boolean> {
  return attemptRefresh();
}
