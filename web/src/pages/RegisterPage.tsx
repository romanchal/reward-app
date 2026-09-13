import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';

export function RegisterPage() {
  const { register } = useAuth();
  const { notify } = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setSubmitting(true);
    try { await register(email, password, name); notify('Account created · welcome to Reward', 'success'); nav('/'); } catch (x: any) { setErr(x.message); } finally { setSubmitting(false); }
  };

  return (
    <div className="auth-shell">
      <div className="auth-art auth-art-alt" aria-hidden="true"><span>R</span><div /><div /><div /></div>
      <form className="card auth-card" onSubmit={submit}>
        <div className="auth-heading"><span className="brand-mark">R</span><div><h1>Create account</h1><p>Start building your reward streak.</p></div></div>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" /></label>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} autoComplete="new-password" /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Register'}</button>
        <p className="muted auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
