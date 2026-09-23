import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { dismissToast } from '../features/toasts/toastsSlice';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };

function Toast({ t }) {
  const dispatch = useDispatch();
  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(t.id)), t.tone === 'error' ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [dispatch, t]);
  const I = ICONS[t.tone];
  return (
    <div className={`toast toast-${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
      <I size={18} aria-hidden="true" />
      <span>{t.message}</span>
      <button className="icon-btn" onClick={() => dispatch(dismissToast(t.id))} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

export default function Toasts() {
  const toasts = useSelector((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} t={t} />
      ))}
    </div>
  );
}
