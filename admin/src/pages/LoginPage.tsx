import { useState } from 'react';
import { login } from '../lib/api';

export function LoginPage({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password123');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await login(email, password); onDone(); } catch (x: any) { setErr(x.message); }
  };

  return (
    <div className="admin-login">
      <form onSubmit={submit} className="card auth-card">
        <h1>Admin login</h1>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn btn-primary" type="submit">Sign in</button>
      </form>
    </div>
  );
}
