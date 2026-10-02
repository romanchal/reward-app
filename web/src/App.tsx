import { Component, type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { apiRequest, clearSession, formatCurrency, getSession, saveSession, type ApiTask, type Session, type Wallet } from './lib/api';

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

function HomePage() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="kicker">Earn more. Stay rewarded.</span>
          <h1>Turn daily actions into meaningful rewards.</h1>
          <p>
            Complete quick tasks, grow streaks, unlock referrals, and convert activity into wallet value.
          </p>
          <div className="cta-row">
            <Link to={getSession() ? '/dashboard' : '/login'} className="primary-btn">Start earning</Link>
            <Link to="/tasks" className="secondary-btn">Browse missions</Link>
          </div>
        </div>
        <div className="hero-card">
          <div className="card-topline">Your progress</div>
          <div className="circle-ring">
            <div className="circle-inner">
              <strong>72%</strong>
              <span>Weekly goal</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await apiRequest<{ data?: { token: string; userId: string; role: string }; accessToken?: string; user?: { id: string; role: string; name: string; email: string } }>(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(mode === 'register' ? { name, email, password } : { email, password }),
      });
      const legacy = response.data;
      const token = response.accessToken || legacy?.token;
      const user = response.user;
      if (!token || (!legacy && !user)) throw new Error('The server returned an incomplete session.');
      saveSession({ token, userId: user?.id || legacy?.userId || '', role: user?.role || legacy?.role || 'USER', name: user?.name || (mode === 'register' ? name : undefined), email: user?.email || email });
      navigate('/dashboard');
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
          <NavLink to="/wallet">Wallet</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <button className="theme-toggle" aria-label="Toggle theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '◐' : '☼'}</button>
          {session ? <button className="nav-signout" onClick={signOut}>Sign out</button> : <Link className="nav-login" to="/login">Sign in</Link>}
        </nav>
      </header>

      <main className="page-body">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<RequireSession><DashboardPage /></RequireSession>} />
          <Route path="/tasks" element={<RequireSession><TasksPage /></RequireSession>} />
          <Route path="/wallet" element={<RequireSession><WalletPage /></RequireSession>} />
          <Route path="/profile" element={<RequireSession><ProfilePage /></RequireSession>} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
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
