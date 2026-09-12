import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DataTable } from '../components/DataTable';
import { StatusPill } from '../components/StatusPill';

interface F { id: string; type: string; severity: string; score: number; status: string; createdAt: string; user: { email: string } }

export function FraudPage() {
  const [items, setItems] = useState<F[]>([]);
  const load = () => api<{ items: F[] }>('/admin/fraud').then((r) => setItems(r.items));
  useEffect(() => { load().catch(() => undefined); }, []);
  const decide = async (id: string, decision: string) => { await api(`/admin/fraud/${id}/review`, { method: 'POST', body: JSON.stringify({ decision }) }); load(); };
  return (
    <div>
      <h1>Fraud events</h1>
      <DataTable rows={items} columns={[
        { key: 'user', label: 'User', render: (f) => f.user?.email ?? '—' },
        { key: 'type', label: 'Type' },
        { key: 'severity', label: 'Severity' },
        { key: 'score', label: 'Score' },
        { key: 'status', label: 'Status', render: (f) => <StatusPill status={f.status} /> },
        { key: 'act', label: 'Review', render: (f) => (
          <div className="row">
            <button className="btn" onClick={() => decide(f.id, 'CLEAN')}>Clean</button>
            <button className="btn" onClick={() => decide(f.id, 'SUSPICIOUS')}>Suspicious</button>
            <button className="btn" onClick={() => decide(f.id, 'BANNED')}>Ban</button>
          </div>
        ) },
      ]} />
    </div>
  );
}
