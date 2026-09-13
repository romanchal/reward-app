import { useState } from 'react';
import { formatCurrency } from '../lib/format';

export interface Task { id: string; title: string; description: string; reward: number; isDemo: boolean }

export function TaskCard({ task, onComplete, completed = false }: {
  task: Task;
  onComplete: (id: string) => Promise<void>;
  completed?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try { await onComplete(task.id); } finally { setBusy(false); }
  };

  return (
    <article className={`card task-card ${completed ? 'is-complete' : ''}`}>
      <div className="task-card-icon" aria-hidden="true">{completed ? '✓' : '↗'}</div>
      <div className="task-card-body">
        <div className="task-head">
          <h3>{task.title}</h3>
          <span className="reward-pill">{formatCurrency(task.reward)}</span>
        </div>
        <p className="task-desc">{task.description}</p>
        <div className="task-card-footer">
          {task.isDemo && <span className="demo-tag">Demo task</span>}
          <button className="btn btn-primary btn-small" onClick={handle} disabled={busy || completed}>
            {completed ? 'Completed' : busy ? 'Working…' : 'Complete task'}
          </button>
        </div>
      </div>
    </article>
  );
}
