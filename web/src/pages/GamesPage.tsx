import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { ErrorState, LoadingState, PageHeader, SectionHeader } from '../components/States';
import { formatCurrency } from '../lib/format';

type GameType = 'SCRATCH' | 'WHEEL';
interface GameInfo { game: GameType; limit: number; used: number; remaining: number; tiers: Array<{ amount: number; label: string }> }
interface Status { date: string; games: GameInfo[] }
interface PlayResult { reward: { amount: number; label: string; won: boolean }; remaining: number }

export function GamesPage() {
  const { refresh } = useAuth();
  const { notify } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<GameType | null>(null);
  const [reveal, setReveal] = useState<Record<GameType, PlayResult | null>>({ SCRATCH: null, WHEEL: null });
  const [wheelAngle, setWheelAngle] = useState(0);

  const load = async () => {
    setError('');
    try { setStatus(await api<Status>('/games/status')); } catch (e: any) { setError(e.message); }
  };

  useEffect(() => { void load(); }, []);

  const play = async (game: GameType) => {
    setBusy(game);
    setReveal((s) => ({ ...s, [game]: null }));
    try {
      const res = await api<PlayResult>(`/games/${game.toLowerCase()}/play`, { method: 'POST', body: '{}' });
      if (game === 'WHEEL') {
        const wheelInfo = status?.games.find((g) => g.game === 'WHEEL');
        const idx = Math.max(0, wheelInfo?.tiers.findIndex((t) => t.amount === res.reward.amount) ?? 0);
        const sliceSize = 360 / (wheelInfo?.tiers.length ?? 6);
        setWheelAngle(360 * 4 + (360 - idx * sliceSize - sliceSize / 2));
        await new Promise((r) => setTimeout(r, 2300));
      }
      setReveal((s) => ({ ...s, [game]: res }));
      if (res.reward.won) notify(`You won ${formatCurrency(res.reward.amount)}`, 'success');
      else notify('Better luck next play', 'info');
      await load();
      await refresh();
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setBusy(null); }
  };

  if (!status && !error) return <LoadingState label="Loading games" />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!status) return null;

  const scratch = status.games.find((g) => g.game === 'SCRATCH')!;
  const wheel = status.games.find((g) => g.game === 'WHEEL')!;

  return (
    <div className="stack page-stack">
      <PageHeader eyebrow="Play &amp; win" title="Games" description={`Daily plays reset at midnight · ${status.date}`} />

      <section className="card">
        <SectionHeader title="Scratch card" description={`${scratch.remaining} / ${scratch.limit} plays left today`} />
        <div className="scratch-stage">
          <div className={`scratch-card ${reveal.SCRATCH ? 'is-revealed' : ''} ${reveal.SCRATCH?.reward.won ? 'is-win' : ''}`}>
            <div className="scratch-reveal">
              {reveal.SCRATCH ? (
                <>
                  <strong>{reveal.SCRATCH.reward.won ? 'You won' : 'No win'}</strong>
                  <span>{reveal.SCRATCH.reward.label}</span>
                </>
              ) : <span>?</span>}
            </div>
            <div className="scratch-cover" aria-hidden="true">Scratch</div>
          </div>
          <button className="btn btn-primary" onClick={() => play('SCRATCH')} disabled={busy === 'SCRATCH' || scratch.remaining <= 0}>
            {scratch.remaining <= 0 ? 'Come back tomorrow' : busy === 'SCRATCH' ? 'Revealing…' : 'Scratch to reveal'}
          </button>
        </div>
      </section>

      <section className="card">
        <SectionHeader title="Spin the wheel" description={`${wheel.remaining} / ${wheel.limit} spins left today`} />
        <div className="wheel-stage">
          <div className="wheel-pointer" aria-hidden="true" />
          <div className="wheel" style={{ transform: `rotate(${wheelAngle}deg)` }}>
            {wheel.tiers.map((t, i) => (
              <div key={i} className="wheel-slice" style={{ transform: `rotate(${(360 / wheel.tiers.length) * i}deg)` }}>
                <span style={{ transform: `rotate(${(360 / wheel.tiers.length) / 2}deg)` }}>{t.label}</span>
              </div>
            ))}
            <div className="wheel-hub" aria-hidden="true" />
          </div>
          {reveal.WHEEL && (
            <div className="wheel-result">
              <strong>{reveal.WHEEL.reward.won ? `Won ${reveal.WHEEL.reward.label}` : 'Try again tomorrow'}</strong>
            </div>
          )}
          <button className="btn btn-primary" onClick={() => play('WHEEL')} disabled={busy === 'WHEEL' || wheel.remaining <= 0}>
            {wheel.remaining <= 0 ? 'Come back tomorrow' : busy === 'WHEEL' ? 'Spinning…' : 'Spin'}
          </button>
        </div>
      </section>
    </div>
  );
}
