import { useState } from 'react';
import { useToast } from './Toast';

export function ReferralCard({ code }: { code: string }) {
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      notify('Referral code copied', 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('Copy failed — select the code manually', 'error');
    }
  };

  const share = async () => {
    const shareData = { title: 'Reward App', text: `Join me on Reward App. Use code ${code}.` };
    if ('share' in navigator && typeof navigator.share === 'function') {
      try { await navigator.share(shareData); } catch { /* user dismissed */ }
    } else {
      await copy();
    }
  };

  return (
    <section className="card referral-card">
      <div className="referral-heading">
        <div>
          <h2>Invite your circle</h2>
          <p>Share your code and grow together.</p>
        </div>
        <span className="referral-mark" aria-hidden="true">↗</span>
      </div>
      <div className="code-row">
        <code>{code}</code>
        <button className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        {('share' in navigator && typeof navigator.share === 'function') && <button className="btn btn-primary" onClick={share}>Share</button>}
      </div>
      <p className="muted">Referral rewards are credited only after the invited account qualifies.</p>
    </section>
  );
}
