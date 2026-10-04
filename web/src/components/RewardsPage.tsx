import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { apiRequest, formatCurrency } from '../lib/api';
import { Link } from 'react-router-dom';

type GamePrize = {
  id: string;
  label: string;
  amount: number;
  weight: number;
};

type RewardBanner = {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  placement: 'HOME' | 'REWARDS';
  enabled: boolean;
};

type PublicGameConfig = {
  dailyLimit: number;
  scratchPrizes: GamePrize[];
  wheelPrizes: GamePrize[];
  banners: RewardBanner[];
};

type GameState = {
  day: string;
  dailyLimit: number;
  scratchPlays: number;
  spinPlays: number;
  scratchPrize: { label: string; amount: number } | null;
  spinPrize: { label: string; amount: number } | null;
};

const offerSlots = ['Surveys', 'App installs', 'Partner games'];

function drawScratchCover(canvas: HTMLCanvasElement | null) {
  const context = canvas?.getContext('2d', { willReadFrequently: true });
  if (!canvas || !context) return;
  context.globalCompositeOperation = 'source-over';
  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#b6c7bc');
  gradient.addColorStop(1, '#6e8780');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(255, 255, 255, 0.82)';
  context.font = '700 26px Trebuchet MS, sans-serif';
  context.textAlign = 'center';
  context.fillText('SCRATCH TO REVEAL', canvas.width / 2, canvas.height / 2);
}

export default function RewardsPage() {
  const scratchCanvas = useRef<HTMLCanvasElement>(null);
  const scratchActive = useRef(false);
  const adDialog = useRef<HTMLDialogElement>(null);
  const [config, setConfig] = useState<PublicGameConfig | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameError, setGameError] = useState('');
  const [creditNotice, setCreditNotice] = useState('');
  const [scratchBusy, setScratchBusy] = useState(false);
  const [scratchRevealed, setScratchRevealed] = useState(false);
  const [scratchPrize, setScratchPrize] = useState<{ label: string; amount: number } | null>(null);
  const [scratchHint, setScratchHint] = useState('Scratch the cover to reveal a server-selected reward');
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelPrize, setWheelPrize] = useState<{ label: string; amount: number } | null>(null);
  const [adBreak, setAdBreak] = useState<'scratch' | 'spin' | null>(null);
  const dailyLimit = gameState?.dailyLimit ?? config?.dailyLimit ?? 10;
  const scratchPlays = gameState?.scratchPlays ?? 0;
  const spinPlays = gameState?.spinPlays ?? 0;
  const scratchLimitReached = scratchPlays >= dailyLimit;
  const spinLimitReached = spinPlays >= dailyLimit;
  const wheelPrizes = config?.wheelPrizes ?? [];
  const sectorSize = wheelPrizes.length ? 360 / wheelPrizes.length : 60;
  const wheelColors = ['#117c76', '#ed765d', '#d9e987', '#2e6666', '#f3b657', '#a7cfc0'];
  const wheelBackground = wheelPrizes.length
    ? `conic-gradient(from ${-sectorSize / 2}deg, ${wheelPrizes.map((prize, index) => `${wheelColors[index % wheelColors.length]} ${index * sectorSize}deg ${(index + 1) * sectorSize}deg`).join(', ')})`
    : undefined;

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ data: PublicGameConfig }>('/api/rewards/config'),
      apiRequest<{ data: GameState }>('/api/rewards/games/state'),
    ])
      .then(([configResult, stateResult]) => {
        if (!active) return;
        setConfig(configResult.data);
        setGameState(stateResult.data);
        setScratchPrize(stateResult.data.scratchPrize);
        setScratchRevealed(stateResult.data.scratchPlays >= stateResult.data.dailyLimit);
        setWheelPrize(stateResult.data.spinPrize);
      })
      .catch((cause) => { if (active) setGameError(cause instanceof Error ? cause.message : 'Unable to load rewards'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    drawScratchCover(scratchCanvas.current);
  }, []);

  useEffect(() => {
    const dialog = adDialog.current;
    if (!dialog) return;
    if (adBreak && !dialog.open) dialog.showModal();
    if (!adBreak && dialog.open) dialog.close();
  }, [adBreak]);

  async function refreshGameState() {
    const result = await apiRequest<{ data: GameState }>('/api/rewards/games/state');
    setGameState(result.data);
    setScratchPrize(result.data.scratchPrize);
    setWheelPrize(result.data.spinPrize);
  }

  async function revealScratch() {
    if (scratchLimitReached || scratchBusy || loading) return;
    setScratchBusy(true);
    setGameError('');
    try {
      const result = await apiRequest<{ data: { reward: GamePrize; balance: number; playNumber: number; dailyLimit: number } }>('/api/rewards/games/scratch/play', { method: 'POST', body: JSON.stringify({}) });
      setScratchPrize(result.data.reward);
      setScratchRevealed(true);
      setCreditNotice(`${formatCurrency(result.data.reward.amount)} credited. Wallet balance: ${formatCurrency(result.data.balance)}.`);
      setGameState((current) => current ? ({ ...current, scratchPlays: result.data.playNumber, dailyLimit: result.data.dailyLimit, scratchPrize: result.data.reward }) : current);
      setAdBreak('scratch');
    } catch (cause) {
      setGameError(cause instanceof Error ? cause.message : 'Unable to complete scratch card');
      drawScratchCover(scratchCanvas.current);
      try { await refreshGameState(); } catch { /* Keep the original game error visible. */ }
    } finally {
      setScratchBusy(false);
    }
  }

  function scratchAt(event: PointerEvent<HTMLCanvasElement>, start = false) {
    const canvas = scratchCanvas.current;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context || scratchLimitReached || scratchBusy || loading) return;

    if (start) {
      scratchActive.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (!scratchActive.current) return;

    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
    context.globalCompositeOperation = 'destination-out';
    context.beginPath();
    context.arc(x, y, 34, 0, Math.PI * 2);
    context.fill();
  }

  function finishScratch() {
    if (!scratchActive.current) return;
    scratchActive.current = false;
    const canvas = scratchCanvas.current;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return;

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparentPixels = 0;
    let sampledPixels = 0;
    for (let index = 3; index < pixels.length; index += 64) {
      sampledPixels += 1;
      if (pixels[index] < 16) transparentPixels += 1;
    }

    if (transparentPixels / sampledPixels >= 0.38) {
      revealScratch();
    } else {
      setScratchHint('A little more scratching will reveal your demo result');
    }
  }

  function handleScratchKey(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      revealScratch();
    }
  }

  async function spinWheel() {
    if (spinLimitReached || wheelSpinning || loading || !config) return;
    setGameError('');
    setWheelSpinning(true);
    try {
      const result = await apiRequest<{ data: { reward: GamePrize; balance: number; playNumber: number; dailyLimit: number } }>('/api/rewards/games/wheel/play', { method: 'POST', body: JSON.stringify({}) });
      const prizeIndex = Math.max(0, config.wheelPrizes.findIndex((prize) => prize.id === result.data.reward.id));
      setWheelPrize(result.data.reward);
      setCreditNotice(`${formatCurrency(result.data.reward.amount)} credited. Wallet balance: ${formatCurrency(result.data.balance)}.`);
      setGameState((current) => current ? ({ ...current, spinPlays: result.data.playNumber, dailyLimit: result.data.dailyLimit, spinPrize: result.data.reward }) : current);
      setWheelRotation((current) => current + 360 * 5 + ((config.wheelPrizes.length - prizeIndex) % config.wheelPrizes.length) * sectorSize);
    } catch (cause) {
      setWheelSpinning(false);
      setGameError(cause instanceof Error ? cause.message : 'Unable to spin wheel');
      try { await refreshGameState(); } catch { /* Keep the original game error visible. */ }
    }
  }

  function handleAdDialogClose() {
    if (adBreak === 'scratch' && scratchPlays < dailyLimit) {
      setScratchRevealed(false);
      setScratchHint('Scratch the cover to reveal a server-selected reward');
      drawScratchCover(scratchCanvas.current);
    }
    setAdBreak(null);
  }

  function closeAdDialog() {
    if (adDialog.current?.open) adDialog.current.close();
    else handleAdDialogClose();
  }

  return (
    <div className="page-shell rewards-page">
      <header className="rewards-heading">
        <div>
          <span className="kicker">Rewards lounge</span>
          <h2>Play and earn wallet rewards.</h2>
          <p className="muted-copy">Prize values and daily limits are controlled by the server. Every completed play is recorded in your wallet.</p>
        </div>
        <span className="demo-mode-badge"><span /> Wallet credits</span>
      </header>

      {gameError && <div className="form-error" role="alert">{gameError}</div>}
      {creditNotice && <div className="game-credit-notice" role="status"><span>{creditNotice}</span><Link to="/wallet">View wallet</Link></div>}
      {config?.banners.some((banner) => banner.placement === 'REWARDS' && banner.enabled) && <section className="managed-banner-grid rewards-managed-banners" aria-label="Featured offers">{config.banners.filter((banner) => banner.placement === 'REWARDS' && banner.enabled).map((banner) => <a className="managed-banner" href={banner.targetUrl} key={banner.id} target="_blank" rel="noreferrer"><img src={banner.imageUrl} alt={banner.title} loading="lazy" /><span>{banner.title}</span></a>)}</section>}

      <section className="game-grid" aria-label="Daily reward games">
        <article className="game-panel scratch-panel">
          <div className="game-panel-heading">
            <div><span className="game-eyebrow">Daily play</span><h3>Scratch card</h3></div>
            <span className="game-limit">{loading ? 'Loading...' : `${scratchPlays}/${dailyLimit} plays`}</span>
          </div>
          <div className={`scratch-result ${scratchRevealed ? 'is-revealed' : ''}`} aria-live="polite">
            {scratchRevealed && scratchPrize ? <><span>Your reward</span><strong>{scratchPrize.label}</strong><small>{formatCurrency(scratchPrize.amount)}</small></> : <><span>Today's reveal</span><strong>?</strong></>}
          </div>
          <canvas
            ref={scratchCanvas}
            className={`scratch-foil ${scratchRevealed ? 'is-cleared' : ''}`}
            width={720}
            height={300}
            aria-label="Scratch to reveal your reward, or press Enter"
            aria-disabled={scratchLimitReached || loading || scratchBusy}
            role="button"
            tabIndex={scratchLimitReached || loading || scratchBusy ? -1 : 0}
            onPointerDown={(event) => scratchAt(event, true)}
            onPointerMove={(event) => scratchAt(event)}
            onPointerUp={finishScratch}
            onPointerCancel={finishScratch}
            onKeyDown={handleScratchKey}
          />
          <p className="game-hint">{scratchLimitReached ? 'Daily limit reached. Plays reset at midnight UTC.' : scratchBusy ? 'Checking result...' : scratchHint}</p>
        </article>

        <article className="game-panel wheel-panel">
          <div className="game-panel-heading">
            <div><span className="game-eyebrow">Daily play</span><h3>Prize wheel</h3></div>
            <span className="game-limit">{loading ? 'Loading...' : `${spinPlays}/${dailyLimit} spins`}</span>
          </div>
          <div className="wheel-stage">
            <span className="wheel-pointer" aria-hidden="true" />
            <div
              className={`prize-wheel ${wheelSpinning ? 'is-spinning' : ''}`}
              style={{ transform: `rotate(${wheelRotation}deg)`, background: wheelBackground }}
              onTransitionEnd={(event) => {
                if (event.currentTarget === event.target && wheelSpinning) {
                  setWheelSpinning(false);
                  setAdBreak('spin');
                }
              }}
              aria-label="Admin-configured reward wheel"
              role="img"
            >
              {wheelPrizes.map((prize, index) => <span key={prize.id} style={{ transform: `rotate(${index * sectorSize}deg)` }}>{prize.label}</span>)}
            </div>
          </div>
          <button className="primary-btn spin-button" type="button" onClick={() => void spinWheel()} disabled={spinLimitReached || wheelSpinning || loading}>
            {wheelSpinning ? 'Spinning...' : spinLimitReached ? 'Daily limit reached' : 'Spin the wheel'}
          </button>
          <p className="game-hint" aria-live="polite">{spinLimitReached ? 'Daily limit reached. Spins reset at midnight UTC.' : wheelPrize && !wheelSpinning ? `${wheelPrize.label}: ${formatCurrency(wheelPrize.amount)} credited.` : 'Prize and odds are set by the administrator.'}</p>
        </article>
      </section>

      <section className="offerwall-section">
        <div className="section-heading">
          <div><span className="kicker">Offerwall</span><h2>Partner offers</h2></div>
          <span className="integration-badge">Provider connection required</span>
        </div>
        <div className="offerwall-slots">
          {offerSlots.map((slot, index) => (
            <article className="offerwall-slot" key={slot}>
              <span className="offerwall-number">0{index + 1}</span>
              <span className="offerwall-category">Partner inventory</span>
              <h3>{slot}</h3>
              <p>Live offers will appear here after a provider is connected and verified.</p>
              <span className="offerwall-status">Awaiting integration</span>
            </article>
          ))}
        </div>
      </section>

      <section className="ad-section" aria-label="Advertising placements">
        <div className="section-heading">
          <div><span className="kicker">Sponsored</span><h2>Ad placements</h2></div>
          <span className="integration-badge">No ads served</span>
        </div>
        <div className="ad-slot-grid">
          <aside className="ad-slot ad-slot-wide"><span>Advertisement placement</span><strong>Responsive banner slot</strong><small>Inventory will display after an ad provider is configured.</small></aside>
          <aside className="ad-slot ad-slot-compact"><span>Advertisement placement</span><strong>In-feed slot</strong><small>Provider not connected</small></aside>
        </div>
      </section>

      <p className="rewards-disclaimer">Game outcomes and daily limits are server controlled. Every completed play is added to the wallet ledger. Advertising remains a placeholder until an ad provider is connected.</p>

      <dialog ref={adDialog} className="reward-ad-dialog" aria-labelledby="reward-ad-title" data-placement={adBreak ? `rewards-${adBreak}` : undefined} onClose={handleAdDialogClose}>
        <span className="game-eyebrow">Sponsored break · Demo placement</span>
        <h2 id="reward-ad-title">Thanks for playing</h2>
        <div className="ad-slot ad-slot-dialog">
          <span>Advertisement placement</span>
          <strong>Ad provider not connected</strong>
          <small>No ad is being served or tracked in this preview.</small>
        </div>
        <p>This placement is triggered after each completed {adBreak === 'scratch' ? 'scratch card' : 'wheel spin'}. The game reward has already been credited.</p>
        <button className="primary-btn full-width" type="button" onClick={closeAdDialog}>Continue to rewards</button>
      </dialog>
    </div>
  );
}