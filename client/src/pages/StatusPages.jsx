import { Link } from 'react-router-dom';
import { Compass, ShieldAlert } from 'lucide-react';

export function NotFound() {
  return (
    <div className="status-page">
      <Compass size={40} aria-hidden="true" />
      <h1>404</h1>
      <p className="muted">This page wandered off the loop.</p>
      <Link to="/" className="btn btn-primary">
        Go home
      </Link>
    </div>
  );
}

export function Forbidden() {
  return (
    <div className="status-page">
      <ShieldAlert size={40} aria-hidden="true" />
      <h1>403</h1>
      <p className="muted">You don't have permission to view this page.</p>
      <Link to="/dashboard" className="btn btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
