import { formatCurrency, formatRelativeDate } from '../lib/format';

export interface Activity {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
}

const labels: Record<string, string> = {
  TASK_REWARD: 'Task reward',
  DAILY_REWARD: 'Daily reward',
  MISSION_REWARD: 'Mission reward',
  REFERRAL_REWARD: 'Referral reward',
  REWARD_ORDER: 'Reward order',
  WITHDRAWAL: 'Withdrawal',
  ADJUSTMENT: 'Adjustment',
};

export function ActivityList({ items, limit }: { items: Activity[]; limit?: number }) {
  const visible = limit ? items.slice(0, limit) : items;
  if (!visible.length) {
    return (
      <div className="inline-empty">
        <strong>No activity yet</strong>
        <span>Completed earnings and redemptions will appear here.</span>
      </div>
    );
  }

  return (
    <ul className="activity-list">
      {visible.map((item) => {
        const positive = item.amount >= 0;
        return (
          <li key={item.id}>
            <span className={`activity-icon ${positive ? 'activity-positive' : 'activity-negative'}`} aria-hidden="true">
              {positive ? '+' : '−'}
            </span>
            <span className="activity-copy">
              <strong>{labels[item.type] ?? item.type}</strong>
              <span>{formatRelativeDate(item.createdAt)}</span>
            </span>
            <span className="activity-amount">
              <strong className={positive ? 'pos' : 'neg'}>{positive ? '+' : '−'}{formatCurrency(Math.abs(item.amount))}</strong>
              <span className="muted">bal {formatCurrency(item.balanceAfter)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
