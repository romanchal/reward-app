import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await register(email, password, name); nav('/'); } catch (x: any) { setErr(x.message); }
  };

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={submit}>
        <h1>Create account</h1>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></label>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn btn-primary" type="submit">Register</button>
        <p className="muted">Have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
