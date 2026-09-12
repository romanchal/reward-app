import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api, getToken, setToken } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { TasksPage } from './pages/TasksPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import { FraudPage } from './pages/FraudPage';
import { SettingsPage } from './pages/SettingsPage';

function Shell({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <h1>Admin</h1>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/users">Users</NavLink>
        <NavLink to="/tasks">Tasks</NavLink>
        <NavLink to="/withdrawals">Withdrawals</NavLink>
        <NavLink to="/fraud">Fraud</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <button className="btn" onClick={onLogout}>Log out</button>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

export function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      if (!getToken()) { setReady(true); return; }
      try {
        const me = await api<{ user: { role: string } }>('/auth/me');
        setAuthed(me.user.role === 'ADMIN');
      } catch { setToken(null); }
      setReady(true);
    })();
  }, []);

  const logout = () => { setToken(null); setAuthed(false); };

  if (!ready) return <div className="loading">Loading…</div>;
  if (!authed) return <LoginPage onDone={() => setAuthed(true)} />;

  return (
    <Shell onLogout={logout}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/withdrawals" element={<WithdrawalsPage />} />
        <Route path="/fraud" element={<FraudPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
