import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight, Layers, Search, Shield, Trash2, UserCheck, Users } from 'lucide-react';
import { fetchAdminStats, fetchAdminUsers, updateAdminUser } from '../features/admin/adminSlice';
import { createCategory, deleteCategory, fetchCategories } from '../features/categories/categoriesSlice';
import { selectUser } from '../features/auth/authSlice';
import { toast } from '../features/toasts/toastsSlice';
import { useForm } from '../hooks/useForm';
import { categorySchema } from '../lib/validation';
import { CATEGORY_ICONS, CategoryIcon } from '../components/Icon';
import { Avatar, Button, ErrorState, Field, FormError, Spinner } from '../components/ui';

const SWAP_COLORS = { PENDING: 'amber', ACCEPTED: 'violet', COMPLETED: 'mint', DECLINED: 'coral', CANCELLED: 'gray' };

function Overview({ stats }) {
  if (!stats) return <Spinner label="Loading stats" />;
  const totalSwaps = Object.values(stats.swaps).reduce((a, b) => a + b, 0) || 1;
  const maxCat = Math.max(1, ...stats.topCategories.map((c) => c.count));
  return (
    <>
      <section className="stats">
        <div className="stat stat-violet">
          <Users size={20} />
          <strong>{stats.users}</strong>
          <span>Members</span>
        </div>
        <div className="stat stat-mint">
          <UserCheck size={20} />
          <strong>{stats.activeUsers}</strong>
          <span>Active accounts</span>
        </div>
        <div className="stat stat-amber">
          <Users size={20} />
          <strong>+{stats.newUsers}</strong>
          <span>Joined this week</span>
        </div>
        <div className="stat stat-coral">
          <Layers size={20} />
          <strong>{stats.skills}</strong>
          <span>Skills listed</span>
        </div>
      </section>
      <div className="grid-2">
        <section className="panel">
          <h2>Swaps by status</h2>
          <div className="stacked-bar" role="img" aria-label="Swaps by status">
            {Object.entries(stats.swaps).map(([k, v]) =>
              v ? <span key={k} className={`seg seg-${SWAP_COLORS[k]}`} style={{ flexGrow: v }} title={`${k}: ${v}`} /> : null,
            )}
          </div>
          <ul className="legend">
            {Object.entries(stats.swaps).map(([k, v]) => (
              <li key={k}>
                <i className={`dot seg-${SWAP_COLORS[k]}`} /> {k.toLowerCase()} <b>{v}</b>
                <span className="muted small">{Math.round((v / totalSwaps) * 100)}%</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>Top categories</h2>
          <ul className="bars">
            {stats.topCategories.map((c) => (
              <li key={c.id}>
                <span className="bar-label">
                  <CategoryIcon name={c.icon} size={14} /> {c.name}
                </span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                </span>
                <b>{c.count}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function UsersTable() {
  const dispatch = useDispatch();
  const me = useSelector(selectUser);
  const { users, updating } = useSelector((s) => s.admin);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => dispatch(fetchAdminUsers({ page, ...(q.trim() && { q: q.trim() }) })), 300);
    return () => clearTimeout(t);
  }, [dispatch, q, page]);

  const change = async (u, changes, msg) => {
    try {
      await dispatch(updateAdminUser({ id: u.id, ...changes })).unwrap();
      dispatch(toast.success(msg));
      dispatch(fetchAdminStats());
    } catch (e) {
      dispatch(toast.error(e.message));
    }
  };

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>
          <Users size={18} /> Members <span className="count">{users.total}</span>
        </h2>
        <label className="search sm">
          <Search size={16} aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            aria-label="Search members"
          />
        </label>
      </header>
      {users.status === 'error' ? (
        <ErrorState message={users.error} onRetry={() => dispatch(fetchAdminUsers({ page }))} />
      ) : (
        <div className={`table-wrap ${users.status === 'loading' ? 'dim' : ''}`}>
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Skills</th>
                <th>Joined</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.items.map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id} className={u.isActive ? '' : 'inactive'}>
                    <td>
                      <div className="row nowrap">
                        <Avatar name={u.name} size={32} />
                        <span>
                          <strong>{u.name}</strong> {self && <span className="muted small">(you)</span>}
                          <small className="muted block">{u.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>{u.skillCount}</td>
                    <td className="nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <select
                        value={u.role}
                        disabled={self || updating[u.id]}
                        onChange={(e) => change(u, { role: e.target.value }, `${u.name} is now ${e.target.value === 'ADMIN' ? 'an admin' : 'a member'}`)}
                        aria-label={`Role for ${u.name}`}
                      >
                        <option value="USER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td>
                      <label className={`switch ${self ? 'disabled' : ''}`}>
                        <input
                          type="checkbox"
                          checked={u.isActive}
                          disabled={self || updating[u.id]}
                          onChange={(e) =>
                            change(u, { isActive: e.target.checked }, e.target.checked ? `${u.name} reactivated` : `${u.name} deactivated and signed out`)
                          }
                        />
                        <span />
                        {u.isActive ? 'Active' : 'Disabled'}
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.status === 'ready' && users.items.length === 0 && <p className="muted center">No members match "{q}".</p>}
        </div>
      )}
      {users.pages > 1 && (
        <nav className="pager">
          <button className="icon-btn" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft size={18} />
          </button>
          <span>
            Page {page} of {users.pages}
          </span>
          <button className="icon-btn" disabled={page >= users.pages} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight size={18} />
          </button>
        </nav>
      )}
    </section>
  );
}

function CategoriesPanel() {
  const dispatch = useDispatch();
  const categories = useSelector((s) => s.categories.items);
  const form = useForm(categorySchema, { name: '', icon: 'sparkles' });

  const submit = form.handleSubmit(async (data) => {
    await dispatch(createCategory(data)).unwrap();
    dispatch(toast.success(`Category "${data.name}" added`));
    form.reset();
  });

  const remove = async (c) => {
    try {
      await dispatch(deleteCategory(c.id)).unwrap();
      dispatch(toast.success(`Removed "${c.name}"`));
    } catch (e) {
      dispatch(toast.error(e.message));
    }
  };

  return (
    <section className="panel">
      <h2>
        <Layers size={18} /> Categories
      </h2>
      <form onSubmit={submit} noValidate className="stack">
        <Field label="New category" htmlFor="name" error={form.errors.name}>
          <input placeholder="e.g. Mathematics" {...form.field('name')} />
        </Field>
        <div className="icon-picker" role="radiogroup" aria-label="Icon">
          {Object.keys(CATEGORY_ICONS).map((k) => (
            <button
              type="button"
              key={k}
              role="radio"
              aria-checked={form.values.icon === k}
              className={form.values.icon === k ? 'active' : ''}
              onClick={() => form.setValue('icon', k)}
              title={k}
            >
              <CategoryIcon name={k} size={18} />
            </button>
          ))}
        </div>
        <FormError message={form.formError} />
        <Button type="submit" loading={form.submitting}>
          Add category
        </Button>
      </form>
      <ul className="cat-list">
        {categories.map((c) => (
          <li key={c.id}>
            <CategoryIcon name={c.icon} size={16} />
            <span className="grow">{c.name}</span>
            <span className="muted small">{c.skillCount} skills</span>
            <button
              className="icon-btn danger"
              onClick={() => remove(c)}
              disabled={c.skillCount > 0}
              title={c.skillCount > 0 ? 'In use: cannot delete' : 'Delete'}
              aria-label={`Delete ${c.name}`}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Admin() {
  const dispatch = useDispatch();
  const stats = useSelector((s) => s.admin.stats);

  useEffect(() => {
    dispatch(fetchAdminStats());
    dispatch(fetchCategories(true));
  }, [dispatch]);

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div>
          <h1>
            <Shield size={26} /> Admin console
          </h1>
          <p className="muted">Manage members, categories and marketplace health. Only admins can see this page.</p>
        </div>
      </header>
      <Overview stats={stats} />
      <div className="grid-admin">
        <UsersTable />
        <CategoriesPanel />
      </div>
    </div>
  );
}
