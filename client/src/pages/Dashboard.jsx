import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeftRight, ArrowRight, BookOpen, CheckCircle2, GraduationCap, Inbox, Plus, Sparkles } from 'lucide-react';
import { selectUser } from '../features/auth/authSlice';
import { fetchMatches } from '../features/matches/matchesSlice';
import { fetchSwaps } from '../features/swaps/swapsSlice';
import { Avatar, EmptyState, Spinner, StatusBadge } from '../components/ui';

function Stat({ icon: I, label, value, to, tone, loading }) {
  return (
    <Link to={to} className={`stat stat-${tone}`}>
      <I size={20} aria-hidden="true" />
      <strong>{loading ? '–' : value}</strong>
      <span>{label}</span>
    </Link>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const { stats, status: statsStatus } = useSelector((s) => s.dashboard);
  const statsLoading = statsStatus !== 'ready';
  const matches = useSelector((s) => s.matches);
  const swaps = useSelector((s) => s.swaps);

  useEffect(() => {
    if (matches.stale) dispatch(fetchMatches());
    dispatch(fetchSwaps());
  }, [dispatch, matches.stale]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const hasSkills = statsLoading || stats.offers + stats.wants > 0;

  return (
    <div className="stack-lg">
      <section className="welcome">
        <div>
          <p className="eyebrow">{greeting}</p>
          <h1>{user.name.split(' ')[0]}, here's your loop</h1>
          <p className="muted">
            {statsLoading
              ? 'Loading your activity...'
              : stats.incomingPending > 0
              ? `You have ${stats.incomingPending} swap request${stats.incomingPending > 1 ? 's' : ''} waiting for a reply.`
              : 'No requests waiting. Check your matches to find someone to swap with.'}
          </p>
        </div>
        <Link to="/skills" className="btn btn-primary">
          <Plus size={16} /> Add a skill
        </Link>
      </section>

      <section className="stats">
        <Stat icon={GraduationCap} label="Skills I teach" value={stats.offers} to="/skills" tone="coral" loading={statsLoading} />
        <Stat icon={BookOpen} label="Skills I want" value={stats.wants} to="/skills" tone="mint" loading={statsLoading} />
        <Stat icon={Inbox} label="Requests to answer" value={stats.incomingPending} to="/swaps?box=incoming&status=PENDING" tone="amber" loading={statsLoading} />
        <Stat icon={ArrowLeftRight} label="Active swaps" value={stats.active} to="/swaps?status=ACCEPTED" tone="violet" loading={statsLoading} />
        <Stat icon={CheckCircle2} label="Completed" value={stats.completed} to="/swaps?status=COMPLETED" tone="ink" loading={statsLoading} />
      </section>

      {!hasSkills && (
        <EmptyState
          icon={Sparkles}
          title="Start by adding two skills"
          action={
            <Link to="/skills" className="btn btn-primary">
              Add my skills
            </Link>
          }
        >
          Add one skill you can teach and one you want to learn. Matches show up right after.
        </EmptyState>
      )}

      <div className="grid-2">
        <section className="panel">
          <header className="panel-head">
            <h2>
              <Sparkles size={18} aria-hidden="true" /> Top matches
            </h2>
            <Link to="/matches" className="link">
              All matches <ArrowRight size={14} />
            </Link>
          </header>
          {(matches.status === 'loading' || matches.status === 'idle') && !matches.items.length ? (
            <Spinner />
          ) : matches.items.length ? (
            <ul className="list">
              {matches.items.slice(0, 4).map((m) => (
                <li key={m.member.id}>
                  <Link to={`/members/${m.member.id}`} className="list-row">
                    <Avatar name={m.member.name} size={36} />
                    <span className="grow">
                      <strong>{m.member.name}</strong>
                      <small className="muted">
                        Teaches {m.theyTeach.map((p) => p.theirs.title).join(', ') || 'nothing you want yet'}
                      </small>
                    </span>
                    <span className={`pct ${m.mutual ? 'mutual' : ''}`}>{m.percent}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{matches.hint || 'No matches yet. Try adding more skills you want to learn.'}</p>
          )}
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2>
              <ArrowLeftRight size={18} aria-hidden="true" /> Recent swaps
            </h2>
            <Link to="/swaps" className="link">
              All swaps <ArrowRight size={14} />
            </Link>
          </header>
          {swaps.status === 'loading' || swaps.status === 'idle' ? (
            <Spinner />
          ) : swaps.items.length ? (
            <ul className="list">
              {swaps.items.slice(0, 4).map((s) => {
                const other = s.requesterId === user.id ? s.receiver : s.requester;
                return (
                  <li key={s.id}>
                    <Link to="/swaps" className="list-row">
                      <Avatar name={other.name} size={36} />
                      <span className="grow">
                        <strong>{other.name}</strong>
                        <small className="muted">
                          {s.offeredSkill.title} ↔ {s.requestedSkill.title}
                        </small>
                      </span>
                      <StatusBadge status={s.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">No swaps yet. Find someone in Explore or Matches.</p>
          )}
        </section>
      </div>
    </div>
  );
}
