import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Row { id: string; name: string; xp: number; level: number; balance: number }

export function LeaderboardPage() {
  const [items, setItems] = useState<Row[]>([]);
  useEffect(() => { api<{ items: Row[] }>('/leaderboard?limit=50').then((r) => setItems(r.items)).catch(() => undefined); }, []);
  return (
    <div className="stack">
      <h1>Leaderboard</h1>
      <ol className="leader-list">
        {items.map((r, i) => (
          <li key={r.id}>
            <span className="rank">{i + 1}</span>
            <span className="name">{r.name}</span>
            <span className="muted">L{r.level} · {r.xp} XP</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
