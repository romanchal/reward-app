import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { TaskCard, type Task } from '../components/TaskCard';
import { useAuth } from '../lib/auth';

export function EarnPage() {
  const { refresh } = useAuth();
  const [items, setItems] = useState<Task[]>([]);
  const [note, setNote] = useState<string>('');

  const load = async () => {
    const res = await api<{ items: Task[] }>('/tasks');
    setItems(res.items);
  };

  useEffect(() => { load().catch(() => undefined); }, []);

  const complete = async (id: string) => {
    try {
      const key = `${id}-${Date.now()}`;
      const res = await api<{ reward?: number; alreadyCompleted?: boolean }>(`/tasks/${id}/complete`, { method: 'POST', body: JSON.stringify({ idempotencyKey: key }) });
      setNote(res.alreadyCompleted ? 'Already completed' : `+₹ ${res.reward}`);
      await refresh();
    } catch (e: any) { setNote(e.message); }
  };

  return (
    <div className="stack">
      <h1>Earn</h1>
      {note && <div className="toast">{note}</div>}
      {items.map((t) => <TaskCard key={t.id} task={t} onComplete={complete} />)}
    </div>
  );
}
