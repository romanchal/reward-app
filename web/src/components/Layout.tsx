import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const tabs = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/earn', label: 'Earn', icon: '↗' },
  { to: '/rewards', label: 'Rewards', icon: '✦' },
  { to: '/leaderboard', label: 'Board', icon: '♙' },
  { to: '/profile', label: 'Me', icon: '●' },
] as const;

function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function Layout() {
  const { user } = useAuth();
  const online = useOnlineStatus();

  return (
    <div className="app-shell">
      {!online && (
        <div className="offline-banner" role="alert" aria-live="assertive">
          Offline — changes may not save until your connection returns
        </div>
      )}
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span><strong>Reward</strong><small>earn better</small></span>
        </div>
        <div className="header-actions">
          {user?.isVerified && <span className="verified-chip" aria-label="Verified account">Verified</span>}
          <span className="balance-chip" aria-label={`Balance ${user?.balance ?? 0} rupees`}>
            ₹ {user?.balance.toLocaleString('en-IN') ?? 0}
          </span>
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
      <main className="app-main" id="main-content"><Outlet /></main>
      <nav className="app-tabs" aria-label="Mobile navigation">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={({ isActive }) => isActive ? 'active' : undefined}>
            <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="demo-banner" role="note">Demo mode · no real payment will be made</div>
    </div>
  );
}
