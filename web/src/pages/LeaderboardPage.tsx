import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ErrorState, LoadingState, PageHeader, SectionHeader } from '../components/States';
import { initials } from '../lib/format';

interface Row { id: string; name: string; xp: number; level: number; balance: number }

export function LeaderboardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ items: Row[] }>('/leaderboard?limit=50')
      .then((res) => setItems(res.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Calculating the leaderboard" />;
  if (error) return <ErrorState message={error} />;
  const myRank = user ? items.findIndex((row) => row.id === user.id) + 1 : 0;
  const podium = items.slice(0, 3);

  return (
    <div className="stack page-stack">
      <PageHeader eyebrow="Community" title="Leaderboard" description="See who is making the most progress this cycle." />
      {user && <section className="rank-card"><span className="rank-card-label">Your position</span><strong>#{myRank || '—'}</strong><span className="muted">{myRank ? `${items[myRank - 1]?.xp.toLocaleString('en-IN')} XP` : 'Keep earning to get ranked'}</span></section>}
      <section className="card podium-card">
        <SectionHeader title="Top earners" description="The current front of the pack" />
        <div className="podium">
          {podium.map((row, index) => (
            <div className={`podium-rank podium-${index + 1}`} key={row.id}>
              <span className="podium-avatar">{initials(row.name)}</span>
              <strong>#{index + 1}</strong>
              <span>{row.name}</span>
              <small>{row.xp.toLocaleString('en-IN')} XP</small>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <SectionHeader title="Everyone" description="Ranked by XP, then balance" />
        <ol className="leader-list">
          {items.map((row, i) => (
            <li key={row.id} className={row.id === user?.id ? 'is-current' : ''}>
              <span className="rank">{i + 1}</span>
              <span className="leader-avatar">{initials(row.name)}</span>
              <span className="name"><strong>{row.name}</strong><small>{row.level} level · {row.xp.toLocaleString('en-IN')} XP</small></span>
              <span className="leader-balance">{row.balance.toLocaleString('en-IN')} pts</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
