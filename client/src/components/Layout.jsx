import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeftRight, Compass, LayoutDashboard, Layers, LogOut, Menu, MonitorSmartphone, Shield, Sparkles, User, X } from 'lucide-react';
import { logout, selectIsAdmin, selectUser } from '../features/auth/authSlice';
import { fetchStats } from '../features/dashboard/dashboardSlice';
import { toast } from '../features/toasts/toastsSlice';
import { Avatar } from './ui';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="SkillLoop home">
      <img src="/logo.svg" alt="" width="30" height="30" />
      <span>
        Skill<b>Loop</b>
      </span>
    </Link>
  );
}

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const signOut = async (everywhere) => {
    setOpen(false);
    await dispatch(logout({ everywhere }));
    dispatch(toast.info(everywhere ? 'Signed out on all devices' : 'Signed out'));
    navigate('/login');
  };

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <Avatar name={user.name} size={32} />
        <span className="user-chip-name">{user.name.split(' ')[0]}</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <Link to="/profile" role="menuitem" onClick={() => setOpen(false)}>
            <User size={16} /> Profile
          </Link>
          <button role="menuitem" onClick={() => signOut(false)}>
            <LogOut size={16} /> Sign out
          </button>
          <button role="menuitem" onClick={() => signOut(true)}>
            <MonitorSmartphone size={16} /> Sign out everywhere
          </button>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);
  const pending = useSelector((s) => s.dashboard.stats.incomingPending);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setNavOpen(false), [location.pathname]);

  // Keep the incoming-requests badge fresh: poll while the tab is visible and refetch on focus.
  useEffect(() => {
    const load = () => document.visibilityState === 'visible' && dispatch(fetchStats());
    load();
    const id = setInterval(load, 60000);
    document.addEventListener('visibilitychange', load);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', load);
    };
  }, [dispatch]);

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/matches', label: 'Matches', icon: Sparkles },
    { to: '/skills', label: 'My skills', icon: Layers },
    { to: '/swaps', label: 'Swaps', icon: ArrowLeftRight, badge: pending },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          <nav className={`nav ${navOpen ? 'open' : ''}`} aria-label="Main">
            {links.map(({ to, label, icon: I, badge }) => (
              <NavLink key={to} to={to} className="nav-link">
                <I size={17} aria-hidden="true" />
                {label}
                {badge > 0 && (
                  <span className="nav-badge" aria-label={`${badge} pending`}>
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-right">
            <UserMenu user={user} />
            <button className="icon-btn nav-toggle" onClick={() => setNavOpen((o) => !o)} aria-label="Toggle menu">
              {navOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>
      <main className="container page">
        <Outlet />
      </main>
    </div>
  );
}
