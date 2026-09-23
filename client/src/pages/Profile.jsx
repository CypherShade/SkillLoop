import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Calendar, Mail, MonitorSmartphone, Shield } from 'lucide-react';
import { logout, selectUser, updateProfile } from '../features/auth/authSlice';
import { toast } from '../features/toasts/toastsSlice';
import { useForm } from '../hooks/useForm';
import { profileSchema } from '../lib/validation';
import { Avatar, Button, Counter, Field, FormError } from '../components/ui';

export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const form = useForm(profileSchema, { name: user.name, bio: user.bio, location: user.location });

  const submit = form.handleSubmit(async (data) => {
    await dispatch(updateProfile(data)).unwrap();
    dispatch(toast.success('Profile saved'));
  });

  const dirty = ['name', 'bio', 'location'].some((k) => form.values[k].trim() !== (user[k] || ''));

  const signOutAll = async () => {
    await dispatch(logout({ everywhere: true }));
    dispatch(toast.info('Signed out on all devices'));
    navigate('/login');
  };

  return (
    <div className="grid-profile">
      <aside className="panel profile-card">
        <Avatar name={user.name} size={88} />
        <h2>{user.name}</h2>
        {user.role === 'ADMIN' && (
          <span className="badge badge-admin">
            <Shield size={12} /> Admin
          </span>
        )}
        <ul className="meta-list">
          <li>
            <Mail size={15} aria-hidden="true" /> {user.email}
          </li>
          <li>
            <Calendar size={15} aria-hidden="true" /> Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </li>
        </ul>
      </aside>

      <div className="stack-lg">
        <section className="panel">
          <h2>Edit profile</h2>
          <p className="muted">Other members see this on your profile.</p>
          <form onSubmit={submit} noValidate className="stack">
            <Field label="Name" htmlFor="name" error={form.errors.name}>
              <input autoComplete="name" {...form.field('name')} />
            </Field>
            <Field label="Location" htmlFor="location" error={form.errors.location} hint="City is enough. Helps people meet in person.">
              <input placeholder="Lahore" {...form.field('location')} />
            </Field>
            <Field label="Bio" htmlFor="bio" error={form.errors.bio} counter={<Counter value={form.values.bio} max={280} />}>
              <textarea rows={4} placeholder="What do you do? What are you curious about?" {...form.field('bio')} />
            </Field>
            <FormError message={form.formError} />
            <div className="row end">
              <Button type="submit" loading={form.submitting} disabled={!dirty}>
                Save changes
              </Button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>Security</h2>
          <p className="muted">
            Your session stays signed in with a secure cookie that JavaScript cannot read. If you think someone else has access
            to your account, sign out everywhere.
          </p>
          <div className="row">
            <Button variant="danger" onClick={signOutAll}>
              <MonitorSmartphone size={16} /> Sign out on all devices
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
