import { useState } from 'react';

export interface Task { id: string; title: string; description: string; reward: number; isDemo: boolean }

export function TaskCard({ task, onComplete }: { task: Task; onComplete: (id: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try { await onComplete(task.id); } finally { setBusy(false); }
  };
  return (
    <article className="card task-card">
      <div className="task-head">
        <h3>{task.title}</h3>
        <span className="reward-pill">+₹ {task.reward}</span>
      </div>
      <p className="task-desc">{task.description}</p>
      <button className="btn btn-primary" onClick={handle} disabled={busy}>{busy ? 'Working...' : 'Complete'}</button>
    </article>
  );
}
