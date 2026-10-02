import type { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: string;
  accent: 'blue' | 'pink' | 'green' | 'yellow';
  icon?: ReactNode;
};

const navItems = ['Top Picks', 'Offers', 'Games'];

const promoCards = [
  { label: 'Grow Reels', tone: 'teal' },
  { label: 'Grow video fast', tone: 'violet' },
  { label: 'Manage Promo', tone: 'slate' },
];

const taskCards = [
  { title: 'Read Article', subtitle: 'Earn upto 10000 coin', accent: 'blue', icon: '📄' },
  { title: 'Watch Video', subtitle: 'Earn upto 10000 coin', accent: 'pink', icon: '🎬' },
  { title: 'Hot Offer', subtitle: 'Boost your wallet', accent: 'green', icon: '🔥' },
  { title: 'Watch Reels', subtitle: 'Earn upto 10000 coin', accent: 'yellow', icon: '🎥' },
];

const bottomTabs = [
  { label: 'Home', icon: '🏠' },
  { label: 'Missions', icon: '🎯' },
  { label: 'Invite', icon: '💌' },
  { label: 'History', icon: '🕘' },
  { label: 'Profile', icon: '👤' },
];

function StatCard({ title, value, accent, icon }: StatCardProps) {
  return (
    <div className={`mini-stat-card ${accent}`}>
      <div className="mini-stat-icon">{icon ?? '•'}</div>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  return (
    <div className="user-dashboard-shell">
      <header className="user-topbar">
        <div className="user-profile-summary">
          <div className="user-avatar">A</div>
          <div>
            <span className="welcome-text">Welcome</span>
            <h3>Aliyah Smith</h3>
          </div>
        </div>

        <div className="user-topbar-actions">
          <button type="button" className="icon-btn" aria-label="Notifications">🔔</button>
          <button type="button" className="icon-btn" aria-label="Refresh">↻</button>
          <div className="balance-pill">💎 9158</div>
        </div>
      </header>

      <nav className="user-tabs" aria-label="Main navigation">
        {navItems.map((item) => (
          <button type="button" key={item} className={`user-tab ${item === 'Top Picks' ? 'active' : ''}`}>
            {item}
          </button>
        ))}
      </nav>

      <section className="promo-strip" aria-label="Promotions">
        {promoCards.map((promo) => (
          <article key={promo.label} className={`promo-card ${promo.tone}`}>
            <span>{promo.label}</span>
          </article>
        ))}
      </section>

      <div className="action-row">
        <button type="button" className="primary-action promote-btn">Promote Website</button>
        <button type="button" className="primary-action buy-btn">Buy Diamonds</button>
      </div>

      <section className="premium-card">
        <div>
          <span className="premium-tag">Premium</span>
          <h4>Unlock Premium Rewards 🎁</h4>
        </div>
        <button type="button" className="premium-btn">👑 Upgrade Now</button>
      </section>

      <section className="stats-strip">
        <StatCard title="Today" value="₹ 2,490" accent="blue" icon="📈" />
        <StatCard title="Mission" value="12" accent="green" icon="✅" />
        <StatCard title="Bonus" value="₹ 890" accent="pink" icon="🎁" />
      </section>

      <section className="task-grid" aria-label="Easy earn tasks">
        {taskCards.map((task) => (
          <article key={task.title} className={`task-card ${task.accent}`}>
            <div className="task-icon">{task.icon}</div>
            <h4>{task.title}</h4>
            <p>{task.subtitle}</p>
          </article>
        ))}
      </section>

      <nav className="bottom-nav" aria-label="Bottom navigation">
        {bottomTabs.map((tab) => (
          <button type="button" key={tab.label} className={`bottom-tab ${tab.label === 'Home' ? 'active' : ''}`}>
            <span>{tab.icon}</span>
            <small>{tab.label}</small>
          </button>
        ))}
      </nav>

      <a href="https://wa.me/1234567890" className="whatsapp-fab" aria-label="Chat on WhatsApp">
        WhatsApp
      </a>
    </div>
  );
}
