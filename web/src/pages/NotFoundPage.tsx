import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="notfound-shell">
      <div className="card notfound-card">
        <span className="notfound-mark" aria-hidden="true">404</span>
        <h1>Nothing here</h1>
        <p>The page you were looking for was moved, removed, or never existed.</p>
        <Link className="btn btn-primary" to="/">Back to dashboard</Link>
      </div>
    </div>
  );
}
