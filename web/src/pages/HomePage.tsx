import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BalanceCard } from '../components/BalanceCard';
import { DailyMissions, type Mission } from '../components/DailyMissions';
import { ReferralCard } from '../components/ReferralCard';

export function HomePage() {
  const { user, refresh } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [dailyMsg, setDailyMsg] = useState<string>('');

  const load = async () => {
    const res = await api<{ items: Mission[] }>('/missions');
    setMissions(res.items);
  };

  useEffect(() => { load().catch(() => undefined); }, []);

  const claim = async () => {
    try {
      const res = await api<{ rewarded: boolean; amount?: number; reason?: string }>('/daily-rewards', { method: 'POST', body: '{}' });
      setDailyMsg(res.rewarded ? `Claimed ₹ ${res.amount}` : res.reason ?? 'Nothing today');
      await refresh();
    } catch (e: any) {
      setDailyMsg(e.message);
    }
  };

  const advance = async (id: string) => {
    await api(`/missions/${id}/complete`, { method: 'POST', body: '{}' });
    await load();
    await refresh();
  };

  if (!user) return null;
  return (
    <div className="stack">
      <BalanceCard balance={user.balance} xp={user.xp} level={user.level} />
      <section className="card">
        <h2>Daily reward</h2>
        <button className="btn btn-primary" onClick={claim}>Claim today's reward</button>
        {dailyMsg && <p className="muted">{dailyMsg}</p>}
      </section>
      <DailyMissions items={missions} onAdvance={advance} />
      <ReferralCard code={user.referralCode} />
    </div>
  );
}
