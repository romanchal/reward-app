import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Reward { id: string; title: string; description: string; value: number; currency: string; isDemo: boolean }

export function RewardsPage() {
  const { refresh } = useAuth();
  const [items, setItems] = useState<Reward[]>([]);
  const [note, setNote] = useState<string>('');

  const load = async () => {
    const res = await api<{ items: Reward[] }>('/rewards');
    setItems(res.items);
  };

  useEffect(() => { load().catch(() => undefined); }, []);

  const order = async (rewardId: string) => {
    try {
      await api('/rewards/order', { method: 'POST', body: JSON.stringify({ rewardId }) });
      setNote('Demo mode — no real voucher will be issued.');
      await refresh();
    } catch (e: any) { setNote(e.message); }
  };

  return (
    <div className="stack">
      <h1>Rewards</h1>
      {note && <div className="toast">{note}</div>}
      {items.map((r) => (
        <article key={r.id} className="card">
          <h3>{r.title}</h3>
          <p className="muted">{r.description}</p>
          <div className="row">
            <span className="reward-pill">{r.currency} {r.value}</span>
            <button className="btn btn-primary" onClick={() => order(r.id)}>Order</button>
          </div>
        </article>
      ))}
    </div>
  );
}
