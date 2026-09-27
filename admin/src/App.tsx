import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';

const metrics = [
	{ label: 'Total users', value: '24.8K', delta: '+12.4%' },
	{ label: 'Wallet volume', value: '₹4.2M', delta: '+8.1%' },
	{ label: 'Tasks completed', value: '14.3K', delta: '+19.7%' },
	{ label: 'Withdrawal pending', value: '182', delta: '-3.2%' },
];

const tasks = [
	{ title: 'Profile setup', reward: 120, status: 'Active', type: 'Onboarding' },
	{ title: 'Watch tutorial', reward: 90, status: 'Live', type: 'Education' },
	{ title: 'Daily check-in', reward: 45, status: 'Active', type: 'Retention' },
	{ title: 'Invite bonus', reward: 200, status: 'Draft', type: 'Referral' },
];

const users = [
	{ name: 'Aisha S.', email: 'aisha@example.com', role: 'User', wallet: '₹4,320', status: 'Verified' },
	{ name: 'Rohit K.', email: 'rohit@example.com', role: 'User', wallet: '₹1,870', status: 'Pending' },
	{ name: 'Maya P.', email: 'maya@example.com', role: 'Admin', wallet: '₹9,480', status: 'Verified' },
	{ name: 'Dylan C.', email: 'dylan@example.com', role: 'User', wallet: '₹2,920', status: 'Verified' },
];

const payouts = [
	{ user: 'Nia R.', amount: '₹1,250', method: 'UPI', status: 'Pending' },
	{ user: 'Omar T.', amount: '₹2,080', method: 'Bank', status: 'Approved' },
	{ user: 'Priya L.', amount: '₹860', method: 'Wallet', status: 'Processing' },
];

function OverviewPage() {
	return (
		<div className="page-shell">
			<div className="page-header">
				<div>
					<span className="eyebrow">Admin overview</span>
					<h1>Operations dashboard</h1>
				</div>
				<button className="primary-btn small">Export report</button>
			</div>

			<div className="metrics-grid">
				{metrics.map((item) => (
					<div className="metric-card" key={item.label}>
						<small>{item.label}</small>
						<strong>{item.value}</strong>
						<span>{item.delta}</span>
					</div>
				))}
			</div>

			<div className="admin-grid">
				<div className="admin-panel">
					<div className="panel-header">
						<h3>Campaign performance</h3>
						<span className="badge success">+18.6%</span>
					</div>
					<div className="chart-box">
						<div className="bar-group">
							<span style={{ height: '25%' }} />
							<span style={{ height: '42%' }} />
							<span style={{ height: '61%' }} />
							<span style={{ height: '73%' }} />
							<span style={{ height: '88%' }} />
							<span style={{ height: '96%' }} />
						</div>
					</div>
				</div>

				<div className="admin-panel">
					<div className="panel-header">
						<h3>Quick actions</h3>
					</div>
					<div className="quick-stack">
						<button className="secondary-btn full-width">Create campaign</button>
						<button className="secondary-btn full-width">Review payouts</button>
						<button className="secondary-btn full-width">Flag suspicious users</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function TasksPage() {
	return (
		<div className="page-shell">
			<div className="page-header">
				<div>
					<span className="eyebrow">Task management</span>
					<h1>Reward tasks</h1>
				</div>
				<button className="primary-btn small">New task</button>
			</div>

			<div className="table-panel admin-panel">
				<table>
					<thead>
						<tr>
							<th>Title</th>
							<th>Type</th>
							<th>Reward</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{tasks.map((task) => (
							<tr key={task.title}>
								<td>{task.title}</td>
								<td>{task.type}</td>
								<td>₹{task.reward}</td>
								<td>
									<span className="status-pill" data-state={task.status.toLowerCase()}>
										{task.status}
									</span>
								</td>
								<td>
									<button className="mini-btn">Edit</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function UsersPage() {
	return (
		<div className="page-shell">
			<div className="page-header">
				<div>
					<span className="eyebrow">User management</span>
					<h1>Community accounts</h1>
				</div>
			</div>

			<div className="table-panel admin-panel">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Role</th>
							<th>Wallet</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{users.map((user) => (
							<tr key={user.email}>
								<td>{user.name}</td>
								<td>{user.email}</td>
								<td>{user.role}</td>
								<td>{user.wallet}</td>
								<td>
									<span
										className="status-pill"
										data-state={user.status === 'Verified' ? 'verified' : 'pending'}
									>
										{user.status}
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function PayoutsPage() {
	return (
		<div className="page-shell">
			<div className="page-header">
				<div>
					<span className="eyebrow">Withdrawals</span>
					<h1>Payout review</h1>
				</div>
			</div>

			<div className="table-panel admin-panel">
				<table>
					<thead>
						<tr>
							<th>User</th>
							<th>Amount</th>
							<th>Method</th>
							<th>Status</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{payouts.map((item) => (
							<tr key={item.user}>
								<td>{item.user}</td>
								<td>{item.amount}</td>
								<td>{item.method}</td>
								<td>
									<span className="status-pill" data-state={item.status.toLowerCase()}>
										{item.status}
									</span>
								</td>
								<td>
									<button className="mini-btn">Review</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function AdminLayout() {
	return (
		<div className="admin-shell">
			<aside className="sidebar">
				<div className="brand-wrap admin-brand">
					<div className="brand-mark">R</div>
					<span>Reward Admin</span>
				</div>

				<nav className="sidebar-nav">
					<NavLink to="/">Overview</NavLink>
					<NavLink to="/tasks">Tasks</NavLink>
					<NavLink to="/users">Users</NavLink>
					<NavLink to="/payouts">Payouts</NavLink>
				</nav>
			</aside>

			<main className="admin-main">
				<header className="topbar admin-topbar">
					<div className="topbar-title">
						<span className="eyebrow">Control center</span>
						<h2>Operations hub</h2>
					</div>
					<button className="primary-btn small">New campaign</button>
				</header>

				<Routes>
					<Route path="/" element={<OverviewPage />} />
					<Route path="/tasks" element={<TasksPage />} />
					<Route path="/users" element={<UsersPage />} />
					<Route path="/payouts" element={<PayoutsPage />} />
				</Routes>
			</main>
		</div>
	);
}

export default function App() {
	return (
		<BrowserRouter>
			<AdminLayout />
		</BrowserRouter>
	);
}
