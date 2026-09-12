export function BalanceCard({ balance, xp, level }: { balance: number; xp: number; level: number }) {
  return (
    <section className="card balance-card">
      <div className="card-label">Wallet balance</div>
      <div className="card-value">₹ {balance}</div>
      <div className="card-meta">Level {level} · {xp} XP</div>
    </section>
  );
}
