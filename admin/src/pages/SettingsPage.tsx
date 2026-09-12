import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DataTable } from '../components/DataTable';

interface S { key: string; value: unknown; updatedAt: string }

export function SettingsPage() {
  const [items, setItems] = useState<S[]>([]);
  const [form, setForm] = useState({ key: '', value: '' });
  const load = () => api<{ items: S[] }>('/admin/settings').then((r) => setItems(r.items));
  useEffect(() => { load().catch(() => undefined); }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsed: unknown = form.value;
    try { parsed = JSON.parse(form.value); } catch {}
    await api('/admin/settings', { method: 'POST', body: JSON.stringify({ key: form.key, value: parsed }) });
    setForm({ key: '', value: '' });
    load();
  };
  return (
    <div>
      <h1>Settings</h1>
      <form onSubmit={save} className="row-form">
        <input placeholder="key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required />
        <input placeholder="value (JSON)" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
        <button className="btn btn-primary">Save</button>
      </form>
      <DataTable rows={items.map((s, i) => ({ ...s, id: i }))} columns={[
        { key: 'key', label: 'Key' },
        { key: 'value', label: 'Value', render: (s) => <code>{JSON.stringify(s.value)}</code> },
        { key: 'updatedAt', label: 'Updated' },
      ]} />
    </div>
  );
}
