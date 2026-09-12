import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StatCard } from '../components/StatCard';

interface Metrics { users: number; tasks: number; completions: number; withdrawals: number; pendingWithdrawals: number; fraudReview: number; rewardOrders: number; liabilityBalance: number }

export function DashboardPage() {
  const [m, setM] = useState<Metrics | null>(null);
  useEffect(() => { api<Metrics>('/admin/dashboard').then(setM).catch(() => undefined); }, []);
  if (!m) return <div className="loading">Loading…</div>;
  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <StatCard label="Users" value={m.users} />
        <StatCard label="Tasks" value={m.tasks} />
        <StatCard label="Completions" value={m.completions} />
        <StatCard label="Withdrawals" value={m.withdrawals} />
        <StatCard label="Pending Withdrawals" value={m.pendingWithdrawals} />
        <StatCard label="Fraud Review" value={m.fraudReview} />
        <StatCard label="Reward Orders" value={m.rewardOrders} />
        <StatCard label="Total Balance" value={`₹ ${m.liabilityBalance}`} />
      </div>
    </div>
  );
}
