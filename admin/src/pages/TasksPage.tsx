import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DataTable } from '../components/DataTable';

interface T { id: string; title: string; reward: number; xp: number; status: string; isDemo: boolean }

export function TasksPage() {
  const [items, setItems] = useState<T[]>([]);
  const [form, setForm] = useState({ title: '', reward: 25, xp: 10, isDemo: true });
  const load = () => api<{ items: T[] }>('/admin/tasks').then((r) => setItems(r.items));
  useEffect(() => { load().catch(() => undefined); }, []);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/admin/tasks', { method: 'POST', body: JSON.stringify(form) });
    setForm({ title: '', reward: 25, xp: 10, isDemo: true });
    load();
  };
  const disable = async (id: string) => { await api(`/admin/tasks/${id}/disable`, { method: 'POST', body: '{}' }); load(); };
  return (
    <div>
      <h1>Tasks</h1>
      <form onSubmit={create} className="row-form">
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input type="number" value={form.reward} onChange={(e) => setForm({ ...form, reward: Number(e.target.value) })} required />
        <input type="number" value={form.xp} onChange={(e) => setForm({ ...form, xp: Number(e.target.value) })} />
        <label><input type="checkbox" checked={form.isDemo} onChange={(e) => setForm({ ...form, isDemo: e.target.checked })} /> Demo</label>
        <button className="btn btn-primary">Create</button>
      </form>
      <DataTable rows={items} columns={[
        { key: 'title', label: 'Title' },
        { key: 'reward', label: 'Reward', render: (t) => `₹ ${t.reward}` },
        { key: 'xp', label: 'XP' },
        { key: 'status', label: 'Status' },
        { key: 'act', label: '', render: (t) => <button className="btn" onClick={() => disable(t.id)}>Disable</button> },
      ]} />
    </div>
  );
}
