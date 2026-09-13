import { formatCurrency } from '../lib/format';

export interface Offer {
  id: string;
  title: string;
  description: string;
  reward: number;
  url?: string;
  country?: string;
  isDemo?: boolean;
  provider?: { name?: string };
}

export function OfferCard({ offer }: { offer: Offer }) {
  const openOffer = () => {
    if (offer.url) window.open(offer.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <article className="card offer-card">
      <div className="offer-topline">
        <span className="offer-source">{offer.provider?.name ?? 'Offer'} · {offer.country ?? 'IN'}</span>
        {offer.isDemo && <span className="demo-tag">Demo</span>}
      </div>
      <h3>{offer.title}</h3>
      <p>{offer.description}</p>
      <div className="offer-footer">
        <span className="reward-pill">{formatCurrency(offer.reward)}</span>
        <button className="btn btn-primary btn-small" onClick={openOffer} disabled={!offer.url}>View offer</button>
      </div>
    </article>
  );
}
