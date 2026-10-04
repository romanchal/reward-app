import { Component, type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { apiRequest, clearSession, formatCurrency, getSession, saveSession, type ApiTask, type Session, type Wallet } from './lib/api';
import RewardsPage from './components/RewardsPage';

type GoogleCredentialResponse = { credential?: string };
type TelegramLoginData = { id: number; first_name: string; last_name?: string; username?: string; auth_date: number; hash: string };
type LoginResponse = {
  data?: { token?: string; userId?: string; role?: string; user?: { id: string; role: string; name: string; email?: string } };
  accessToken?: string;
  user?: { id: string; role: string; name: string; email?: string };
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (element: HTMLElement, options: { theme: 'outline'; size: 'large'; text: 'continue_with'; width: number }) => void;
          cancel?: () => void;
        };
      };
    };
    onTelegramAuth?: (data: TelegramLoginData) => void;
  }
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Reward App render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', fontFamily: 'sans-serif' }}>
          <h1>Reward App</h1>
          <p>The page ran into a rendering issue. Please refresh.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

async function copyTextToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('Clipboard access is unavailable');
  }
}

type ManagedBanner = { id: string; title: string; imageUrl: string; targetUrl: string; placement: 'HOME' | 'REWARDS'; enabled: boolean };

function HomePage() {
  const session = getSession();
  const [referralCode, setReferralCode] = useState('');
  const [referralMessage, setReferralMessage] = useState('');
  const [referralLoading, setReferralLoading] = useState(Boolean(session));
  const [homeBanners, setHomeBanners] = useState<ManagedBanner[]>([]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    apiRequest<{ data: { code: string } }>('/api/referrals')
      .then((result) => { if (active) setReferralCode(result.data.code); })
      .catch(() => { if (active) setReferralMessage('Referral code is currently unavailable.'); })
      .finally(() => { if (active) setReferralLoading(false); });
    return () => { active = false; };
  }, [session?.userId]);

  useEffect(() => {
    let active = true;
    apiRequest<{ data: { banners: ManagedBanner[] } }>('/api/rewards/config')
      .then((result) => { if (active) setHomeBanners(result.data.banners.filter((banner) => banner.placement === 'HOME' && banner.enabled)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function copyReferralCode() {
    if (!referralCode) return;
    try {
      await copyTextToClipboard(referralCode);
      setReferralMessage('Referral code copied.');
    } catch {
      setReferralMessage('Unable to copy the referral code.');
    }
  }

  return (
    <div className="page-shell home-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="kicker">Earn more. Stay rewarded.</span>
          <h1>Make everyday actions count.</h1>
          <p>
            Find missions, track your wallet, share your referral code, and explore rewards in one place.
          </p>
          <div className="cta-row">
            <Link to={session ? '/dashboard' : '/login'} className="primary-btn">{session ? 'Open dashboard' : 'Create account'}</Link>
            <Link to="/tasks" className="secondary-btn">Browse missions</Link>
          </div>
        </div>
        <div className="hero-card">
          <div className="card-topline">{session ? 'Your account IDs' : 'Your member hub'}</div>
          {session ? (
            <div className="home-id-list">
              <div className="home-id-row"><span>Member ID</span><code>{session.userId}</code></div>
              <div className="home-id-row">
                <span>Referral ID</span>
                {referralLoading ? <small>Loading...</small> : referralCode ? <code>{referralCode}</code> : <small>{referralMessage || 'Not available'}</small>}
              </div>
              {referralCode && <button type="button" className="secondary-btn small home-copy-referral" onClick={() => void copyReferralCode()}>Copy referral ID</button>}
              {referralMessage && referralCode && <span className="home-referral-feedback" aria-live="polite">{referralMessage}</span>}
            </div>
          ) : <div className="home-account-prompt"><p>Sign in to view your member ID and referral code.</p><Link to="/login" className="text-link">Sign in to your account</Link></div>}
        </div>
      </section>

      {homeBanners.length > 0 && <section className="managed-banner-grid" aria-label="Featured offers">{homeBanners.map((banner) => <a className="managed-banner" href={banner.targetUrl} key={banner.id} target="_blank" rel="noreferrer"><img src={banner.imageUrl} alt={banner.title} loading="lazy" /><span>{banner.title}</span></a>)}</section>}

      <section className="home-feature-section">
        <div className="home-section-heading"><div><span className="kicker">Your workspace</span><h2>Everything in one place</h2></div><p className="muted-copy">Jump straight to the part of your rewards account you need.</p></div>
        <div className="feature-grid home-feature-grid">
          <Link to="/dashboard" className="feature-card home-feature-card"><span className="home-feature-icon">01</span><h3>Dashboard</h3><p>See your balance, activity, and current missions.</p><span className="home-feature-link">Open dashboard <span aria-hidden="true">→</span></span></Link>
          <Link to="/tasks" className="feature-card home-feature-card"><span className="home-feature-icon">02</span><h3>Tasks</h3><p>Browse available missions and their reward details.</p><span className="home-feature-link">Browse tasks <span aria-hidden="true">→</span></span></Link>
          <Link to="/rewards" className="feature-card home-feature-card"><span className="home-feature-icon">03</span><h3>Rewards lounge</h3><p>Play scratch cards and the wheel for wallet rewards.</p><span className="home-feature-link">Open rewards <span aria-hidden="true">→</span></span></Link>
          <Link to="/wallet" className="feature-card home-feature-card"><span className="home-feature-icon">04</span><h3>Wallet</h3><p>Review your available balance and transaction history.</p><span className="home-feature-link">View wallet <span aria-hidden="true">→</span></span></Link>
          <Link to="/promos" className="feature-card home-feature-card"><span className="home-feature-icon">05</span><h3>Promo codes</h3><p>Check current partner codes and their terms.</p><span className="home-feature-link">View promos <span aria-hidden="true">→</span></span></Link>
          <Link to="/profile" className="feature-card home-feature-card"><span className="home-feature-icon">06</span><h3>Profile & referrals</h3><p>Manage your profile and find your shareable referral ID.</p><span className="home-feature-link">Manage profile <span aria-hidden="true">→</span></span></Link>
        </div>
      </section>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="page-shell not-found-page">
      <section className="not-found-panel">
        <span className="kicker">404 · Page not found</span>
        <h1>This page isn't available.</h1>
        <p className="muted-copy">The address may be incorrect, or the page may have moved.</p>
        <div className="cta-row"><Link to="/" className="primary-btn">Return home</Link><Link to="/dashboard" className="secondary-btn">Open dashboard</Link></div>
      </section>
    </div>
  );
}

type YonoPromo = {
  id: string;
  code: string;
  title: string;
  description: string;
  terms: string | null;
  expiresAt: string | null;
  sourceUrl: string | null;
};

function YonoPromosPage() {
  const [promos, setPromos] = useState<YonoPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest<{ data: YonoPromo[] }>('/api/promos/yono-rummy')
      .then((result) => { if (active) setPromos(result.data ?? []); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load promo codes'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function copyCode(promo: YonoPromo) {
    setCopyError('');
    try {
      await copyTextToClipboard(promo.code);
      setCopiedId(promo.id);
      window.setTimeout(() => setCopiedId((current) => current === promo.id ? '' : current), 1800);
    } catch {
      setCopyError('Copy was blocked by the browser. Select the code and copy it manually.');
    }
  }

  return (
    <div className="page-shell promos-page">
      <header className="promo-heading">
        <div>
          <span className="kicker">Partner codes · 18+</span>
          <h2>Yono Rummy promo codes</h2>
          <p className="muted-copy">Current codes sent by our Telegram bot, with expiry and source details when available.</p>
        </div>
        <span className="promo-feed-status"><i /> Bot feed</span>
      </header>

      {copyError && <div className="form-error" role="alert">{copyError}</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      {loading ? <div className="promo-empty">Checking for active codes...</div> : promos.length === 0 ? (
        <div className="promo-empty"><strong>No active codes right now</strong><span>New codes appear here after the bot submits them.</span></div>
      ) : (
        <section className="yono-promo-grid" aria-label="Active Yono Rummy promo codes">
          {promos.map((promo) => (
            <article className="yono-promo-card" key={promo.id}>
              <div className="yono-promo-topline"><span>Yono Rummy</span><span className="promo-live-tag">Active</span></div>
              <h3>{promo.title}</h3>
              {promo.description && <p>{promo.description}</p>}
              <div className="promo-code-row"><code>{promo.code}</code><button type="button" className="copy-promo-btn" onClick={() => void copyCode(promo)} aria-label={`Copy promo code ${promo.code}`}>{copiedId === promo.id ? 'Copied' : 'Copy code'}</button></div>
              <div className="promo-card-footer">
                {promo.expiresAt ? <span>Expires {new Date(promo.expiresAt).toLocaleDateString()}</span> : <span>Check the offer terms in Yono Rummy</span>}
                {promo.sourceUrl && <a href={promo.sourceUrl} target="_blank" rel="noreferrer">Source post</a>}
              </div>
              {promo.terms && <details className="promo-terms"><summary>Terms</summary><p>{promo.terms}</p></details>}
            </article>
          ))}
        </section>
      )}
      <p className="promo-disclaimer">18+ only. Availability, eligibility, and terms are controlled by Yono Rummy. Check local laws and play responsibly.</p>
    </div>
  );
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const telegramButtonRef = useRef<HTMLDivElement>(null);
  const providerLoginRef = useRef<(path: string, payload: unknown) => void>(() => {});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const telegramBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, '');

  function completeLogin(response: LoginResponse, fallbackEmail = email, fallbackName?: string) {
    const user = response.user ?? response.data?.user;
    const token = response.accessToken || response.data?.token;
    const userId = user?.id || response.data?.userId || '';
    if (!token || !userId) throw new Error('The server returned an incomplete session.');
    saveSession({
      token,
      userId,
      role: user?.role || response.data?.role || 'USER',
      name: user?.name || fallbackName,
      email: user?.email ?? fallbackEmail,
    });
    navigate('/dashboard');
  }

  async function signInWithProvider(path: string, payload: unknown) {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const response = await apiRequest<LoginResponse>(path, { method: 'POST', body: JSON.stringify(payload) });
      completeLogin(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to continue');
    } finally {
      setBusy(false);
    }
  }

  providerLoginRef.current = (path, payload) => { void signInWithProvider(path, payload); };

  useEffect(() => {
    if (mode !== 'login' || !googleClientId || !googleButtonRef.current) return;
    let cancelled = false;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const button = googleButtonRef.current;
      if (cancelled || !button || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => {
          if (credential) providerLoginRef.current('/api/auth/google', { credential });
          else setError('Google did not return a sign-in credential.');
        },
      });
      window.google.accounts.id.renderButton(button, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: Math.min(button.clientWidth || 360, 400),
      });
    };
    script.onerror = () => setError('Unable to load Google sign-in.');
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      script.remove();
      window.google?.accounts.id.cancel?.();
      googleButtonRef.current?.replaceChildren();
    };
  }, [mode, googleClientId]);

  useEffect(() => {
    if (mode !== 'login' || !telegramBotUsername || !telegramButtonRef.current) return;
    const container = telegramButtonRef.current;
    window.onTelegramAuth = (data) => providerLoginRef.current('/api/auth/telegram', data);
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', telegramBotUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    container.appendChild(script);
    script.onerror = () => setError('Unable to load Telegram sign-in.');
    return () => {
      delete window.onTelegramAuth;
      script.remove();
      container.replaceChildren();
    };
  }, [mode, telegramBotUsername]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await apiRequest<LoginResponse>(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(mode === 'register' ? { name, email, password } : { email, password }),
      });
      completeLogin(response, email, mode === 'register' ? name : undefined);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to continue');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-box">
        <span className="kicker">Reward App</span>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your earning account'}</h1>
        <p className="muted-copy">{mode === 'login' ? 'Pick up where you left off.' : 'Join a calmer, clearer way to earn from everyday actions.'}</p>
        <div className="auth-tabs"><Link className={mode === 'login' ? 'tab active' : 'tab'} to="/login">Sign in</Link><Link className={mode === 'register' ? 'tab active' : 'tab'} to="/register">Register</Link></div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && <label>Full name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" /></label>}
          <label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn full-width" disabled={busy}>{busy ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        {mode === 'login' && (googleClientId || telegramBotUsername) && <div className="social-auth">
          <div className="social-auth-divider"><span>Or continue with</span></div>
          <div className="social-auth-buttons" aria-busy={busy}>
            {googleClientId && <div className="google-signin-button" ref={googleButtonRef} />}
            {telegramBotUsername && <div className="telegram-signin-button" ref={telegramButtonRef} />}
          </div>
        </div>}
        {mode === 'login' && !googleClientId && !telegramBotUsername && import.meta.env.DEV && <p className="social-auth-setup">Configure Google or Telegram credentials to enable social sign-in.</p>}
      </div>
    </div>
  );
}

function DashboardPage() {
  const session = getSession();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([apiRequest<Wallet>('/api/wallet/balance'), apiRequest<{ tasks: ApiTask[] }>('/api/tasks?limit=4')])
      .then(([nextWallet, nextTasks]) => { setWallet(nextWallet); setTasks(nextTasks.tasks); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load your dashboard'));
  }, []);

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="kicker">Overview</span>
          <h2>Good to see you{session?.name ? `, ${session.name.split(' ')[0]}` : ''}.</h2>
          <p className="muted-copy">A small action today keeps your reward momentum moving.</p>
        </div>
        <Link to="/tasks" className="primary-btn small">View all missions</Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><small>Available balance</small><strong>{wallet ? formatCurrency(wallet.balance, wallet.currency) : '...'}</strong><span className="stat-note">Ready to withdraw</span></div>
        <div className="stat-card"><small>Current streak</small><strong>7 days</strong><span className="stat-note">Keep it going</span></div>
        <div className="stat-card"><small>Open missions</small><strong>{tasks.length}</strong><span className="stat-note">Fresh opportunities</span></div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="content-grid">
        <section className="panel chart-panel"><div className="panel-header"><div><span className="kicker">This week</span><h3>Reward rhythm</h3></div><span className="badge soft">+18% this week</span></div><div className="chart-bars"><span style={{ height: '38%' }} /><span style={{ height: '58%' }} /><span style={{ height: '46%' }} /><span style={{ height: '74%' }} /><span style={{ height: '62%' }} /><span style={{ height: '88%' }} /><span style={{ height: '96%' }} /></div><div className="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></section>
        <section className="panel"><div className="panel-header"><div><span className="kicker">Next up</span><h3>Easy wins</h3></div><Link to="/tasks" className="text-link">See all</Link></div><div className="stack-list">{tasks.slice(0, 3).map((task) => <div key={task.id}><span>{task.title}</span><strong>+{formatCurrency(task.reward)}</strong></div>)}{tasks.length === 0 && <p className="muted-copy">No live missions yet.</p>}</div></section>
      </div>
    </div>
  );
}

function RequireSession({ children }: { children: ReactNode }) {
  return getSession() ? <>{children}</> : <Navigate to="/login" replace />;
}

function TasksPage() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { apiRequest<{ tasks: ApiTask[] }>('/api/tasks?limit=50').then((result) => setTasks(result.tasks)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load missions')); }, []);
  async function completeTask(task: ApiTask) {
    setBusyId(task.id); setNotice(''); setError('');
    try { await apiRequest(`/api/tasks/${task.id}/complete`, { method: 'POST' }); setTasks((current) => current.filter((item) => item.id !== task.id)); setNotice(`${task.title} completed. ${formatCurrency(task.reward)} added to your wallet.`); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to complete task'); }
    finally { setBusyId(''); }
  }

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="kicker">Tasks</span>
          <h2>Earn by completing quick actions</h2>
        </div>
      </div>
      {notice && <div className="notice">{notice}</div>}{error && <div className="form-error">{error}</div>}
      <div className="task-grid">
        {tasks.map((task) => (
          <article className="task-card" key={task.id}>
            {task.imageUrl && <img className="task-image" src={task.imageUrl} alt="" loading="lazy" />}
            <div className="task-meta"><span className="tag">Live mission</span><span className="difficulty">+{formatCurrency(task.reward)}</span></div>
            <h3>{task.title}</h3><p>{task.description}</p>
            <div className="task-reward-row">
              <span>One-time reward</span><div className="task-actions">{task.link && <a className="task-link" href={task.link} target="_blank" rel="noreferrer">Open link</a>}<button className="primary-btn small" disabled={busyId === task.id} onClick={() => completeTask(task)}>{busyId === task.id ? 'Claiming...' : 'Complete'}</button></div>
            </div>
          </article>
        ))}
        {tasks.length === 0 && !error && <div className="empty-state panel">You are all caught up. Check back soon for new missions.</div>}
      </div>
    </div>
  );
}

function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Array<{ id: string; amount: number; type: string; createdAt: string }>>([]);
  const [amount, setAmount] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([apiRequest<Wallet>('/api/wallet/balance'), apiRequest<{ data?: Array<{ id: string; amount: number; type: string; createdAt: string }>; items?: Array<{ id: string; amount: number; type: string; createdAt: string }> }>('/api/wallet/transactions')]).then(([nextWallet, result]) => { setWallet(nextWallet); setTransactions(result.data || result.items || []); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load wallet')); }, []);
  async function requestWithdrawal(event: FormEvent) { event.preventDefault(); setError(''); setNotice(''); try { const result = await apiRequest<{ message: string }>('/api/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount: Number(amount), bankAccount: 'demo', bankName: 'Demo Bank', bankNumber: 'demo' }) }); setNotice(result.message); setAmount(''); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to request payout'); } }
  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="kicker">Wallet</span>
          <h2>Manage payouts and rewards</h2>
        </div>
      </div>
      <div className="wallet-hero panel">
        <div>
          <small>Available balance</small>
          <h3>{wallet ? formatCurrency(wallet.balance, wallet.currency) : '...'}</h3>
          <p>Funds update as soon as you complete a mission.</p>
        </div>
        <span className="wallet-symbol">₹</span>
      </div>
      <div className="content-grid"><section className="panel"><div className="panel-header"><div><span className="kicker">Cash out</span><h3>Request a payout</h3></div><span className="badge neutral">Demo mode</span></div><form className="inline-form" onSubmit={requestWithdrawal}><label>Amount<input required min="1" max="10000" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="500" /></label><button className="primary-btn" type="submit">Request payout</button></form>{notice && <div className="notice">{notice}</div>}{error && <div className="form-error">{error}</div>}</section><section className="panel"><div className="panel-header"><div><span className="kicker">History</span><h3>Recent wallet activity</h3></div></div><ul className="transaction-list">{transactions.slice(0, 5).map((transaction) => <li key={transaction.id}><span>{transaction.type.split('_').join(' ')}</span><strong className="amount positive">+{formatCurrency(transaction.amount)}</strong></li>)}{transactions.length === 0 && <li className="muted-copy">No transactions yet.</li>}</ul></section></div>
    </div>
  );
}

function ProfilePage() {
  const [session, setSession] = useState<Session | null>(getSession());
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { apiRequest<{ data: { code: string } }>('/api/referrals').then((result) => setReferralCode(result.data.code)).catch(() => undefined); }, []);
  function signOut() { clearSession(); setSession(null); navigate('/login'); }
  async function copyReferral() { if (!referralCode) return; await navigator.clipboard.writeText(referralCode); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="kicker">Profile</span>
          <h2>Manage your account</h2>
        </div>
      </div>
      <div className="panel profile-panel">
        <div className="avatar">{session?.name?.charAt(0) || session?.email?.charAt(0).toUpperCase() || 'R'}</div>
        <h3>{session?.name || 'Reward member'}</h3>
        <p>{session?.email || 'Your account details'}</p>
        <div className="profile-meta"><span className="badge success">{session?.role || 'USER'}</span><span className="badge neutral">Verified workspace</span></div>
        {referralCode && <div className="referral-box"><span className="kicker">Invite friends</span><div className="code-row"><span>{referralCode}</span><button className="mini-btn" onClick={() => void copyReferral()}>{copied ? 'Copied' : 'Copy code'}</button></div></div>}
        <button className="secondary-btn small" onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}

function AppLayout() {
  const session = getSession();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('reward-theme') || 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('reward-theme', theme); }, [theme]);
  function signOut() { clearSession(); navigate('/login'); }
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">R</div>
          <span>Reward App</span>
        </div>

        <nav className="main-nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/rewards">Rewards</NavLink>
          <NavLink to="/promos">Promo codes</NavLink>
          <NavLink to="/wallet">Wallet</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <button className="theme-toggle" aria-label="Toggle theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '◐' : '☼'}</button>
          {session ? <button className="nav-signout" onClick={signOut}>Sign out</button> : <Link className="nav-login" to="/login">Sign in</Link>}
        </nav>
      </header>

      <main className="page-body">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/promos" element={<YonoPromosPage />} />
          <Route path="/dashboard" element={<RequireSession><DashboardPage /></RequireSession>} />
          <Route path="/tasks" element={<RequireSession><TasksPage /></RequireSession>} />
          <Route path="/rewards" element={<RequireSession><RewardsPage /></RequireSession>} />
          <Route path="/wallet" element={<RequireSession><WalletPage /></RequireSession>} />
          <Route path="/profile" element={<RequireSession><ProfilePage /></RequireSession>} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
