import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Layout() {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">Reward App</div>
        <div className="balance-chip">₹ {user?.balance ?? 0}</div>
      </header>
      <main className="app-main"><Outlet /></main>
      <nav className="app-tabs">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/earn">Earn</NavLink>
        <NavLink to="/rewards">Rewards</NavLink>
        <NavLink to="/leaderboard">Board</NavLink>
        <NavLink to="/profile">Me</NavLink>
      </nav>
      <div className="demo-banner">Demo mode — no real payment will be made.</div>
    </div>
  );
}
