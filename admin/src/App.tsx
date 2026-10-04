import { Component, type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { apiRequest, clearSession, getSession, loginAdmin, type AdminSession, type AdminSetting, type AdminTask, type AdminUser, type PaymentRequest } from './lib/api';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
	state = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error: unknown) {
		console.error('Admin render error:', error);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{ padding: '32px', fontFamily: 'sans-serif' }}>
					<h1>Reward Admin</h1>
					<p>The admin page ran into a rendering issue. Please refresh.</p>
				</div>
			);
		}

		return this.props.children;
	}
}

type AdminList<T> = { users?: T[]; tasks?: T[]; data?: T[]; total?: number };
type TaskForm = { title: string; description: string; reward: string; status: 'LIVE' | 'DEMO'; isDemo: boolean; link: string; imageUrl: string };
type AuditEntry = { id: string; actorUserId?: string | null; action: string; entityType: string; entityId: string; details?: unknown; createdAt: string };
type YonoPromo = { id: string; code: string; title: string; description: string; terms: string | null; expiresAt: string | null; sourceUrl: string | null; active: boolean; createdAt: string };
type ConfigPrize = { id: string; label: string; amount: number; weight: number };
type ConfigBanner = { id: string; title: string; imageUrl: string; targetUrl: string; placement: 'HOME' | 'REWARDS'; enabled: boolean };
type RewardsConfig = { scratchPrizes: ConfigPrize[]; wheelPrizes: ConfigPrize[]; banners: ConfigBanner[] };
const emptyTask: TaskForm = { title: '', description: '', reward: '', status: 'LIVE', isDemo: false, link: '', imageUrl: '' };

function exportCsv(filename: string, headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
	const quote = (value: string | number | boolean | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
	const csv = [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n');
	const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

function formatAction(action: string) {
	return action.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function formatDetails(details: unknown) {
	if (!details) return '-';
	if (typeof details === 'string') return details;
	try { return JSON.stringify(details); } catch { return '-'; }
}

function LoginPage({ onLogin }: { onLogin: (session: AdminSession) => void }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setError('');
		try {
			onLogin(await loginAdmin(email.trim(), password));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Unable to sign in');
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="admin-auth">
			<section className="admin-auth-box">
				<div className="admin-logo">R</div>
				<span className="eyebrow">Reward operations</span>
				<h1>Admin sign in</h1>
				<p>Use an administrator account to manage the reward platform.</p>
				<form onSubmit={submit}>
					<label>Email<input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
					<label>Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
					{error && <div className="form-error" role="alert">{error}</div>}
					<button className="primary-btn" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
				</form>
			</section>
		</main>
	);
}

function LoadState({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
	if (loading) return <div className="empty-state">Loading records...</div>;
	if (error) return <div className="form-error" role="alert">{error} <button className="text-button" onClick={onRetry}>Retry</button></div>;
	return null;
}

function OverviewPage() {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [tasks, setTasks] = useState<AdminTask[]>([]);
	const [payments, setPayments] = useState<PaymentRequest[]>([]);
	const [activity, setActivity] = useState<AuditEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	async function reload() {
		setLoading(true);
		setError('');
		try {
			const [userResult, taskResult, paymentResult, activityResult] = await Promise.all([
				apiRequest<AdminList<AdminUser>>('/api/user/users'),
				apiRequest<AdminList<AdminTask>>('/api/admin/tasks?limit=100'),
				apiRequest<{ data: PaymentRequest[] }>('/api/admin/payment-requests'),
				apiRequest<{ logs: AuditEntry[] }>('/api/user/audit'),
			]);
			setUsers(userResult.users ?? []);
			setTasks(taskResult.tasks ?? []);
			setPayments(paymentResult.data ?? []);
			setActivity(activityResult.logs ?? []);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Unable to load overview');
		} finally {
			setLoading(false);
		}
	}
	useEffect(() => { void reload(); }, []);
	const metrics = [
		{ label: 'Total users', value: users.length },
		{ label: 'Verified users', value: users.filter((user) => user.isVerified).length },
		{ label: 'Live tasks', value: tasks.filter((task) => task.status === 'LIVE').length },
		{ label: 'Pending payouts', value: payments.filter((payment) => payment.status === 'PENDING').length },
	];
	return (
		<div className="page-shell">
			<div className="page-header"><div><span className="eyebrow">Admin overview</span><h1>Operations dashboard</h1></div><button className="secondary-btn" onClick={() => void reload()}>Refresh data</button></div>
			<LoadState loading={loading} error={error} onRetry={() => void reload()} />
			<div className="metrics-grid">{metrics.map((metric) => <div className="metric-card" key={metric.label}><small>{metric.label}</small><strong>{loading ? '...' : metric.value.toLocaleString()}</strong><span className="metric-caption">Live database count</span></div>)}</div>
			<div className="admin-panel">
				<div className="panel-header"><h2>Recently joined</h2><NavLink className="text-link" to="/users">Manage users</NavLink></div>
				<div className="table-scroll"><table><thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Balance</th></tr></thead><tbody>
					{users.slice(0, 6).map((user) => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small></td><td>{user.role}</td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td>{user.balance.toLocaleString()} INR</td></tr>)}
					{!loading && !error && users.length === 0 && <tr><td colSpan={4} className="empty-state">No users found.</td></tr>}
				</tbody></table></div>
			</div>
			<div className="admin-panel">
				<div className="panel-header"><h2>Recent activity</h2><NavLink className="text-link" to="/activity">View audit log</NavLink></div>
				<div className="activity-list">{activity.slice(0, 5).map((entry) => <div className="activity-row" key={entry.id}><span className="activity-mark" aria-hidden="true" /><div><strong>{formatAction(entry.action)}</strong><small>{entry.entityType} · {entry.entityId}</small></div><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time></div>)}{!loading && !error && activity.length === 0 && <div className="empty-state">No admin activity recorded yet.</div>}</div>
			</div>
		</div>
	);
}

function UsersPage() {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [query, setQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('ALL');
	const [busyId, setBusyId] = useState('');
	const [notice, setNotice] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	async function reload() {
		setLoading(true); setError('');
		try { setUsers((await apiRequest<AdminList<AdminUser>>('/api/user/users')).users ?? []); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load users'); }
		finally { setLoading(false); }
	}
	useEffect(() => { void reload(); }, []);
	async function setUserState(user: AdminUser, action: 'verify' | 'ban') {
		if (action === 'ban' && !user.banned && !window.confirm(`Suspend ${user.email}?`)) return;
		setBusyId(user.id); setNotice(''); setError('');
		try {
			await apiRequest(`/api/user/users/${user.id}/${action}`, { method: 'PATCH', body: JSON.stringify(action === 'verify' ? { isVerified: !user.isVerified } : { banned: !user.banned }) });
			setNotice(action === 'verify' ? 'Verification status updated.' : user.banned ? 'Account restored.' : 'Account suspended.');
			await reload();
		} catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update user'); }
		finally { setBusyId(''); }
	}
	const visibleUsers = users.filter((user) => {
		const matchesQuery = `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase());
		const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && !user.banned) || (statusFilter === 'SUSPENDED' && user.banned) || (statusFilter === 'VERIFIED' && user.isVerified) || (statusFilter === 'UNVERIFIED' && !user.isVerified);
		return matchesQuery && matchesStatus;
	});
	return (
		<div className="page-shell">
			<div className="page-header"><div><span className="eyebrow">User management</span><h1>Community accounts</h1></div><div className="page-actions"><input className="search-input" aria-label="Search users" placeholder="Search name or email" value={query} onChange={(event) => setQuery(event.target.value)} /><select className="filter-select" aria-label="Filter users" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All users</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="VERIFIED">Verified</option><option value="UNVERIFIED">Unverified</option></select><button className="secondary-btn" onClick={() => exportCsv('reward-users.csv', ['Name', 'Email', 'Role', 'Balance', 'Verified', 'Suspended', 'Joined'], visibleUsers.map((user) => [user.name, user.email, user.role, user.balance, user.isVerified, user.banned, user.createdAt]))}>Export CSV</button></div></div>
			{notice && <div className="notice" role="status">{notice}</div>}
			<LoadState loading={loading} error={error} onRetry={() => void reload()} />
			<div className="admin-panel table-panel table-scroll"><table><thead><tr><th>Member</th><th>Role</th><th>Balance</th><th>Verification</th><th>Access</th><th>Actions</th></tr></thead><tbody>
				{visibleUsers.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small></td><td>{user.role}</td><td>{user.balance.toLocaleString()} INR</td><td><span className={`status-pill ${user.isVerified ? 'verified' : 'pending'}`}>{user.isVerified ? 'Verified' : 'Unverified'}</span></td><td><span className={`status-pill ${user.banned ? 'suspended' : 'verified'}`}>{user.banned ? 'Suspended' : 'Active'}</span></td><td className="action-cell"><button className="mini-btn" disabled={busyId === user.id} onClick={() => void setUserState(user, 'verify')}>{user.isVerified ? 'Unverify' : 'Verify'}</button>{user.role !== 'ADMIN' && <button className={`mini-btn ${user.banned ? '' : 'danger'}`} disabled={busyId === user.id} onClick={() => void setUserState(user, 'ban')}>{user.banned ? 'Restore' : 'Suspend'}</button>}</td></tr>)}
				{!loading && !error && visibleUsers.length === 0 && <tr><td colSpan={6} className="empty-state">No matching users.</td></tr>}
			</tbody></table></div>
		</div>
	);
}

function TasksPage() {
	const [tasks, setTasks] = useState<AdminTask[]>([]);
	const [form, setForm] = useState<TaskForm>(emptyTask);
	const [editingId, setEditingId] = useState('');
	const [query, setQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('ALL');
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	async function reload() {
		setLoading(true); setError('');
		try { setTasks((await apiRequest<AdminList<AdminTask>>('/api/admin/tasks?limit=200')).tasks ?? []); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load tasks'); }
		finally { setLoading(false); }
	}
	useEffect(() => { void reload(); }, []);
	function editTask(task: AdminTask) {
		setEditingId(task.id);
		setForm({ title: task.title, description: task.description, reward: String(task.reward), status: task.status, isDemo: task.isDemo, link: task.link ?? '', imageUrl: task.imageUrl ?? '' });
		setNotice('');
	}
	async function saveTask(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); setBusy(true); setError(''); setNotice('');
		const payload = { ...form, reward: Number(form.reward), link: form.link || undefined, imageUrl: form.imageUrl || undefined };
		try {
			await apiRequest(editingId ? `/api/admin/tasks/${editingId}` : '/api/admin/tasks', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
			setNotice(editingId ? 'Task updated.' : 'Task created.'); setEditingId(''); setForm(emptyTask); await reload();
		} catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save task'); }
		finally { setBusy(false); }
	}
	async function deleteTask(task: AdminTask) {
		if (!window.confirm(`Delete "${task.title}"?`)) return;
		setError('');
		try { await apiRequest(`/api/admin/tasks/${task.id}`, { method: 'DELETE' }); setNotice('Task deleted.'); await reload(); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to delete task'); }
	}
	const visibleTasks = tasks.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(query.toLowerCase()) && (statusFilter === 'ALL' || task.status === statusFilter));
	return (
		<div className="page-shell">
			<div className="page-header"><div><span className="eyebrow">Task management</span><h1>Reward tasks</h1></div><div className="page-actions"><input className="search-input" aria-label="Search tasks" placeholder="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} /><select className="filter-select" aria-label="Filter tasks" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="LIVE">Live</option><option value="DEMO">Demo</option></select><button className="secondary-btn" onClick={() => exportCsv('reward-tasks.csv', ['Title', 'Description', 'Reward', 'Status', 'Demo', 'Link', 'Image URL'], visibleTasks.map((task) => [task.title, task.description, task.reward, task.status, task.isDemo, task.link, task.imageUrl]))}>Export CSV</button></div></div>
			{notice && <div className="notice" role="status">{notice}</div>}{error && <div className="form-error" role="alert">{error}</div>}
			<form className="admin-panel task-editor" onSubmit={saveTask}>
				<div className="panel-header"><h2>{editingId ? 'Edit task' : 'Create task'}</h2>{editingId && <button type="button" className="text-button" onClick={() => { setEditingId(''); setForm(emptyTask); }}>Cancel edit</button>}</div>
				<div className="task-form">
					<label>Title<input required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
					<label>Description<input required maxLength={1000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
					<label>Reward<input required type="number" min="1" step="1" value={form.reward} onChange={(event) => setForm({ ...form, reward: event.target.value })} /></label>
					<label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskForm['status'] })}><option value="LIVE">Live</option><option value="DEMO">Demo</option></select></label>
					<button className="primary-btn" disabled={busy}>{busy ? 'Saving...' : editingId ? 'Save task' : 'Create task'}</button>
				</div>
				<div className="task-extra-fields"><label>Link<input type="url" value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} placeholder="https://" /></label><label>Image URL<input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://" /></label><label className="check-label"><input type="checkbox" checked={form.isDemo} onChange={(event) => setForm({ ...form, isDemo: event.target.checked })} /> Demo task</label></div>
			</form>
			<LoadState loading={loading} error={error && !tasks.length ? error : ''} onRetry={() => void reload()} />
			<div className="admin-panel table-panel table-scroll"><table><thead><tr><th>Task</th><th>Reward</th><th>Status</th><th>Type</th><th>Actions</th></tr></thead><tbody>
				{visibleTasks.map((task) => <tr key={task.id}><td><strong>{task.title}</strong><small>{task.description}</small></td><td>{task.reward.toLocaleString()} INR</td><td><span className={`status-pill ${task.status.toLowerCase()}`}>{task.status}</span></td><td>{task.isDemo ? 'Demo' : 'Standard'}</td><td className="action-cell"><button className="mini-btn" onClick={() => editTask(task)}>Edit</button><button className="mini-btn danger" onClick={() => void deleteTask(task)}>Delete</button></td></tr>)}
				{!loading && !error && visibleTasks.length === 0 && <tr><td colSpan={5} className="empty-state">No tasks found.</td></tr>}
			</tbody></table></div>
		</div>
	);
}

function PayoutsPage() {
	const [payments, setPayments] = useState<PaymentRequest[]>([]);
	const [filter, setFilter] = useState('PENDING');
	const [notes, setNotes] = useState<Record<string, string>>({});
	const [busyId, setBusyId] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	async function reload() {
		setLoading(true); setError('');
		try { setPayments((await apiRequest<{ data: PaymentRequest[] }>('/api/admin/payment-requests')).data ?? []); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load payouts'); }
		finally { setLoading(false); }
	}
	useEffect(() => { void reload(); }, []);
	async function decide(request: PaymentRequest, decision: 'APPROVED' | 'REJECTED') {
		if (!window.confirm(`${decision === 'APPROVED' ? 'Approve' : 'Reject'} payout ${request.id}?`)) return;
		setBusyId(request.id); setError(''); setNotice('');
		try {
			await apiRequest(`/api/admin/payment-requests/${request.id}`, { method: 'PATCH', body: JSON.stringify({ decision, note: notes[request.id] || undefined }) });
			setNotice(`Payout ${decision.toLowerCase()}.`); await reload();
		} catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update payout'); }
		finally { setBusyId(''); }
	}
	const visiblePayments = payments.filter((payment) => filter === 'ALL' || payment.status === filter);
	return (
		<div className="page-shell">
			<div className="page-header"><div><span className="eyebrow">Wallet operations</span><h1>Payout approvals</h1></div><select className="filter-select" aria-label="Filter payout status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="PENDING">Pending</option><option value="ALL">All statuses</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></div>
			{notice && <div className="notice" role="status">{notice}</div>}<LoadState loading={loading} error={error} onRetry={() => void reload()} />
			<div className="admin-panel table-panel table-scroll"><table><thead><tr><th>Request</th><th>Member</th><th>Amount</th><th>Method / recipient</th><th>Status</th><th>Decision note</th><th>Actions</th></tr></thead><tbody>
				{visiblePayments.map((payment) => <tr key={payment.id}><td><strong>{payment.id.slice(0, 12)}</strong><small>{new Date(payment.createdAt).toLocaleString()}</small></td><td><strong>{payment.user?.name ?? payment.userId}</strong><small>{payment.user?.email ?? ''}</small></td><td>{payment.amount.toLocaleString()} {payment.currency}</td><td>{payment.method}<small>{payment.recipient}</small></td><td><span className={`status-pill ${payment.status.toLowerCase()}`}>{payment.status}</span></td><td>{payment.status === 'PENDING' ? <input aria-label={`Decision note for ${payment.id}`} value={notes[payment.id] ?? ''} onChange={(event) => setNotes({ ...notes, [payment.id]: event.target.value })} placeholder="Optional" /> : payment.note || '-'}</td><td className="action-cell">{payment.status === 'PENDING' ? <><button className="mini-btn" disabled={busyId === payment.id} onClick={() => void decide(payment, 'APPROVED')}>Approve</button><button className="mini-btn danger" disabled={busyId === payment.id} onClick={() => void decide(payment, 'REJECTED')}>Reject</button></> : 'Processed'}</td></tr>)}
				{!loading && !error && visiblePayments.length === 0 && <tr><td colSpan={7} className="empty-state">No payout requests in this view.</td></tr>}
			</tbody></table></div>
		</div>
	);
}

function SettingsPage() {
	const [settings, setSettings] = useState<AdminSetting[]>([]);
	const [key, setKey] = useState('');
	const [value, setValue] = useState('');
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [editingKey, setEditingKey] = useState('');
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [passwordBusy, setPasswordBusy] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	async function reload() {
		setLoading(true); setError('');
		try { setSettings((await apiRequest<{ data: AdminSetting[] }>('/api/admin/settings')).data ?? []); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load settings'); }
		finally { setLoading(false); }
	}
	useEffect(() => { void reload(); }, []);
	async function saveSetting(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); setBusy(true); setError(''); setNotice('');
		try {
			await apiRequest(`/api/admin/settings/${encodeURIComponent(key.trim())}`, { method: 'PATCH', body: JSON.stringify({ value }) });
			setNotice('Setting saved.'); setKey(''); setValue(''); setEditingKey(''); await reload();
		} catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save setting'); }
		finally { setBusy(false); }
	}
	async function changePassword(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); setError(''); setNotice('');
		if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
		setPasswordBusy(true);
		try {
			await apiRequest('/api/user/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
			setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setNotice('Admin password updated.');
		} catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update password'); }
		finally { setPasswordBusy(false); }
	}
	async function clearCache() {
		setBusy(true); setError(''); setNotice('');
		try { const result = await apiRequest<{ data: { message: string } }>('/api/admin/cache/clear', { method: 'POST', body: JSON.stringify({}) }); setNotice(result.data.message); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to clear cache'); }
		finally { setBusy(false); }
	}
	return (
		<div className="page-shell">
			<div className="page-header"><div><span className="eyebrow">Platform controls</span><h1>Admin settings</h1></div><button className="secondary-btn" disabled={busy} onClick={() => void clearCache()}>Clear reward cache</button></div>
			{notice && <div className="notice" role="status">{notice}</div>}{error && <div className="form-error" role="alert">{error}</div>}
			<form className="admin-panel settings-form" onSubmit={saveSetting}><div className="panel-header"><h2>{editingKey ? `Edit ${editingKey}` : 'Save setting'}</h2>{editingKey && <button className="text-button" type="button" onClick={() => { setEditingKey(''); setKey(''); setValue(''); }}>Cancel</button>}</div><div className="settings-fields"><label>Key<input required pattern="[A-Za-z][A-Za-z0-9._-]{0,63}" title="Start with a letter; use letters, numbers, dots, underscores, or hyphens." value={key} disabled={Boolean(editingKey)} onChange={(event) => setKey(event.target.value)} placeholder="example.setting" /></label><label>Value<input required maxLength={2000} value={value} onChange={(event) => setValue(event.target.value)} /></label><button className="primary-btn" disabled={busy}>{busy ? 'Saving...' : 'Save setting'}</button></div></form>
			<form className="admin-panel settings-form" onSubmit={changePassword}>
				<div className="panel-header"><h2>Change admin password</h2></div>
				<div className="password-fields">
					<label>Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
					<label>New password<input type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
					<label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
					<button className="primary-btn" disabled={passwordBusy}>{passwordBusy ? 'Updating...' : 'Update password'}</button>
				</div>
			</form>
			<LoadState loading={loading} error={error && !settings.length ? error : ''} onRetry={() => void reload()} />
			<div className="admin-panel table-panel table-scroll"><table><thead><tr><th>Setting</th><th>Value</th><th>Last updated</th><th>Action</th></tr></thead><tbody>{settings.map((setting) => <tr key={setting.key}><td><strong>{setting.key}</strong></td><td className="setting-value">{setting.value}</td><td>{new Date(setting.updatedAt).toLocaleString()}</td><td><button className="mini-btn" onClick={() => { setKey(setting.key); setValue(setting.value); setEditingKey(setting.key); }}>Edit</button></td></tr>)}{!loading && !error && settings.length === 0 && <tr><td colSpan={4} className="empty-state">No saved settings.</td></tr>}</tbody></table></div>
		</div>
	);
}

function RewardsConfigPage() {
	const [config, setConfig] = useState<RewardsConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	async function reload() {
		setLoading(true); setError('');
		try { setConfig((await apiRequest<{ data: RewardsConfig }>('/api/admin/rewards/config')).data); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load reward configuration'); }
		finally { setLoading(false); }
	}
	useEffect(() => { void reload(); }, []);
	function updatePrize(kind: 'scratchPrizes' | 'wheelPrizes', index: number, field: 'label' | 'amount' | 'weight', value: string) {
		setConfig((current) => current ? ({
			...current,
			[kind]: current[kind].map((prize, prizeIndex) => prizeIndex === index
				? { ...prize, [field]: field === 'label' ? value : Number(value) }
				: prize),
		}) : current);
	}
	function addPrize(kind: 'scratchPrizes' | 'wheelPrizes') {
		setConfig((current) => current ? ({ ...current, [kind]: [...current[kind], { id: crypto.randomUUID(), label: 'New prize', amount: 0, weight: 1 }] }) : current);
	}
	function removePrize(kind: 'scratchPrizes' | 'wheelPrizes', id: string) {
		setConfig((current) => current ? ({ ...current, [kind]: current[kind].filter((prize) => prize.id !== id) }) : current);
	}
	function updateBanner(index: number, changes: Partial<ConfigBanner>) {
		setConfig((current) => current ? ({ ...current, banners: current.banners.map((banner, bannerIndex) => bannerIndex === index ? { ...banner, ...changes } : banner) }) : current);
	}
	function addBanner() {
		setConfig((current) => current ? ({
			...current,
			banners: [...current.banners, { id: crypto.randomUUID(), title: '', imageUrl: '', targetUrl: '', placement: 'HOME', enabled: true }],
		}) : current);
	}
	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!config) return;
		setBusy(true); setError(''); setNotice('');
		try {
			const result = await apiRequest<{ data: RewardsConfig }>('/api/admin/rewards/config', { method: 'PUT', body: JSON.stringify(config) });
			setConfig(result.data); setNotice('Reward prices, odds, and banners saved.');
		} catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save reward configuration'); }
		finally { setBusy(false); }
	}
	function renderPrizeEditor(kind: 'scratchPrizes' | 'wheelPrizes', title: string, description: string) {
		const prizes = config?.[kind] ?? [];
		return (
			<section className="reward-config-section">
				<div className="panel-header"><div><h2>{title}</h2><p>{description}</p></div><button className="secondary-btn" type="button" disabled={prizes.length >= 12} onClick={() => addPrize(kind)}>Add prize</button></div>
			<div className="reward-prize-list">
				{prizes.map((prize, index) => <div className="reward-prize-row" key={prize.id}>
					<label>Label<input required maxLength={40} value={prize.label} onChange={(event) => updatePrize(kind, index, 'label', event.target.value)} /></label>
					<label>Wallet credit (INR)<input required type="number" min="0" max="10000" step="1" value={prize.amount} onChange={(event) => updatePrize(kind, index, 'amount', event.target.value)} /></label>
					<label>Weight<input required type="number" min="1" max="1000000" step="1" value={prize.weight} onChange={(event) => updatePrize(kind, index, 'weight', event.target.value)} /></label>
					<button className="mini-btn danger" type="button" aria-label={`Remove ${prize.label}`} disabled={prizes.length <= 1} onClick={() => removePrize(kind, prize.id)}>Remove</button>
				</div>)}
			</div>
		</section>
		);
	}
	return (
		<div className="page-shell">
			<div className="page-header"><div><span className="eyebrow">Reward controls</span><h1>Games & banners</h1></div><button className="secondary-btn" type="button" onClick={() => void reload()}>Refresh</button></div>
			<p className="muted-copy">Set server-drawn prize values and relative odds. Each account is capped at 10 scratch plays and 10 spins per UTC day. Credits post to the wallet ledger on play.</p>
			{notice && <div className="notice" role="status">{notice}</div>}{error && <div className="form-error" role="alert">{error}</div>}
			<LoadState loading={loading} error={error && !config ? error : ''} onRetry={() => void reload()} />
			{config && <form className="reward-config-form" onSubmit={save}>
				{renderPrizeEditor('scratchPrizes', 'Scratch card prizes', 'Weights are relative probabilities; amount is the INR wallet credit.')}
				{renderPrizeEditor('wheelPrizes', 'Wheel prizes', 'The server selects a weighted prize and credits it atomically.')}
				<section className="reward-config-section">
					<div className="panel-header"><div><h2>Promotional banners</h2><p>Manage banners shown on the home page or rewards page.</p></div><button className="secondary-btn" type="button" disabled={config.banners.length >= 20} onClick={addBanner}>Add banner</button></div>
					{config.banners.length === 0 && <div className="empty-state">No banners configured.</div>}
					<div className="reward-banner-list">{config.banners.map((banner, index) => <article className="reward-banner-editor" key={banner.id}>
						<div className="panel-header"><h3>Banner {index + 1}</h3><button className="mini-btn danger" type="button" onClick={() => setConfig((current) => current ? ({ ...current, banners: current.banners.filter((item) => item.id !== banner.id) }) : current)}>Remove</button></div>
						<div className="reward-banner-fields">
							<label>Title<input required maxLength={100} value={banner.title} onChange={(event) => updateBanner(index, { title: event.target.value })} /></label>
							<label>Placement<select value={banner.placement} onChange={(event) => updateBanner(index, { placement: event.target.value as ConfigBanner['placement'] })}><option value="HOME">Home</option><option value="REWARDS">Rewards</option></select></label>
							<label>Image URL<input required type="url" value={banner.imageUrl} onChange={(event) => updateBanner(index, { imageUrl: event.target.value })} placeholder="https://example.com/banner.webp" /></label>
							<label>Destination URL<input required type="url" value={banner.targetUrl} onChange={(event) => updateBanner(index, { targetUrl: event.target.value })} placeholder="https://example.com/offer" /></label>
							<label className="check-label"><input type="checkbox" checked={banner.enabled} onChange={(event) => updateBanner(index, { enabled: event.target.checked })} /> Banner enabled</label>
						</div>
					</article>)}</div>
				</section>
				<div className="reward-config-submit"><button className="primary-btn" disabled={busy}>{busy ? 'Saving configuration...' : 'Save games and banners'}</button></div>
			</form>}
		</div>
	);
}

function ActivityPage() {
	const [logs, setLogs] = useState<AuditEntry[]>([]);
	const [query, setQuery] = useState('');
	const [actionFilter, setActionFilter] = useState('ALL');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	async function reload() {
		setLoading(true); setError('');
		try { setLogs((await apiRequest<{ logs: AuditEntry[] }>('/api/user/audit')).logs ?? []); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load activity'); }
		finally { setLoading(false); }
	}
	useEffect(() => { void reload(); }, []);
	const actions = [...new Set(logs.map((log) => log.action))].sort();
	const visibleLogs = logs.filter((log) => {
		const details = formatDetails(log.details);
		const matchesQuery = `${log.action} ${log.entityType} ${log.entityId} ${log.actorUserId ?? ''} ${details}`.toLowerCase().includes(query.toLowerCase());
		return matchesQuery && (actionFilter === 'ALL' || log.action === actionFilter);
	});
	return (
		<div className="page-shell">
			<div className="page-header"><div><span className="eyebrow">Governance</span><h1>Admin activity</h1></div><div className="page-actions"><input className="search-input" aria-label="Search activity" placeholder="Search activity" value={query} onChange={(event) => setQuery(event.target.value)} /><select className="filter-select" aria-label="Filter activity type" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}><option value="ALL">All activity</option>{actions.map((action) => <option value={action} key={action}>{formatAction(action)}</option>)}</select><button className="secondary-btn" onClick={() => exportCsv('reward-admin-activity.csv', ['Time', 'Action', 'Entity type', 'Entity ID', 'Actor ID', 'Details'], visibleLogs.map((log) => [log.createdAt, log.action, log.entityType, log.entityId, log.actorUserId, formatDetails(log.details)]))}>Export CSV</button></div></div>
			<LoadState loading={loading} error={error} onRetry={() => void reload()} />
			<div className="admin-panel table-panel table-scroll"><table><thead><tr><th>Time</th><th>Action</th><th>Target</th><th>Actor</th><th>Details</th></tr></thead><tbody>
				{visibleLogs.map((log) => <tr key={log.id}><td><time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString()}</time></td><td><span className="activity-action">{formatAction(log.action)}</span></td><td>{log.entityType}<small>{log.entityId}</small></td><td>{log.actorUserId ?? 'System'}</td><td className="activity-detail">{formatDetails(log.details)}</td></tr>)}
				{!loading && !error && visibleLogs.length === 0 && <tr><td colSpan={5} className="empty-state">No activity matches this view.</td></tr>}
			</tbody></table></div>
		</div>
	);
}

function PromosPage() {
	const [promos, setPromos] = useState<YonoPromo[]>([]);
	const [code, setCode] = useState('');
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [terms, setTerms] = useState('');
	const [expiresAt, setExpiresAt] = useState('');
	const [sourceUrl, setSourceUrl] = useState('');
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	async function reload() {
		setLoading(true); setError('');
		try { setPromos((await apiRequest<{ data: YonoPromo[] }>('/api/admin/promos/yono-rummy')).data ?? []); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load promo codes'); }
		finally { setLoading(false); }
	}
	useEffect(() => { void reload(); }, []);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault(); setBusy(true); setError(''); setNotice('');
		try {
			await apiRequest('/api/admin/promos/yono-rummy', { method: 'POST', body: JSON.stringify({ code: code.trim(), title: title || undefined, description: description || undefined, terms: terms || undefined, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined, sourceUrl: sourceUrl || undefined }) });
			setCode(''); setTitle(''); setDescription(''); setTerms(''); setExpiresAt(''); setSourceUrl(''); setNotice('Promo code published.'); await reload();
		} catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to publish promo code'); }
		finally { setBusy(false); }
	}
	async function disablePromo(promo: YonoPromo) {
		if (!window.confirm(`Disable promo code ${promo.code}?`)) return;
		setError(''); setNotice('');
		try { await apiRequest(`/api/admin/promos/yono-rummy/${promo.id}`, { method: 'DELETE' }); setNotice(`${promo.code} disabled.`); await reload(); }
		catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to disable promo'); }
	}
	return (
		<div className="page-shell">
			<div className="page-header"><div><span className="eyebrow">Bot-fed offers</span><h1>Yono Rummy codes</h1></div><button className="secondary-btn" onClick={() => void reload()}>Refresh</button></div>
			<p className="muted-copy">The bot can publish or refresh a code through the protected promo endpoint. Expired and disabled entries stay in the audit history.</p>
			{notice && <div className="notice" role="status">{notice}</div>}{error && <div className="form-error" role="alert">{error}</div>}
			<form className="admin-panel promo-admin-form" onSubmit={submit}>
				<div className="panel-header"><h2>Publish a code</h2><span className="status-pill live">Admin protected</span></div>
				<div className="promo-admin-fields">
					<label>Promo code<input required minLength={3} maxLength={40} pattern="[A-Za-z0-9_\\-]+" value={code} onChange={(event) => setCode(event.target.value)} placeholder="YONO123" /></label>
					<label>Title<input maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Welcome bonus" /></label>
					<label>Expires at<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
					<label className="promo-admin-wide">Description<input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Offer summary" /></label>
					<label className="promo-admin-wide">Terms<input maxLength={1000} value={terms} onChange={(event) => setTerms(event.target.value)} placeholder="Eligibility or usage terms" /></label>
					<label className="promo-admin-wide">Source post URL<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://t.me/..." /></label>
					<button className="primary-btn" disabled={busy}>{busy ? 'Publishing...' : 'Publish code'}</button>
				</div>
			</form>
			<LoadState loading={loading} error={error && !promos.length ? error : ''} onRetry={() => void reload()} />
			<div className="admin-panel table-panel table-scroll"><table><thead><tr><th>Code</th><th>Title</th><th>Status</th><th>Expiry</th><th>Source</th><th>Action</th></tr></thead><tbody>
				{promos.map((promo) => { const expired = Boolean(promo.expiresAt && new Date(promo.expiresAt).getTime() <= Date.now()); return <tr key={promo.id}><td><code>{promo.code}</code></td><td>{promo.title}<small>{promo.description}</small></td><td><span className={`status-pill ${!promo.active ? 'rejected' : expired ? 'pending' : 'live'}`}>{!promo.active ? 'Disabled' : expired ? 'Expired' : 'Active'}</span></td><td>{promo.expiresAt ? new Date(promo.expiresAt).toLocaleString() : 'No expiry'}</td><td>{promo.sourceUrl ? <a className="text-link" href={promo.sourceUrl} target="_blank" rel="noreferrer">Open source</a> : '-'}</td><td>{promo.active && !expired ? <button className="mini-btn danger" onClick={() => void disablePromo(promo)}>Disable</button> : '-'}</td></tr>; })}
				{!loading && !error && promos.length === 0 && <tr><td colSpan={6} className="empty-state">No Yono Rummy codes have been sent yet.</td></tr>}
			</tbody></table></div>
		</div>
	);
}

function AdminLayout({ session, onLogout }: { session: AdminSession; onLogout: () => void }) {
	return (
		<div className="admin-shell">
			<aside className="sidebar">
				<div className="brand-wrap admin-brand"><div className="brand-mark">R</div><span>Reward Admin</span></div>
				<nav className="sidebar-nav"><NavLink to="/">Overview</NavLink><NavLink to="/users">Users</NavLink><NavLink to="/tasks">Tasks</NavLink><NavLink to="/payouts">Payouts</NavLink><NavLink to="/promos">Promo codes</NavLink><NavLink to="/rewards">Rewards & banners</NavLink><NavLink to="/activity">Activity</NavLink><NavLink to="/settings">Settings</NavLink></nav>
				<div className="sidebar-footer"><span>Signed in as</span><strong>{session.email}</strong><button type="button" onClick={onLogout}>Sign out</button></div>
			</aside>
			<main className="admin-main">
				<header className="topbar admin-topbar"><div className="topbar-title"><span className="eyebrow">Control center</span><h2>Operations hub</h2></div><span className="live-indicator"><i /> Live data</span></header>
				<Routes><Route path="/" element={<OverviewPage />} /><Route path="/users" element={<UsersPage />} /><Route path="/tasks" element={<TasksPage />} /><Route path="/payouts" element={<PayoutsPage />} /><Route path="/promos" element={<PromosPage />} /><Route path="/rewards" element={<RewardsConfigPage />} /><Route path="/activity" element={<ActivityPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<div className="admin-panel"><h2>Page not found</h2><NavLink to="/">Back to overview</NavLink></div>} /></Routes>
			</main>
		</div>
	);
}

export default function App() {
	const [session, setSession] = useState<AdminSession | null>(() => getSession());
	function logout() { clearSession(); setSession(null); }
	return <ErrorBoundary><BrowserRouter>{session ? <AdminLayout session={session} onLogout={logout} /> : <LoginPage onLogin={setSession} />}</BrowserRouter></ErrorBoundary>;
}
