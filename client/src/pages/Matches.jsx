import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeftRight, MapPin, RefreshCw, Sparkles } from 'lucide-react';
import { fetchMatches } from '../features/matches/matchesSlice';
import ProposeSwapModal from '../components/ProposeSwapModal';
import { Avatar, EmptyState, ErrorState, Spinner } from '../components/ui';

function Ring({ value, mutual }) {
  return (
    <div className={`ring ${mutual ? 'mutual' : ''}`} style={{ '--p': value }} aria-label={`${value}% match`}>
      <span>{value}%</span>
    </div>
  );
}

export default function Matches() {
  const dispatch = useDispatch();
  const { items, hint, status, stale, error } = useSelector((s) => s.matches);
  const [proposal, setProposal] = useState(null);

  useEffect(() => {
    if (stale) dispatch(fetchMatches());
  }, [dispatch, stale]);

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div>
          <h1>Your matches</h1>
          <p className="muted">
            People who teach what you want to learn. A <b className="mutual-text">mutual</b> match also wants to learn something you teach.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => dispatch(fetchMatches())} disabled={status === 'loading'}>
          <RefreshCw size={16} className={status === 'loading' ? 'spin' : ''} /> Refresh
        </button>
      </header>

      {status === 'error' ? (
        <ErrorState message={error} onRetry={() => dispatch(fetchMatches())} />
      ) : status === 'loading' && !items.length ? (
        <Spinner label="Finding your matches" />
      ) : !items.length ? (
        <EmptyState
          icon={Sparkles}
          title="No matches yet"
          action={
            <Link to="/skills" className="btn btn-primary">
              Update my skills
            </Link>
          }
        >
          {hint || 'Nobody in your categories yet. Add more skills you want to learn, or check back later.'}
        </EmptyState>
      ) : (
        <div className="match-list">
          {items.map((m) => (
            <article key={m.member.id} className={`match-card ${m.mutual ? 'is-mutual' : ''}`}>
              <div className="match-who">
                <Avatar name={m.member.name} size={52} />
                <div>
                  <Link to={`/members/${m.member.id}`}>
                    <h3>{m.member.name}</h3>
                  </Link>
                  {m.member.location && (
                    <small className="muted">
                      <MapPin size={12} aria-hidden="true" /> {m.member.location}
                    </small>
                  )}
                  {m.mutual && <span className="badge badge-mutual">Mutual match</span>}
                </div>
                <Ring value={m.percent} mutual={m.mutual} />
              </div>

              <div className="match-pairs">
                {m.theyTeach.map((p) => (
                  <div key={p.theirs.id} className="pair">
                    <span>
                      <small>They teach</small>
                      <strong>{p.theirs.title}</strong>
                    </span>
                    <span className="pair-arrow">→</span>
                    <span>
                      <small>You want</small>
                      <strong>{p.mine.title}</strong>
                    </span>
                    {p.exact && <span className="badge badge-exact">Same skill</span>}
                  </div>
                ))}
                {m.theyLearn.map((p) => (
                  <div key={p.theirs.id} className="pair reverse">
                    <span>
                      <small>You teach</small>
                      <strong>{p.mine.title}</strong>
                    </span>
                    <span className="pair-arrow">→</span>
                    <span>
                      <small>They want</small>
                      <strong>{p.theirs.title}</strong>
                    </span>
                    {p.exact && <span className="badge badge-exact">Same skill</span>}
                  </div>
                ))}
              </div>

              <div className="row end">
                <Link className="btn btn-ghost btn-sm" to={`/members/${m.member.id}`}>
                  Profile
                </Link>
                {m.theyTeach[0] && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      // Prefer the closest pairs (same skill name) when preselecting.
                      const teach = m.theyTeach.find((p) => p.exact) || m.theyTeach[0];
                      const learn = m.theyLearn.find((p) => p.exact) || m.theyLearn[0];
                      setProposal({ target: { ...teach.theirs, user: m.member }, suggestedOfferId: learn?.mine.id });
                    }}
                  >
                    <ArrowLeftRight size={14} /> Propose swap
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {proposal && <ProposeSwapModal {...proposal} onClose={() => setProposal(null)} />}
    </div>
  );
}
