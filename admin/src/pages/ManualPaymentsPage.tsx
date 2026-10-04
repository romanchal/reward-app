import { useEffect, useState } from 'react';
import { api, getToken } from '../lib/api';
import { DataTable } from '../components/DataTable';
import { StatusPill } from '../components/StatusPill';

interface MP {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  referenceId: string;
  status: string;
  createdById: string;
  approvedById?: string | null;
  createdAt: string;
  notes?: string | null;
}

export function ManualPaymentsPage() {
  const [items, setItems] = useState<MP[]>([]);
  const [form, setForm] = useState({ userId: '', amount: 0, method: 'CASH', referenceId: '', proofUrl: '', notes: '' });
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api<{ items: MP[] }>('/admin/manual-payments').then((r) => setItems(r.items));
  useEffect(() => { load().catch(() => undefined); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      const body: Record<string, unknown> = {
        userId: form.userId,
        amount: Number(form.amount),
        method: form.method,
        referenceId: form.referenceId,
      };
      if (form.proofUrl) body.proofUrl = form.proofUrl;
      if (form.notes) body.notes = form.notes;
      await api('/admin/manual-payments', { method: 'POST', body: JSON.stringify(body) });
      setForm({ userId: '', amount: 0, method: 'CASH', referenceId: '', proofUrl: '', notes: '' });
      setMsg('Created · awaiting checker approval');
      load();
    } catch (e: any) { setMsg(e.message); }
  };

  const act = async (id: string, action: 'approve' | 'reject') => {
    try {
      const body = action === 'reject' ? JSON.stringify({ reason: prompt('Rejection reason?') || 'rejected' }) : '{}';
      await api(`/admin/manual-payments/${id}/${action}`, { method: 'POST', body });
      load();
    } catch (e: any) { setMsg(e.message); }
  };

  const openReceipt = async (id: string) => {
    try {
      const token = getToken();
      const res = await fetch(`/api/admin/manual-payments/${id}/receipt`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (e: any) { setMsg(e.message); }
  };

  const importCsv = async () => {
    setMsg('');
    try {
      const res = await api<{ total: number; results: Array<{ ok: boolean }> }>('/admin/manual-payments/csv-import', {
        method: 'POST',
        body: JSON.stringify({ csv }),
      });
      const ok = res.results.filter((r) => r.ok).length;
      setMsg(`CSV import: ${ok}/${res.total} ok`);
      setCsv('');
      load();
    } catch (e: any) { setMsg(e.message); }
  };

  return (
    <div>
      <h1>Manual payments</h1>
      {msg && <p className="muted">{msg}</p>}

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Record offline payment</h2>
        <form onSubmit={create} className="row-form">
          <input placeholder="userId" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required />
          <input type="number" placeholder="amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required min={1} />
          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option>CASH</option><option>BANK</option><option>CHEQUE</option><option>UPI</option><option>OTHER</option>
          </select>
          <input placeholder="reference ID" value={form.referenceId} onChange={(e) => setForm({ ...form, referenceId: e.target.value })} required />
          <input placeholder="proof URL (optional)" value={form.proofUrl} onChange={(e) => setForm({ ...form, proofUrl: e.target.value })} />
          <input placeholder="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="btn btn-primary" type="submit">Create (pending)</button>
        </form>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>CSV bulk import</h2>
        <p className="muted">Header row: <code>userId,amount,method,referenceId,currency,proofUrl,notes</code></p>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} style={{ width: '100%', fontFamily: 'monospace', padding: 8 }} />
        <button className="btn" onClick={importCsv} disabled={!csv.trim()}>Import</button>
      </section>

      <DataTable rows={items} columns={[
        { key: 'referenceId', label: 'Reference' },
        { key: 'userId', label: 'User' },
        { key: 'amount', label: 'Amount', render: (p) => `${p.currency} ${p.amount}` },
        { key: 'method', label: 'Method' },
        { key: 'status', label: 'Status', render: (p) => <StatusPill status={p.status} /> },
        { key: 'createdById', label: 'Maker' },
        { key: 'approvedById', label: 'Checker', render: (p) => p.approvedById ?? '—' },
        { key: 'act', label: 'Actions', render: (p) => (
          <div className="row">
            {p.status === 'PENDING_APPROVAL' && <>
              <button className="btn" onClick={() => act(p.id, 'approve')}>Approve</button>
              <button className="btn" onClick={() => act(p.id, 'reject')}>Reject</button>
            </>}
            <button className="btn" onClick={() => openReceipt(p.id)}>Receipt</button>
          </div>
        ) },
      ]} />
    </div>
  );
}
