import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { TaskCard, type Task } from '../components/TaskCard';
import { OfferCard, type Offer } from '../components/OfferCard';
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionHeader } from '../components/States';

export function EarnPage() {
  const { refresh } = useAuth();
  const { notify } = useToast();
  const [items, setItems] = useState<Task[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [taskRes, offerRes] = await Promise.all([
        api<{ items: Task[] }>('/tasks'),
        api<{ items: Offer[] }>('/offers'),
      ]);
      setItems(taskRes.items);
      setOffers(offerRes.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const complete = async (id: string) => {
    try {
      const key = `${id}-${Date.now()}`;
      const res = await api<{ reward?: number; alreadyCompleted?: boolean }>(`/tasks/${id}/complete`, { method: 'POST', body: JSON.stringify({ idempotencyKey: key }) });
      setCompleted((current) => new Set(current).add(id));
      notify(res.alreadyCompleted ? 'This task is already complete' : `Task complete · +₹ ${res.reward}`, res.alreadyCompleted ? 'info' : 'success');
      await refresh();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  if (loading) return <LoadingState label="Loading earning opportunities" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="stack page-stack">
      <PageHeader eyebrow="Make it count" title="Earn" description="Complete tasks and explore available offers." />
      <section>
        <SectionHeader title="Quick tasks" description="Simple actions with instant demo rewards" />
        {items.length ? (
          <>
            <div className="card-grid task-grid">{items.slice(0, showAllTasks ? undefined : 6).map((task) => <TaskCard key={task.id} task={task} onComplete={complete} completed={completed.has(task.id)} />)}</div>
            {items.length > 6 && (
              <button className="btn show-all-btn" onClick={() => setShowAllTasks((current) => !current)}>
                {showAllTasks ? 'Show fewer tasks' : `View all ${items.length} tasks`}
              </button>
            )}
          </>
        ) : <EmptyState title="No tasks right now" description="New tasks will appear here when they are live." />}
      </section>
      <section>
        <SectionHeader title="Partner offers" description="Curated opportunities from the current provider" />
        {offers.length ? (
          <div className="card-grid offer-grid">{offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}</div>
        ) : <EmptyState title="No offers available" description="Check back when the provider catalogue is refreshed." />}
      </section>
    </div>
  );
}
