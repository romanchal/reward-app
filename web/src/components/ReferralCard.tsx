export function ReferralCard({ code }: { code: string }) {
  const copy = () => navigator.clipboard.writeText(code).catch(() => undefined);
  return (
    <section className="card referral-card">
      <h2>Refer a friend</h2>
      <div className="code-row">
        <code>{code}</code>
        <button className="btn" onClick={copy}>Copy</button>
      </div>
      <p className="muted">Share this code — you earn a bonus when they qualify.</p>
    </section>
  );
}
