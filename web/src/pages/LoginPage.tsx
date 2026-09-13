import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';

export function LoginPage() {
  const { login } = useAuth();
  const { notify } = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState('demo1@example.com');
  const [password, setPassword] = useState('password123');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setSubmitting(true);
    try { await login(email, password); notify('Welcome back', 'success'); nav('/'); } catch (x: any) { setErr(x.message); } finally { setSubmitting(false); }
  };

  return (
    <div className="auth-shell">
      <div className="auth-art" aria-hidden="true"><span>R</span><div /><div /><div /></div>
      <form className="card auth-card" onSubmit={submit}>
        <div className="auth-heading"><span className="brand-mark">R</span><div><h1>Welcome back</h1><p>Sign in to continue earning.</p></div></div>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
        <p className="auth-note">Demo login is prefilled · no real payments happen.</p>
        <p className="muted auth-switch">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
