const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type ApiTask = {
  id: string;
  title: string;
  description: string;
  link?: string | null;
  imageUrl?: string | null;
  reward: number;
  status: 'LIVE' | 'DEMO';
  isDemo: boolean;
};

export type Session = {
  token: string;
  userId: string;
  role: string;
  name?: string;
  email?: string;
};

export type Wallet = {
  userId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
};

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string } & T;
  if (!response.ok) throw new Error(body.error || body.message || `Request failed (${response.status})`);
  return body;
}

export function getSession(): Session | null {
  const raw = localStorage.getItem('reward-session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    localStorage.removeItem('reward-session');
    return null;
  }
}

export function saveSession(session: Session) {
  localStorage.setItem('reward-session', JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem('reward-session');
}

export function formatCurrency(value: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}
