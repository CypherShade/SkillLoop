import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth } from '../features/auth/authSlice';
import { PageLoader } from '../components/ui';

// Navigation guards. While auto-login is still running ('checking') we wait instead of
// redirecting, so a page reload never sends a logged-in user to /login.

export function ProtectedRoute() {
  const { status } = useSelector(selectAuth);
  const location = useLocation();
  if (status === 'checking') return <PageLoader label="Restoring your session..." />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function RoleRoute({ roles }) {
  const { user } = useSelector(selectAuth);
  if (!roles.includes(user?.role)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { status } = useSelector(selectAuth);
  const location = useLocation();
  if (status === 'checking') return <PageLoader label="Checking your session..." />;
  if (status === 'authenticated') {
    const from = location.state?.from;
    return <Navigate to={from ? `${from.pathname}${from.search || ''}` : '/dashboard'} replace />;
  }
  return <Outlet />;
}
