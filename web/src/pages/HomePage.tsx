import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';
import { BalanceCard } from '../components/BalanceCard';
import { DailyMissions, type Mission } from '../components/DailyMissions';
import { ReferralCard } from '../components/ReferralCard';
import { ActivityList, type Activity } from '../components/ActivityList';
import { ErrorState, LoadingState, PageHeader, SectionHeader } from '../components/States';

interface DailyRewardResponse { rewarded: boolean; amount?: number; reason?: string; streak?: number }

export function HomePage() {
  const { user, refresh } = useAuth();
  const { notify } = useToast();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [missionRes, activityRes, streakRes] = await Promise.all([
        api<{ items: Mission[] }>('/missions'),
        api<{ items: Activity[] }>('/wallet/transactions?limit=8'),
        api<{ count: number }>('/streak'),
      ]);
      setMissions(missionRes.items);
      setActivity(activityRes.items);
      setStreak(streakRes.count);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const claim = async () => {
    setClaiming(true);
    try {
      const res = await api<DailyRewardResponse>('/daily-rewards', { method: 'POST', body: '{}' });
      if (res.rewarded) {
        setStreak(res.streak ?? 1);
        notify(`Daily reward claimed · +₹ ${res.amount}`, 'success');
      } else {
        notify(res.reason ?? 'Nothing to claim today', 'info');
      }
      await refresh();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setClaiming(false);
    }
  };

  const advance = async (id: string) => {
    await api(`/missions/${id}/complete`, { method: 'POST', body: '{}' });
    await load();
    await refresh();
  };

  if (loading) return <LoadingState label="Preparing your dashboard" />;
  if (error && !user) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!user) return null;

  return (
    <div className="stack page-stack">
      <PageHeader
        eyebrow="Welcome back"
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user.name.split(' ')[0]}`}
        description="Your progress is ready. Keep the streak alive."
      />
      <BalanceCard
        balance={user.balance}
        xp={user.xp}
        level={user.level}
        pendingBalance={user.pendingBalance}
        isVerified={user.isVerified}
      />
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      <section className="card daily-card">
        <div className="daily-card-copy">
          <div className="card-label">Today's check-in</div>
          <h2>{streak > 0 ? `${streak}-day streak` : 'Claim your daily reward'}</h2>
          <p>{streak > 0 ? 'You are building momentum. Come back tomorrow.' : 'A small daily habit keeps your progress moving.'}</p>
        </div>
        <button className="btn btn-primary" onClick={claim} disabled={claiming}>{claiming ? 'Claiming…' : 'Claim reward'}</button>
      </section>
      <DailyMissions items={missions} onAdvance={advance} />
      <section className="card">
        <SectionHeader title="Recent activity" description="Your latest balance movements" />
        <ActivityList items={activity} />
      </section>
      <ReferralCard code={user.referralCode} />
    </div>
  );
}
