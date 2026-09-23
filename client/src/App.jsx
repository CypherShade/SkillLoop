import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { bootstrapSession, sessionEnded } from './features/auth/authSlice';
import { fetchCategories } from './features/categories/categoriesSlice';
import { onSessionMessage } from './lib/sessionSync';
import { GuestRoute, ProtectedRoute, RoleRoute } from './routes/guards';
import { AppLayout } from './components/Layout';
import Toasts from './components/Toasts';
import Landing from './pages/Landing';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Matches from './pages/Matches';
import MySkills from './pages/MySkills';
import Swaps from './pages/Swaps';
import Profile from './pages/Profile';
import Member from './pages/Member';
import Admin from './pages/Admin';
import { Forbidden, NotFound } from './pages/StatusPages';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Auto-login: exchange the httpOnly refresh cookie (if there is one) for a fresh access token.
    dispatch(bootstrapSession());
    dispatch(fetchCategories());

    // Follow logins and logouts from other tabs.
    return onSessionMessage(({ type }) => {
      if (type === 'logout') dispatch(sessionEnded({ reason: 'You signed out in another tab.' }));
      if (type === 'login') dispatch(bootstrapSession());
    });
  }, [dispatch]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/skills" element={<MySkills />} />
            <Route path="/swaps" element={<Swaps />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/members/:id" element={<Member />} />
            <Route element={<RoleRoute roles={['ADMIN']} />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route path="/forbidden" element={<Forbidden />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toasts />
    </>
  );
}
