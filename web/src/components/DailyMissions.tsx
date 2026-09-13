import { useState } from 'react';
import { formatCurrency } from '../lib/format';
import { ProgressBar } from './States';

export interface Mission { id: string; title: string; description: string; target: number; reward: number; progress: number }

export function DailyMissions({ items, onAdvance }: { items: Mission[]; onAdvance: (id: string) => Promise<void> }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const advance = async (id: string) => {
    setBusyId(id);
    try { await onAdvance(id); } finally { setBusyId(null); }
  };

  if (!items.length) {
    return (
      <section className="card">
        <h2>Daily missions</h2>
        <div className="inline-empty"><strong>No missions today</strong><span>Check back tomorrow for a fresh set.</span></div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section-header compact">
        <div>
          <h2>Daily missions</h2>
          <p>Small actions, steady progress.</p>
        </div>
        <span className="section-count">{items.filter((m) => m.progress >= m.target).length}/{items.length}</span>
      </div>
      <div className="mission-list">
        {items.map((m) => {
          const complete = m.progress >= m.target;
          return (
            <div className={`mission-row ${complete ? 'is-complete' : ''}`} key={m.id}>
              <div className="mission-row-copy">
                <strong>{m.title}</strong>
                <span className="muted">{m.progress}/{m.target} · {formatCurrency(m.reward)} reward</span>
                <ProgressBar value={m.progress} max={m.target} />
              </div>
              <button className="btn btn-small" onClick={() => advance(m.id)} disabled={busyId === m.id || complete}>
                {complete ? 'Done' : busyId === m.id ? '…' : '+1'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
