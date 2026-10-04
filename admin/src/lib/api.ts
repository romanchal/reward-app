const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000`;

export type AdminSession = { token: string; userId: string; role: string; email?: string };
export type AdminTask = { id: string; title: string; description: string; reward: number; link?: string | null; imageUrl?: string | null; status: 'LIVE' | 'DEMO'; isDemo: boolean };
export type AdminUser = { id: string; email: string; name: string; role: string; balance: number; isVerified: boolean; banned: boolean; createdAt: string };
export type PaymentRequest = { id: string; userId: string; amount: number; currency: string; method: string; recipient: string; status: string; note?: string | null; createdAt: string; user?: Pick<AdminUser, 'id' | 'name' | 'email'> };
export type AdminSetting = { key: string; value: string; updatedAt: string };

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

export async function loginAdmin(email: string, password: string): Promise<AdminSession> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({})) as {
    error?: string;
    data?: { token?: string; userId?: string; role?: string };
  };

  if (!response.ok || !body.data?.token || !body.data.userId) {
    throw new Error(body.error || 'Unable to sign in');
  }
  if (body.data.role !== 'ADMIN') throw new Error('This account does not have administrator access');

  const session = {
    token: body.data.token,
    userId: body.data.userId,
    role: body.data.role,
    email,
  };
  saveSession(session);
  return session;
}

export function saveSession(session: AdminSession) { localStorage.setItem('reward-session', JSON.stringify(session)); }
export function clearSession() { localStorage.removeItem('reward-session'); }
export function getSession(): AdminSession | null {
  const raw = localStorage.getItem('reward-session');
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Partial<AdminSession>;
    if (session.role !== 'ADMIN' || !session.token || !session.userId) {
      clearSession();
      return null;
    }
    return session as AdminSession;
  } catch {
    clearSession();
    return null;
  }
}
