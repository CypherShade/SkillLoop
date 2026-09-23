import { useEffect, useRef } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

const HUES = [12, 160, 250, 38, 320, 200, 95];
const hueFor = (s = '') => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];

export function Avatar({ name = '?', size = 40 }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="avatar" style={{ '--size': `${size}px`, '--hue': hueFor(name) }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Spinner({ label = 'Loading', size = 18 }) {
  return (
    <span className="spinner" role="status">
      <Loader2 size={size} className="spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="page-loader">
      <Spinner size={28} label={label} />
      <p>{label}</p>
    </div>
  );
}

export function Field({ label, error, hint, children, htmlFor, counter }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <div className="field-top">
        <label htmlFor={htmlFor}>{label}</label>
        {counter}
      </div>
      {children}
      {error ? (
        <p className="field-error" id={`${htmlFor}-error`} role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}

export const Counter = ({ value = '', max }) => (
  <span className={`counter ${value.length > max ? 'over' : ''}`}>
    {value.length}/{max}
  </span>
);

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="form-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" /> {message}
    </div>
  );
}

export function Button({ loading, children, variant = 'primary', className = '', ...rest }) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <Loader2 size={16} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function EmptyState({ icon: IconC, title, children, action }) {
  return (
    <div className="empty">
      {IconC && (
        <div className="empty-icon">
          <IconC size={26} aria-hidden="true" />
        </div>
      )}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty error-state">
      <div className="empty-icon">
        <AlertCircle size={26} aria-hidden="true" />
      </div>
      <h3>Could not load this</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 520 }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      style={{ '--w': `${width}px` }}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <div className="modal-body">
          <header className="modal-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

const LEVEL_LABEL = { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', EXPERT: 'Expert' };
export const LevelDots = ({ level }) => {
  const n = { BEGINNER: 1, INTERMEDIATE: 2, EXPERT: 3 }[level] || 1;
  return (
    <span className="level" title={LEVEL_LABEL[level]}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? 'on' : ''} />
      ))}
      <span>{LEVEL_LABEL[level]}</span>
    </span>
  );
};

export const StatusBadge = ({ status }) => <span className={`badge badge-${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
