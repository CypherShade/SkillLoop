import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Check, Eye, EyeOff, Info } from 'lucide-react';
import { useForm } from '../hooks/useForm';
import { loginSchema, passwordRules, registerSchema } from '../lib/validation';
import { clearEndedReason, login, register } from '../features/auth/authSlice';
import { toast } from '../features/toasts/toastsSlice';
import { Logo } from '../components/Layout';
import { Button, Field, FormError } from '../components/ui';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-side" aria-hidden="true">
        <Logo />
        <blockquote>
          “I taught three people Photoshop and learned enough Spanish to order food in Madrid.”
          <cite>A SkillLoop member</cite>
        </blockquote>
      </div>
      <div className="auth-main">
        <div className="auth-card">
          <div className="auth-logo-mobile">
            <Logo />
          </div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          <p className="auth-footer">{footer}</p>
        </div>
      </div>
    </div>
  );
}

function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-group">
      <input type={show ? 'text' : 'password'} {...props} />
      <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const dispatch = useDispatch();
  const endedReason = useSelector((s) => s.auth.endedReason);
  const form = useForm(loginSchema, { email: '', password: '' });

  useEffect(() => () => dispatch(clearEndedReason()), [dispatch]);

  const submit = form.handleSubmit(async (data) => {
    const { user } = await dispatch(login(data)).unwrap();
    dispatch(toast.success(`Welcome back, ${user.name.split(' ')[0]}!`));
    // GuestRoute redirects to the page the user originally asked for.
  });

  const fillDemo = (email, password) => form.setMany({ email, password });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your matches and swap requests."
      footer={
        <>
          New to SkillLoop? <Link to="/register">Create an account</Link>
        </>
      }
    >
      {endedReason && (
        <div className="notice">
          <Info size={16} aria-hidden="true" /> {endedReason}
        </div>
      )}
      <form onSubmit={submit} noValidate className="stack">
        <Field label="Email" htmlFor="email" error={form.errors.email}>
          <input type="email" autoComplete="email" placeholder="you@example.com" {...form.field('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={form.errors.password}>
          <PasswordInput autoComplete="current-password" {...form.field('password')} />
        </Field>
        <FormError message={form.formError} />
        <Button type="submit" loading={form.submitting} className="btn-block">
          Sign in
        </Button>
      </form>
      <div className="demo-box">
        <small>Demo accounts</small>
        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemo('ayesha@demo.dev', 'Demo@12345')}>
            Member
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemo('admin@skillloop.dev', 'Admin@12345')}>
            Admin
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const dispatch = useDispatch();
  const form = useForm(registerSchema, { name: '', email: '', password: '', confirm: '' });
  const pw = form.values.password;

  const submit = form.handleSubmit(async (data) => {
    await dispatch(register(data)).unwrap();
    dispatch(toast.success('Account created! Add your first skills to get matched.'));
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes 30 seconds. No money is involved, ever."
      footer={
        <>
          Already a member? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="stack">
        <Field label="Full name" htmlFor="name" error={form.errors.name}>
          <input autoComplete="name" placeholder="Ali Khan" {...form.field('name')} />
        </Field>
        <Field label="Email" htmlFor="email" error={form.errors.email}>
          <input type="email" autoComplete="email" placeholder="you@example.com" {...form.field('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={form.errors.password}>
          <PasswordInput autoComplete="new-password" {...form.field('password')} />
        </Field>
        <ul className="pw-rules" aria-label="Password requirements">
          {passwordRules.map((r) => (
            <li key={r.label} className={r.test(pw) ? 'ok' : ''}>
              <Check size={13} aria-hidden="true" /> {r.label}
            </li>
          ))}
        </ul>
        <Field label="Confirm password" htmlFor="confirm" error={form.errors.confirm}>
          <PasswordInput autoComplete="new-password" {...form.field('confirm')} />
        </Field>
        <FormError message={form.formError} />
        <Button type="submit" loading={form.submitting} className="btn-block">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
