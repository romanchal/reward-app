import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const tabs = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/earn', label: 'Earn', icon: '↗' },
  { to: '/rewards', label: 'Rewards', icon: '✦' },
  { to: '/leaderboard', label: 'Board', icon: '♙' },
  { to: '/profile', label: 'Me', icon: '●' },
] as const;

export function Layout() {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span><strong>Reward</strong><small>earn better</small></span>
        </div>
        <div className="header-actions">
          {user?.isVerified && <span className="verified-chip">Verified</span>}
          <span className="balance-chip">₹ {user?.balance.toLocaleString('en-IN') ?? 0}</span>
        </div>
      </header>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={({ isActive }) => isActive ? 'active' : undefined}>
            <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="app-main"><Outlet /></main>
      <nav className="app-tabs" aria-label="Primary navigation">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={({ isActive }) => isActive ? 'active' : undefined}>
            <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="demo-banner">Demo mode · no real payment will be made</div>
    </div>
  );
}
