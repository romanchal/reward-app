import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api, bindSessionLostHandler, setToken, tryRestoreSession } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { TasksPage } from './pages/TasksPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { FraudPage } from './pages/FraudPage';
import { SettingsPage } from './pages/SettingsPage';
import { ManualPaymentsPage } from './pages/ManualPaymentsPage';

function Shell({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <div className="admin-shell">
      <aside className="admin-nav" aria-label="Admin navigation">
        <h1>Admin</h1>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/users">Users</NavLink>
        <NavLink to="/tasks">Tasks</NavLink>
        <NavLink to="/withdrawals">Withdrawals</NavLink>
        <NavLink to="/manual-payments">Manual payments</NavLink>
        <NavLink to="/fraud">Fraud</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <button className="btn" onClick={onLogout}>Log out</button>
      </aside>
      <main className="admin-main" id="admin-main">{children}</main>
    </div>
  );
}

export function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    bindSessionLostHandler(() => setAuthed(false));
    (async () => {
      const restored = await tryRestoreSession();
      if (restored) {
        try {
          const me = await api<{ user: { role: string } }>('/auth/me');
          setAuthed(me.user.role === 'ADMIN');
        } catch { setToken(null); }
      }
      setReady(true);
    })();
  }, []);

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST', body: '{}' }); } catch {}
    setToken(null);
    setAuthed(false);
  };

  if (!ready) return <div className="loading" role="status">Loading…</div>;
  if (!authed) return <LoginPage onDone={() => setAuthed(true)} />;

  return (
    <Shell onLogout={() => void logout()}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/withdrawals" element={<WithdrawalsPage />} />
        <Route path="/manual-payments" element={<ManualPaymentsPage />} />
        <Route path="/fraud" element={<FraudPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
