import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { EarnPage } from './pages/EarnPage';
import { GamesPage } from './pages/GamesPage';
import { RewardsPage } from './pages/RewardsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useAuth } from './lib/auth';

function Protected({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="page-loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>Loading your workspace…</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/earn" element={<EarnPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
