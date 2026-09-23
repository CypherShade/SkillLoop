import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeftRight, Inbox, Send } from 'lucide-react';
import { changeSwapStatus, fetchSwaps } from '../features/swaps/swapsSlice';
import { fetchStats } from '../features/dashboard/dashboardSlice';
import { selectUser } from '../features/auth/authSlice';
import { toast } from '../features/toasts/toastsSlice';
import { Avatar, Button, EmptyState, ErrorState, Spinner, StatusBadge } from '../components/ui';

const STATUSES = ['PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED', 'CANCELLED'];
const DONE_MSG = {
  ACCEPTED: 'Swap accepted! Time to plan your first session.',
  DECLINED: 'Request declined',
  CANCELLED: 'Swap cancelled',
  COMPLETED: 'Marked as completed. Nice work!',
};

const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now';
  const units = [
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];
  for (const [n, label] of units) if (s >= n) return `${Math.floor(s / n)} ${label}${Math.floor(s / n) > 1 ? 's' : ''} ago`;
};

// Same rules as the server: which buttons each side sees for each status.
function actionsFor(swap, incoming) {
  if (swap.status === 'PENDING') {
    return incoming
      ? [
          ['ACCEPTED', 'Accept', 'primary'],
          ['DECLINED', 'Decline', 'ghost'],
        ]
      : [['CANCELLED', 'Withdraw', 'ghost']];
  }
  if (swap.status === 'ACCEPTED') {
    return [
      ['COMPLETED', 'Mark completed', 'primary'],
      ['CANCELLED', 'Cancel swap', 'ghost'],
    ];
  }
  return [];
}

function SwapCard({ swap, meId }) {
  const dispatch = useDispatch();
  const updating = useSelector((s) => s.swaps.updating[swap.id]);
  const incoming = swap.receiverId === meId;
  const other = incoming ? swap.requester : swap.receiver;
  // Present both skills from my point of view.
  const iTeach = incoming ? swap.requestedSkill : swap.offeredSkill;
  const iLearn = incoming ? swap.offeredSkill : swap.requestedSkill;

  const act = async (status) => {
    try {
      await dispatch(changeSwapStatus({ id: swap.id, status, previous: swap.status, incoming })).unwrap();
      dispatch(toast.success(DONE_MSG[status]));
    } catch (e) {
      dispatch(toast.error(e.message));
      if (e.code === 'STALE' || e.code === 'BAD_TRANSITION') {
        dispatch(fetchSwaps());
        dispatch(fetchStats());
      }
    }
  };

  return (
    <article className={`swap-card status-${swap.status.toLowerCase()}`}>
      <header className="swap-head">
        <Link to={`/members/${other.id}`} className="row">
          <Avatar name={other.name} size={40} />
          <span>
            <strong>{other.name}</strong>
            <small className="muted">
              {incoming ? 'sent you a request' : 'you sent a request'} · {timeAgo(swap.createdAt)}
            </small>
          </span>
        </Link>
        <StatusBadge status={swap.status} />
      </header>

      <div className="swap-trade">
        <div>
          <small>You teach</small>
          <strong>{iTeach.title}</strong>
          <span className="muted small">{iTeach.category.name}</span>
        </div>
        <ArrowLeftRight size={18} aria-hidden="true" />
        <div>
          <small>You learn</small>
          <strong>{iLearn.title}</strong>
          <span className="muted small">{iLearn.category.name}</span>
        </div>
      </div>

      {swap.message && <blockquote className="swap-msg">“{swap.message}”</blockquote>}

      {actionsFor(swap, incoming).length > 0 && (
        <div className="row end">
          {actionsFor(swap, incoming).map(([status, label, variant]) => (
            <Button key={status} variant={variant} className="btn-sm" loading={updating === status} disabled={Boolean(updating)} onClick={() => act(status)}>
              {label}
            </Button>
          ))}
        </div>
      )}
    </article>
  );
}

export default function Swaps() {
  const dispatch = useDispatch();
  const me = useSelector(selectUser);
  const { items, status, error } = useSelector((s) => s.swaps);
  const [params, setParams] = useSearchParams();
  const box = params.get('box') || 'all';
  const statusFilter = params.get('status') || '';

  useEffect(() => {
    dispatch(fetchSwaps());
  }, [dispatch]);

  const set = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next, { replace: true });
  };

  // Filter on the client: the full list is already in the store, so switching tabs is instant.
  const visible = items.filter(
    (s) =>
      (box === 'all' || (box === 'incoming' ? s.receiverId === me.id : s.requesterId === me.id)) &&
      (!statusFilter || s.status === statusFilter),
  );
  const count = (st) => items.filter((s) => s.status === st && (box === 'all' || (box === 'incoming' ? s.receiverId === me.id : s.requesterId === me.id))).length;

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div>
          <h1>Swaps</h1>
          <p className="muted">Requests you've sent and received, from first message to finished.</p>
        </div>
        <div className="segmented" role="tablist">
          {[
            ['all', 'All', ArrowLeftRight],
            ['incoming', 'Incoming', Inbox],
            ['outgoing', 'Sent', Send],
          ].map(([v, label, I]) => (
            <button key={v} role="tab" aria-selected={box === v} onClick={() => set('box', v === 'all' ? '' : v)}>
              <I size={15} /> {label}
            </button>
          ))}
        </div>
      </header>

      <div className="chips-scroll">
        <button className={`chip-btn ${!statusFilter ? 'active' : ''}`} onClick={() => set('status', '')}>
          Any status
        </button>
        {STATUSES.map((st) => (
          <button key={st} className={`chip-btn ${statusFilter === st ? 'active' : ''}`} onClick={() => set('status', st)}>
            {st.toLowerCase()} <span className="count">{count(st)}</span>
          </button>
        ))}
      </div>

      {status === 'error' ? (
        <ErrorState message={error} onRetry={() => dispatch(fetchSwaps())} />
      ) : status === 'loading' ? (
        <Spinner label="Loading swaps" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No swaps here"
          action={
            <Link to="/matches" className="btn btn-primary">
              Find a match
            </Link>
          }
        >
          {items.length ? 'Try a different filter.' : 'When you send or receive a swap request, it will show up here.'}
        </EmptyState>
      ) : (
        <div className="swap-grid">
          {visible.map((s) => (
            <SwapCard key={s.id} swap={s} meId={me.id} />
          ))}
        </div>
      )}
    </div>
  );
}
