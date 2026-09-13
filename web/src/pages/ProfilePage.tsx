import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { ActivityList, type Activity } from '../components/ActivityList';
import { ErrorState, LoadingState, PageHeader, SectionHeader } from '../components/States';
import { formatCurrency, formatRelativeDate, initials } from '../lib/format';

interface Withdrawal { id: string; amount: number; method: string; status: string; createdAt: string }
interface Order { id: string; amount: number; status: string; createdAt: string; reward: { title: string } }

export function ProfilePage() {
  const { user, logout, refresh, updateUser } = useAuth();
  const { notify } = useToast();
  const [txns, setTxns] = useState<Activity[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({ amount: 100, method: 'UPI', recipient: '' });
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [transactionRes, withdrawalRes, orderRes] = await Promise.all([
        api<{ items: Activity[] }>('/wallet/transactions?limit=10'),
        api<{ items: Withdrawal[] }>('/withdrawals'),
        api<{ items: Order[] }>('/rewards/orders'),
      ]);
      setTxns(transactionRes.items);
      setWithdrawals(withdrawalRes.items);
      setOrders(orderRes.items);
      if (user) setProfile({ name: user.name, email: user.email });
    } catch (err: any) {
      setNote(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user?.id]);

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setNote('');
    try {
      await api('/withdrawals', { method: 'POST', body: JSON.stringify(form) });
      notify('Demo withdrawal requested · no real payout will be made.', 'success');
      await load();
      await refresh();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNote('');
    try {
      const res = await api<{ user: { name: string; email: string } }>('/auth/me', { method: 'PATCH', body: JSON.stringify(profile) });
      notify('Profile updated', 'success');
      updateUser(res.user);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Opening your profile" />;
  if (!user) return null;

  return (
    <div className="stack page-stack">
      <PageHeader eyebrow="Your account" title="Profile" description="Manage your details and review your account activity." />
      <section className="card profile-hero">
        <div className="profile-avatar">{initials(user.name)}</div>
        <div><h2>{user.name}</h2><p>{user.email}</p><span className="verified-chip">{user.isVerified ? 'Verified account' : 'Verification pending'}</span></div>
        <button className="btn btn-small" onClick={logout}>Log out</button>
      </section>
      {note && <div className="toast toast-info"><span>{note}</span></div>}
      <section className="card">
        <SectionHeader title="Profile details" description="Update how your account appears" />
        <form onSubmit={saveProfile} className="stack form-grid">
          <label>Name<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required minLength={2} /></label>
          <label>Email<input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} type="email" required /></label>
          <button className="btn btn-primary btn-small" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </form>
      </section>
      <section className="card">
        <SectionHeader title="Withdraw funds" description="Demo payouts are never processed" />
        <form onSubmit={withdraw} className="stack form-grid">
          <label>Amount (₹)<input type="number" min={100} max={user.balance} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required /></label>
          <label>Method<select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>UPI</option><option>Bank transfer</option><option>Wallet</option></select></label>
          <label>Recipient<input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="upi@handle" required /></label>
          <button className="btn btn-primary" type="submit">Request withdrawal</button>
        </form>
      </section>
      <section className="card">
        <SectionHeader title="Recent activity" description="Your latest wallet movements" />
        <ActivityList items={txns} />
      </section>
      <section className="card">
        <SectionHeader title="Withdrawals" description="Track your demo payout requests" />
        {withdrawals.length ? <ul className="history-list">{withdrawals.slice(0, 5).map((item) => <li key={item.id}><span className="history-icon">↗</span><span><strong>{formatCurrency(item.amount)} · {item.method}</strong><span className="muted">{formatRelativeDate(item.createdAt)}</span></span><strong>{item.status}</strong></li>)}</ul> : <div className="inline-empty"><strong>No withdrawals yet</strong><span>Requested payouts will appear here.</span></div>}
      </section>
      <section className="card">
        <SectionHeader title="Reward orders" description="Your latest demo redemptions" />
        {orders.length ? <ul className="history-list">{orders.slice(0, 5).map((item) => <li key={item.id}><span className="history-icon">✦</span><span><strong>{item.reward.title}</strong><span className="muted">{formatRelativeDate(item.createdAt)}</span></span><strong>{formatCurrency(item.amount)}</strong></li>)}</ul> : <div className="inline-empty"><strong>No reward orders yet</strong><span>Redeemed rewards will appear here.</span></div>}
      </section>
    </div>
  );
}
