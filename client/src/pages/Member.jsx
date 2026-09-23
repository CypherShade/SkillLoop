import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, BookOpen, CheckCircle2, GraduationCap, MapPin } from 'lucide-react';
import { api } from '../api/client';
import { normalizeError } from '../lib/errors';
import { selectUser } from '../features/auth/authSlice';
import SkillCard from '../components/SkillCard';
import ProposeSwapModal from '../components/ProposeSwapModal';
import { Avatar, ErrorState, PageLoader } from '../components/ui';

// A member profile is page-local data (not shared across screens), so it uses component state
// instead of a Redux slice. The request still goes through the same Axios client and interceptors.
export default function Member() {
  const { id } = useParams();
  const me = useSelector(selectUser);
  const [state, setState] = useState({ status: 'loading', member: null, error: null });
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading', member: null, error: null });
    api
      .get(`/users/${id}`, { signal: ctrl.signal })
      .then(({ data }) => setState({ status: 'ready', member: data.member, error: null }))
      .catch((err) => !ctrl.signal.aborted && setState({ status: 'error', member: null, error: normalizeError(err) }));
    return () => ctrl.abort();
  }, [id]);

  if (state.status === 'loading') return <PageLoader label="Loading profile..." />;
  if (state.status === 'error') {
    return (
      <ErrorState
        message={state.error.status === 404 ? 'This member does not exist or is no longer active.' : state.error.message}
      />
    );
  }

  const m = state.member;
  const isMe = m.id === me.id;
  const owner = { id: m.id, name: m.name, location: m.location };

  return (
    <div className="stack-lg">
      <Link to="/explore" className="link">
        <ArrowLeft size={14} /> Back to explore
      </Link>
      <section className="member-hero">
        <Avatar name={m.name} size={96} />
        <div>
          <h1>{m.name}</h1>
          <p className="row muted">
            {m.location && (
              <span>
                <MapPin size={14} aria-hidden="true" /> {m.location}
              </span>
            )}
            <span>
              <CheckCircle2 size={14} aria-hidden="true" /> {m.completedSwaps} completed swap{m.completedSwaps !== 1 && 's'}
            </span>
          </p>
          {m.bio && <p className="lead">{m.bio}</p>}
          {isMe && (
            <Link to="/profile" className="btn btn-ghost btn-sm">
              Edit my profile
            </Link>
          )}
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>
            <GraduationCap size={18} aria-hidden="true" /> Teaches
          </h2>
          <div className="stack">
            {m.offers.length ? (
              m.offers.map((s) => (
                <SkillCard
                  key={s.id}
                  skill={s}
                  showOwner={false}
                  actions={
                    !isMe && (
                      <button className="btn btn-primary btn-sm" onClick={() => setTarget({ ...s, user: owner })}>
                        Propose swap
                      </button>
                    )
                  }
                />
              ))
            ) : (
              <p className="muted">Nothing listed yet.</p>
            )}
          </div>
        </section>
        <section className="panel">
          <h2>
            <BookOpen size={18} aria-hidden="true" /> Wants to learn
          </h2>
          <div className="stack">
            {m.wants.length ? m.wants.map((s) => <SkillCard key={s.id} skill={s} showOwner={false} />) : <p className="muted">Nothing listed yet.</p>}
          </div>
        </section>
      </div>

      {target && <ProposeSwapModal target={target} onClose={() => setTarget(null)} />}
    </div>
  );
}
