import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { DataTable } from '../components/DataTable';

interface U { id: string; email: string; name: string; role: string; banned: boolean; balance: number; createdAt: string }

export function UsersPage() {
  const [items, setItems] = useState<U[]>([]);
  const load = () => api<{ items: U[] }>('/admin/users').then((r) => setItems(r.items));
  useEffect(() => { load().catch(() => undefined); }, []);
  const toggle = async (id: string, banned: boolean) => {
    await api(`/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ banned }) });
    load();
  };
  return (
    <div>
      <h1>Users</h1>
      <DataTable rows={items} columns={[
        { key: 'email', label: 'Email' },
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'balance', label: 'Balance', render: (u) => `₹ ${u.balance}` },
        { key: 'banned', label: 'Status', render: (u) => u.banned ? 'Banned' : 'Active' },
        { key: 'act', label: 'Action', render: (u) => (
          <button className="btn" onClick={() => toggle(u.id, !u.banned)}>{u.banned ? 'Restore' : 'Ban'}</button>
        ) },
      ]} />
    </div>
  );
}
