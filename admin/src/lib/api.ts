const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type AdminSession = { token: string; userId: string; role: string; email?: string };
export type AdminTask = { id: string; title: string; description: string; reward: number; link?: string | null; imageUrl?: string | null; status: 'LIVE' | 'DEMO'; isDemo: boolean };
export type AdminUser = { id: string; email: string; name: string; role: string; balance: number; isVerified: boolean; banned: boolean; createdAt: string };

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const raw = localStorage.getItem('reward-session');
  const session = raw ? JSON.parse(raw) as AdminSession : null;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export function saveSession(session: AdminSession) { localStorage.setItem('reward-session', JSON.stringify(session)); }
export function clearSession() { localStorage.removeItem('reward-session'); }
export function getSession(): AdminSession | null {
  const raw = localStorage.getItem('reward-session');
  if (!raw) return null;
  try { return JSON.parse(raw) as AdminSession; } catch { clearSession(); return null; }
}
