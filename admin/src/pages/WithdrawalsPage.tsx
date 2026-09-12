import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DataTable } from '../components/DataTable';
import { StatusPill } from '../components/StatusPill';

interface W { id: string; amount: number; method: string; recipient: string; status: string; createdAt: string; user: { email: string; name: string } }

export function WithdrawalsPage() {
  const [items, setItems] = useState<W[]>([]);
  const load = () => api<{ items: W[] }>('/admin/withdrawals').then((r) => setItems(r.items));
  useEffect(() => { load().catch(() => undefined); }, []);
  const act = async (id: string, action: string) => { await api(`/admin/withdrawals/${id}/${action}`, { method: 'POST', body: '{}' }); load(); };
  return (
    <div>
      <h1>Withdrawals</h1>
      <DataTable rows={items} columns={[
        { key: 'user', label: 'User', render: (w) => w.user?.email ?? '—' },
        { key: 'amount', label: 'Amount', render: (w) => `₹ ${w.amount}` },
        { key: 'method', label: 'Method' },
        { key: 'recipient', label: 'Recipient' },
        { key: 'status', label: 'Status', render: (w) => <StatusPill status={w.status} /> },
        { key: 'act', label: 'Actions', render: (w) => (
          <div className="row">
            <button className="btn" onClick={() => act(w.id, 'approve')}>Approve</button>
            <button className="btn" onClick={() => act(w.id, 'process')}>Process</button>
            <button className="btn" onClick={() => act(w.id, 'complete')}>Complete</button>
            <button className="btn" onClick={() => act(w.id, 'reject')}>Reject</button>
          </div>
        ) },
      ]} />
    </div>
  );
}
