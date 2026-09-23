import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight, Compass, Search } from 'lucide-react';
import { fetchExplore } from '../features/explore/exploreSlice';
import { fetchCategories } from '../features/categories/categoriesSlice';
import { selectUser } from '../features/auth/authSlice';
import SkillCard from '../components/SkillCard';
import ProposeSwapModal from '../components/ProposeSwapModal';
import { CategoryIcon } from '../components/Icon';
import { EmptyState, ErrorState } from '../components/ui';

// Filters live in the URL, so searches can be bookmarked and the back button restores them.
export default function Explore() {
  const dispatch = useDispatch();
  const me = useSelector(selectUser);
  const categories = useSelector((s) => s.categories.items);
  const { items, total, pages, status, error } = useSelector((s) => s.explore);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [target, setTarget] = useState(null);

  const type = params.get('type') || 'OFFER';
  const category = params.get('category') || '';
  const level = params.get('level') || '';
  const page = Number(params.get('page') || 1);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Debounce typing, then push the search term into the URL.
  useEffect(() => {
    const t = setTimeout(() => (q !== (params.get('q') || '') ? update({ q }) : null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    const req = dispatch(fetchExplore({ type, page, ...(category && { category }), ...(level && { level }), ...(params.get('q') && { q: params.get('q') }) }));
    return () => req.abort();
  }, [dispatch, params, type, page, category, level]);

  const load = () => dispatch(fetchExplore(Object.fromEntries(params)));

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div>
          <h1>Explore</h1>
          <p className="muted">{type === 'OFFER' ? 'Skills people are offering to teach.' : 'Skills people want to learn. Can you teach one?'}</p>
        </div>
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={type === 'OFFER'} onClick={() => update({ type: 'OFFER' })}>
            Teachers
          </button>
          <button role="tab" aria-selected={type === 'WANT'} onClick={() => update({ type: 'WANT' })}>
            Learners
          </button>
        </div>
      </header>

      <div className="filters">
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search skills or people..." aria-label="Search" maxLength={60} />
        </label>
        <select value={level} onChange={(e) => update({ level: e.target.value })} aria-label="Level">
          <option value="">Any level</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="EXPERT">Expert</option>
        </select>
      </div>

      <div className="chips-scroll" role="list">
        <button className={`chip-btn ${!category ? 'active' : ''}`} onClick={() => update({ category: '' })}>
          All
        </button>
        {categories.map((c) => (
          <button key={c.id} className={`chip-btn ${category === c.slug ? 'active' : ''}`} onClick={() => update({ category: c.slug })}>
            <CategoryIcon name={c.icon} size={14} /> {c.name}
          </button>
        ))}
      </div>

      {status === 'error' ? (
        <ErrorState message={error} onRetry={load} />
      ) : status === 'loading' && !items.length ? (
        <div className="grid-cards">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Compass} title="Nothing here yet">
          Try another category or search term.
        </EmptyState>
      ) : (
        <>
          <p className="muted small">
            {total} result{total !== 1 && 's'}
          </p>
          <div className={`grid-cards ${status === 'loading' ? 'dim' : ''}`}>
            {items.map((s) => (
              <SkillCard
                key={s.id}
                skill={s}
                actions={
                  s.user.id === me.id ? (
                    <span className="muted small">This is your skill</span>
                  ) : s.type === 'OFFER' ? (
                    <button className="btn btn-primary btn-sm" onClick={() => setTarget(s)}>
                      Propose swap
                    </button>
                  ) : (
                    <Link className="btn btn-ghost btn-sm" to={`/members/${s.user.id}`}>
                      View profile
                    </Link>
                  )
                }
              />
            ))}
          </div>
          {pages > 1 && (
            <nav className="pager" aria-label="Pagination">
              <button className="icon-btn" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} aria-label="Previous page">
                <ChevronLeft size={18} />
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button className="icon-btn" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })} aria-label="Next page">
                <ChevronRight size={18} />
              </button>
            </nav>
          )}
        </>
      )}

      {target && <ProposeSwapModal target={target} onClose={() => setTarget(null)} />}
    </div>
  );
}
