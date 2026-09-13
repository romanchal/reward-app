export function BalanceCard({ balance, xp, level, pendingBalance = 0, isVerified = false }: {
  balance: number;
  xp: number;
  level: number;
  pendingBalance?: number;
  isVerified?: boolean;
}) {
  return (
    <section className="card balance-card">
      <div className="balance-card-top">
        <div>
          <div className="card-label">Available balance</div>
          <div className="card-value">₹ {balance.toLocaleString('en-IN')}</div>
        </div>
        <div className="level-orb" aria-hidden="true">
          <span>{level}</span>
        </div>
      </div>
      <div className="balance-meta">
        <span>Level {level} · {xp} XP</span>
        {pendingBalance > 0 && <span className="pending-chip">{pendingBalance.toLocaleString('en-IN')} pending</span>}
        {isVerified && <span className="verified-chip">Verified</span>}
      </div>
      <div className="balance-sparkline" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>
    </section>
  );
}
