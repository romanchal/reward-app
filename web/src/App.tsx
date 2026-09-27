import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';

type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type TaskItem = {
  id: string | number;
  title: string;
  description: string;
  reward: number;
  xp: number;
  status?: string;
  difficulty?: string;
  tag?: string;
};

type WalletState = {
  balance: number;
  currency: string;
};

type ReferralItem = {
  name: string;
  status: string;
  reward: number;
};

type TransactionItem = {
  type: string;
  amount: number;
  date: string;
  positive: boolean;
};

const sampleTasks: TaskItem[] = [
  { id: 1, title: 'Daily check-in', description: 'Log in and collect your consistency bonus.', reward: 25, xp: 15, difficulty: 'Easy', tag: 'Streak', status: 'open' },
  { id: 2, title: 'Complete profile', description: 'Finish your profile details for a quick bonus.', reward: 60, xp: 30, difficulty: 'Medium', tag: 'Profile', status: 'open' },
  { id: 3, title: 'Refer a friend', description: 'Share your code and unlock a trusted friend bonus.', reward: 120, xp: 45, difficulty: 'Medium', tag: 'Invite', status: 'open' },
  { id: 4, title: 'Watch a tutorial', description: 'Learn how rewards work and get your reward tier.', reward: 80, xp: 35, difficulty: 'Easy', tag: 'Learn', status: 'open' },
];

const sampleTransactions: TransactionItem[] = [
  { type: 'Task reward', amount: 120, date: 'Today', positive: true },
  { type: 'Referral bonus', amount: 350, date: 'Yesterday', positive: true },
  { type: 'Withdrawal', amount: 200, date: 'Mon', positive: false },
  { type: 'Daily streak', amount: 50, date: 'Sun', positive: true },
];

const sampleReferrals: ReferralItem[] = [
  { name: 'Nia', status: 'Verified', reward: 150 },
  { name: 'Rohit', status: 'Pending', reward: 50 },
  { name: 'Anya', status: 'Verified', reward: 220 },
];

const leaderboard = [
  { name: 'Aisha', points: 8450 },
  { name: 'You', points: 7420 },
  { name: 'Dylan', points: 6630 },
  { name: 'Mira', points: 6210 },
];

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function readJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function extractAuthPayload(payload: any) {
  const data = payload?.data ?? payload;
  const accessToken = data?.accessToken ?? data?.token ?? data?.jwt ?? null;
  const user = data?.user ?? {
    id: data?.userId ?? data?.id ?? 'demo-user',
    name: data?.name ?? 'Reward User',
    email: data?.email ?? '',
    role: data?.role ?? 'USER',
  };
  return { accessToken, user };
}

function HomePage() {
  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="kicker">Earn more. Stay rewarded.</span>
          <h1>Turn daily actions into meaningful rewards.</h1>
          <p>
            Complete quick tasks, grow streaks, unlock referrals, and turn activity into real wallet value with a reward system built to keep momentum high.
          </p>
          <div className="cta-row">
            <Link to="/auth" className="primary-btn">Get started</Link>
            <Link to="/dashboard" className="secondary-btn">Explore dashboard</Link>
          </div>
          <div className="mini-stats">
            <div><strong>2.4M+</strong><span>Rewards paid</span></div>
            <div><strong>4.9/5</strong><span>User rating</span></div>
            <div><strong>120s</strong><span>Average task time</span></div>
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
          <div className="stack-list">
            <div><span>Streak bonus</span><strong>+₹150</strong></div>
            <div><span>Referral bonus</span><strong>+₹350</strong></div>
            <div><span>Available cash</span><strong>₹7,420</strong></div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <h3>Fast rewards</h3>
          <p>Earn from quick actions, streaks, referrals, and wallet milestones without friction.</p>
        </div>
        <div className="feature-card">
          <h3>Daily streaks</h3>
          <p>Push your consistency and unlock compounding bonuses as you keep going.</p>
        </div>
        <div className="feature-card">
          <h3>Community referral</h3>
          <p>Expand into a network that pays you back through trusted invites and social growth.</p>
        </div>
      </section>
    </div>
  );
}

function AuthPage({
  mode,
  onModeChange,
  form,
  onFieldChange,
  onSubmit,
  pending,
  error,
}: {
  mode: 'login' | 'register';
  onModeChange: (next: 'login' | 'register') => void;
  form: { name: string; email: string; password: string };
  onFieldChange: (key: keyof typeof form, value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error?: string;
}) {
  return (
    <div className="auth-shell">
      <div className="auth-box">
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => onModeChange('login')}>Login</button>
          <button type="button" className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => onModeChange('register')}>Sign up</button>
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {mode === 'register' && (
            <label>
              Name
              <input type="text" value={form.name} onChange={(event) => onFieldChange('name', event.target.value)} placeholder="Your name" />
            </label>
          )}

          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => onFieldChange('email', event.target.value)} placeholder="you@example.com" />
          </label>

          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => onFieldChange('password', event.target.value)} placeholder="••••••••" />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="primary-btn full-width" disabled={pending}>
            {pending ? 'Please wait...' : mode === 'login' ? 'Continue' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardPage({ user, wallet, tasks, overview }: { user?: User | null; wallet: WalletState; tasks: TaskItem[]; overview?: string[] }) {
  const stats = useMemo(
    () => [
      { label: 'Wallet', value: formatMoney(wallet.balance), accent: 'gold' },
      { label: 'Streak', value: '12 days', accent: 'green' },
      { label: 'Tasks done', value: String(tasks.length), accent: 'blue' },
      { label: 'Referrals', value: '9', accent: 'purple' },
    ],
    [wallet.balance, tasks.length]
  );

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="kicker">Overview</span>
          <h2>Welcome back, {user?.name || 'friend'}</h2>
        </div>
        <button type="button" className="primary-btn small">Claim daily reward</button>
      </div>

      <div className="stats-grid">
        {stats.map((item) => (
          <div className="stat-card" key={item.label}>
            <span className={`dot ${item.accent}`} />
            <small>{item.label}</small>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="content-grid dashboard-panel-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Recent activity</h3>
            <span className="badge soft">This week</span>
          </div>

          <ul className="activity-list">
            {(overview || ['Profile completion', 'Daily streak check-in', 'Task completed', 'Wallet top up']).map((item) => (
              <li key={item}><span>{item}</span><strong>+₹120</strong></li>
            ))}
          </ul>
        </div>

        <div className="panel chart-panel">
          <div className="panel-header">
            <h3>Performance</h3>
            <span className="badge">+18.6%</span>
          </div>
          <div className="chart-bars" aria-label="Reward chart">
            {[24, 48, 64, 82, 120, 104, 142].map((value, index) => (
              <span key={`${value}-${index}`} style={{ height: `${value}%`, animationDelay: `${index * 70}ms` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Leaderboard</h3>
            <span className="badge">Top users</span>
          </div>
          <ul className="leaderboard">
            {leaderboard.map((person, index) => (
              <li key={person.name}>
                <span className="rank">#{index + 1}</span>
                <strong>{person.name}</strong>
                <em>{person.points} pts</em>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Quick wins</h3>
            <span className="badge soft">Live</span>
          </div>
          <div className="quick-actions">
            <button type="button" className="secondary-btn full-width">Complete daily challenge</button>
            <button type="button" className="secondary-btn full-width">Refer 2 friends</button>
            <button type="button" className="secondary-btn full-width">Claim streak reward</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksPage({ tasks, onCompleteTask, token }: { tasks: TaskItem[]; onCompleteTask: (taskId: string | number) => void; token?: string | null }) {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="kicker">Tasks</span>
          <h2>Earn by completing quick actions</h2>
        </div>
      </div>

      <div className="task-grid">
        {tasks.map((task) => (
          <article className="task-card" key={String(task.id)}>
            <div className="task-meta">
              <span className="tag">{task.tag || 'Daily'}</span>
              <span className="difficulty">{task.difficulty || 'Easy'}</span>
            </div>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <div className="task-reward-row">
              <strong>{formatMoney(task.reward)}</strong>
              <span>{task.xp || 0} XP</span>
            </div>
            <button type="button" className="primary-btn small full-width" onClick={() => onCompleteTask(task.id)} disabled={!token}>
              {token ? (task.status === 'completed' ? 'Completed' : 'Complete task') : 'Login to earn'}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function WalletPage({ wallet, transactions, onWithdraw }: { wallet: WalletState; transactions: TransactionItem[]; onWithdraw: () => void }) {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="kicker">Wallet</span>
          <h2>Manage payouts and rewards</h2>
        </div>
        <button type="button" className="primary-btn small" onClick={onWithdraw}>Withdraw</button>
      </div>

      <div className="wallet-hero panel">
        <div>
          <small>Available balance</small>
          <h3>{formatMoney(wallet.balance)}</h3>
        </div>
        <div className="pill-group">
          <span className="badge success">+₹1,200 this month</span>
          <span className="badge neutral">{wallet.currency || 'INR'}</span>
        </div>
      </div>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Recent transactions</h3>
          </div>
          <ul className="transaction-list">
            {transactions.map((item, index) => (
              <li key={`${item.type}-${index}`}>
                <div>
                  <strong>{item.type}</strong>
                  <small>{item.date}</small>
                </div>
                <span className={item.positive ? 'amount positive' : 'amount negative'}>
                  {item.positive ? '+' : '-'}{formatMoney(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Quick actions</h3>
          </div>
          <div className="quick-actions">
            <button type="button" className="secondary-btn full-width">Add bank account</button>
            <button type="button" className="secondary-btn full-width">Export history</button>
            <button type="button" className="secondary-btn full-width">Enable automatic cashout</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferPage({ referrals, onInvite }: { referrals: ReferralItem[]; onInvite: () => void }) {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="kicker">Referrals</span>
          <h2>Invite friends and earn together</h2>
        </div>
      </div>

      <div className="referral-box panel">
        <h3>Your referral code</h3>
        <div className="code-row">
          <span>REWARD-AX42</span>
          <button type="button" className="secondary-btn small" onClick={onInvite}>Invite</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Referral progress</h3>
        </div>
        <ul className="referral-list">
          {referrals.map((user) => (
            <li key={user.name}>
              <div>
                <strong>{user.name}</strong>
                <small>{user.status}</small>
              </div>
              <span>{formatMoney(user.reward)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProfilePage({ user }: { user?: User | null }) {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="kicker">Profile</span>
          <h2>Manage your account</h2>
        </div>
      </div>

      <div className="profile-grid">
        <div className="panel profile-panel">
          <div className="avatar">{(user?.name || 'A').slice(0, 1).toUpperCase()}</div>
          <h3>{user?.name || 'Alex Morgan'}</h3>
          <p>{user?.email || 'alex@rewardapp.com'}</p>
          <div className="profile-meta">
            <span>Member since 2024</span>
            <span>Level 8</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Account settings</h3>
          </div>
          <div className="settings-list">
            <label><span>Push notifications</span><input type="checkbox" defaultChecked /></label>
            <label><span>Daily reminders</span><input type="checkbox" defaultChecked /></label>
            <label><span>Auto-cashout</span><input type="checkbox" /></label>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem('reward-theme');
    return stored === 'dark' ? 'dark' : 'light';
  });

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: 'demo@rewardapp.com', password: 'Password123!' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    return readJson<User | null>(window.localStorage.getItem('reward-user'), null);
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('reward-token');
  });
  const [tasks, setTasks] = useState<TaskItem[]>(sampleTasks);
  const [wallet, setWallet] = useState<WalletState>({ balance: 7420, currency: 'INR' });
  const [transactions, setTransactions] = useState<TransactionItem[]>(sampleTransactions);
  const [referrals, setReferrals] = useState<ReferralItem[]>(sampleReferrals);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('reward-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!token) return;

    const loadDashboard = async () => {
      try {
        const [taskRes, walletRes] = await Promise.all([
          fetch('/api/tasks', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/wallet/balance', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (taskRes.ok) {
          const payload = await taskRes.json().catch(() => ({}));
          const nextTasks = Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.tasks)
              ? payload.tasks
              : sampleTasks;

          setTasks(
            nextTasks.map((task: any) => ({
              id: task.id ?? task._id,
              title: task.title ?? 'Reward task',
              description: task.description ?? 'Task description',
              reward: Number(task.reward ?? task.amount ?? 0),
              xp: Number(task.xp ?? task.points ?? 20),
              difficulty: task.difficulty ?? 'Easy',
              tag: task.tag ?? 'Daily',
              status: task.status ?? 'open',
            }))
          );
        }

        if (walletRes.ok) {
          const payload = await walletRes.json().catch(() => ({}));
          const nextBalance = Number(payload?.balance ?? payload?.data?.balance ?? wallet.balance);
          setWallet({
            balance: Number.isFinite(nextBalance) ? nextBalance : wallet.balance,
            currency: payload?.currency ?? 'INR',
          });
        }
      } catch {
        // keep the sample UI as a graceful fallback when the backend is unavailable
      }
    };

    void loadDashboard();
  }, [token]);

  const handleAuthSubmit = async () => {
    setPending(true);
    setError(undefined);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body: Record<string, string> = {
        email: authForm.email,
        password: authForm.password,
      };

      if (authMode === 'register') {
        body.name = authForm.name;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || payload?.message || 'Authentication failed');
      }

      const { accessToken, user: payloadUser } = extractAuthPayload(payload);
      if (!accessToken) {
        throw new Error('No access token returned from the server');
      }

      const nextUser: User = {
        id: payloadUser?.id || 'demo-user',
        name: payloadUser?.name || authForm.name || 'Reward User',
        email: payloadUser?.email || authForm.email,
        role: payloadUser?.role || 'USER',
      };

      setUser(nextUser);
      setToken(accessToken);
      window.localStorage.setItem('reward-user', JSON.stringify(nextUser));
      window.localStorage.setItem('reward-token', accessToken);
      setAuthForm({ name: '', email: '', password: '' });
    } catch (error: any) {
      setError(error?.message || 'Unable to authenticate');
    } finally {
      setPending(false);
    }
  };

  const completeTask = async (taskId: string | number) => {
    const currentTask = tasks.find((task) => String(task.id) === String(taskId));
    if (!currentTask) return;

    const reward = Number(currentTask.reward || 0);

    if (token) {
      try {
        const res = await fetch(`/api/tasks/${taskId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ idempotencyKey: `task-${taskId}` }),
        });

        if (res.ok) {
          setTasks((previous) =>
            previous.map((task) =>
              String(task.id) === String(taskId) ? { ...task, status: 'completed' } : task
            )
          );
        }
      } catch {
        // ignore and continue with UI fallback
      }
    }

    setTasks((previous) =>
      previous.map((task) =>
        String(task.id) === String(taskId) ? { ...task, status: 'completed' } : task
      )
    );
    setWallet((previous) => ({ ...previous, balance: previous.balance + reward }));
    setTransactions((previous) => [{ type: 'Task reward', amount: reward, date: 'Now', positive: true }, ...previous]);
  };

  const handleWithdraw = () => {
    if (wallet.balance < 100) {
      setError('Minimum withdrawal is ₹100.');
      return;
    }

    setWallet((previous) => ({ ...previous, balance: Math.max(0, previous.balance - 200) }));
    setTransactions((previous) => [{ type: 'Withdrawal', amount: 200, date: 'Now', positive: false }, ...previous]);
  };

  const handleInvite = () => {
    const next = { name: `Friend ${referrals.length + 1}`, status: 'Pending', reward: 75 };
    setReferrals((previous) => [next, ...previous]);
    setWallet((previous) => ({ ...previous, balance: previous.balance + 75 }));
    setTransactions((previous) => [{ type: 'Referral bonus', amount: 75, date: 'Now', positive: true }, ...previous]);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">R</div>
          <span>Reward App</span>
        </div>

        <nav className="main-nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/auth">Auth</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/wallet">Wallet</NavLink>
          <NavLink to="/refer">Refer</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>

        <div className="topbar-actions">
          <button type="button" className="theme-toggle" onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button type="button" className="primary-btn small" onClick={() => setAuthMode('register')}>
            {user ? 'Launch app' : 'Join now'}
          </button>
        </div>
      </header>

      <main className="page-body">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/auth"
            element={
              <AuthPage
                mode={authMode}
                onModeChange={setAuthMode}
                form={authForm}
                onFieldChange={(key, value) => setAuthForm((previous) => ({ ...previous, [key]: value }))}
                onSubmit={handleAuthSubmit}
                pending={pending}
                error={error}
              />
            }
          />
          <Route path="/dashboard" element={<DashboardPage user={user} wallet={wallet} tasks={tasks} overview={['Profile completion', 'Daily streak check-in', 'Task completed', 'Wallet top up']} />} />
          <Route path="/tasks" element={<TasksPage tasks={tasks} onCompleteTask={completeTask} token={token} />} />
          <Route path="/wallet" element={<WalletPage wallet={wallet} transactions={transactions} onWithdraw={handleWithdraw} />} />
          <Route path="/refer" element={<ReferPage referrals={referrals} onInvite={handleInvite} />} />
          <Route path="/profile" element={<ProfilePage user={user} />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
