import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionHeader } from '../components/States';
import { formatCurrency, formatRelativeDate } from '../lib/format';

interface Reward { id: string; title: string; description: string; value: number; currency: string; isDemo: boolean }
interface Order { id: string; amount: number; status: string; createdAt: string; reward: { title: string } }

export function RewardsPage() {
  const { refresh, user } = useAuth();
  const { notify } = useToast();
  const [items, setItems] = useState<Reward[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [rewardRes, orderRes] = await Promise.all([
        api<{ items: Reward[] }>('/rewards'),
        api<{ items: Order[] }>('/rewards/orders'),
      ]);
      setItems(rewardRes.items);
      setOrders(orderRes.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const order = async (rewardId: string) => {
    try {
      await api('/rewards/order', { method: 'POST', body: JSON.stringify({ rewardId }) });
      notify('Demo redemption created · no real voucher will be issued.', 'success');
      await load();
      await refresh();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  if (loading) return <LoadingState label="Loading the reward catalogue" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="stack page-stack">
      <PageHeader eyebrow="Spend what you earn" title="Rewards" description="Redeem your demo balance for a reward." />
      <section>
        <SectionHeader title="Available rewards" description={`${user?.balance ? formatCurrency(user.balance) : formatCurrency(0)} available`} />
        {items.length ? (
          <div className="card-grid reward-grid">{items.map((reward) => {
            const affordable = (user?.balance ?? 0) >= reward.value;
            return (
              <article className="card reward-card" key={reward.id}>
                <div className="reward-visual" aria-hidden="true"><span>✦</span></div>
                <div className="reward-card-body">
                  <div className="reward-card-topline">{reward.isDemo && <span className="demo-tag">Demo reward</span>}<span className="reward-value">{formatCurrency(reward.value, reward.currency)}</span></div>
                  <h3>{reward.title}</h3>
                  <p>{reward.description}</p>
                  <button className="btn btn-primary" onClick={() => order(reward.id)} disabled={!affordable}>{affordable ? 'Redeem reward' : 'Not enough balance'}</button>
                </div>
              </article>
            );
          })}</div>
        ) : <EmptyState title="No rewards available" description="New rewards will appear here when the catalogue is updated." />}
      </section>
      <section className="card">
        <SectionHeader title="Redemption history" description="Your latest demo orders" />
        {orders.length ? (
          <ul className="history-list">
            {orders.slice(0, 5).map((orderItem) => (
              <li key={orderItem.id}>
                <span className="history-icon">✦</span>
                <span><strong>{orderItem.reward.title}</strong><span className="muted">{formatRelativeDate(orderItem.createdAt)} · {orderItem.status}</span></span>
                <strong>{formatCurrency(orderItem.amount)}</strong>
              </li>
            ))}
          </ul>
        ) : <div className="inline-empty"><strong>No redemptions yet</strong><span>Your completed orders will be listed here.</span></div>}
      </section>
    </div>
  );
}
