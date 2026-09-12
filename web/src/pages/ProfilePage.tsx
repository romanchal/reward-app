import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Txn { id: string; type: string; amount: number; balanceAfter: number; createdAt: string }
interface Withdrawal { id: string; amount: number; method: string; status: string; createdAt: string }

export function ProfilePage() {
  const { user, logout, refresh } = useAuth();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [form, setForm] = useState({ amount: 100, method: 'UPI', recipient: '' });
  const [note, setNote] = useState('');

  const load = async () => {
    const [t, w] = await Promise.all([
      api<{ items: Txn[] }>('/wallet/transactions'),
      api<{ items: Withdrawal[] }>('/withdrawals'),
    ]);
    setTxns(t.items);
    setWithdrawals(w.items);
  };

  useEffect(() => { load().catch(() => undefined); }, []);

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/withdrawals', { method: 'POST', body: JSON.stringify(form) });
      setNote('Demo mode — no real payout will be made.');
      await load();
      await refresh();
    } catch (err: any) { setNote(err.message); }
  };

  if (!user) return null;
  return (
    <div className="stack">
      <h1>Profile</h1>
      <section className="card">
        <div><strong>{user.name}</strong></div>
        <div className="muted">{user.email}</div>
        <div className="muted">Referral: {user.referralCode}</div>
        <button className="btn" onClick={logout}>Log out</button>
      </section>

      <section className="card">
        <h2>Withdraw (demo)</h2>
        <form onSubmit={withdraw} className="stack">
          <label>Amount<input type="number" min={100} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></label>
          <label>Method<input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} /></label>
          <label>Recipient<input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="upi@handle" required /></label>
          <button className="btn btn-primary" type="submit">Request withdrawal</button>
        </form>
        {note && <p className="muted">{note}</p>}
      </section>

      <section className="card">
        <h2>Withdrawals</h2>
        <ul>{withdrawals.map((w) => <li key={w.id}>₹ {w.amount} · {w.method} · <em>{w.status}</em></li>)}</ul>
      </section>

      <section className="card">
        <h2>Recent transactions</h2>
        <ul className="txn-list">
          {txns.map((t) => (
            <li key={t.id}>
              <span>{t.type}</span>
              <span className={t.amount >= 0 ? 'pos' : 'neg'}>{t.amount >= 0 ? '+' : ''}{t.amount}</span>
              <span className="muted">bal {t.balanceAfter}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
