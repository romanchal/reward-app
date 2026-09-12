export interface Mission { id: string; title: string; description: string; target: number; reward: number; progress: number }

export function DailyMissions({ items, onAdvance }: { items: Mission[]; onAdvance: (id: string) => Promise<void> }) {
  return (
    <section className="card">
      <h2>Daily missions</h2>
      <ul className="mission-list">
        {items.map((m) => (
          <li key={m.id}>
            <div>
              <strong>{m.title}</strong>
              <div className="muted">{m.progress}/{m.target} · +₹ {m.reward}</div>
            </div>
            <button className="btn" onClick={() => onAdvance(m.id)}>+1</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
