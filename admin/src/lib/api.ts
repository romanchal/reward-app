const BASE = '/api';

let accessToken: string | null = localStorage.getItem('admin_access_token');
export function setToken(t: string | null) {
  accessToken = t;
  if (t) localStorage.setItem('admin_access_token', t); else localStorage.removeItem('admin_access_token');
}
export function getToken() { return accessToken; }

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body as T;
}

export async function login(email: string, password: string) {
  const res = await api<{ accessToken: string; user: { role: string } }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (res.user.role !== 'ADMIN') { setToken(null); throw new Error('Admin access required'); }
  setToken(res.accessToken);
  return res;
}
