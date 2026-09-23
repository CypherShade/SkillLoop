import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BookOpen, GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { createSkill, deleteSkill, fetchMySkills, selectMyOffers, selectMyWants, updateSkill } from '../features/skills/skillsSlice';
import { fetchCategories } from '../features/categories/categoriesSlice';
import { toast } from '../features/toasts/toastsSlice';
import { useForm } from '../hooks/useForm';
import { skillSchema } from '../lib/validation';
import SkillCard from '../components/SkillCard';
import { Button, Counter, EmptyState, ErrorState, Field, FormError, Modal, Spinner } from '../components/ui';

function SkillForm({ initial, onDone }) {
  const dispatch = useDispatch();
  const categories = useSelector((s) => s.categories.items);
  const editing = Boolean(initial.id);
  const form = useForm(skillSchema, {
    title: initial.title || '',
    description: initial.description || '',
    type: initial.type || 'OFFER',
    level: initial.level || 'INTERMEDIATE',
    categoryId: initial.category?.id || initial.categoryId || '',
  });

  const submit = form.handleSubmit(async (data) => {
    if (editing) await dispatch(updateSkill({ id: initial.id, ...data })).unwrap();
    else await dispatch(createSkill(data)).unwrap();
    dispatch(toast.success(editing ? 'Skill updated' : `Added "${data.title}"`));
    onDone();
  });

  return (
    <form onSubmit={submit} noValidate className="stack">
      <div className="segmented full" role="radiogroup" aria-label="Skill type">
        {[
          ['OFFER', 'I can teach this', GraduationCap],
          ['WANT', 'I want to learn this', BookOpen],
        ].map(([v, label, I]) => (
          <button type="button" key={v} role="radio" aria-checked={form.values.type === v} aria-selected={form.values.type === v} onClick={() => form.setValue('type', v)}>
            <I size={16} /> {label}
          </button>
        ))}
      </div>

      <Field label="Skill" htmlFor="title" error={form.errors.title} counter={<Counter value={form.values.title} max={60} />}>
        <input placeholder="e.g. Acoustic guitar, Python, Urdu calligraphy" {...form.field('title')} />
      </Field>

      <div className="grid-2 tight">
        <Field label="Category" htmlFor="categoryId" error={form.errors.categoryId}>
          <select {...form.field('categoryId')}>
            <option value="">Choose...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={form.values.type === 'OFFER' ? 'Your level' : 'Your current level'} htmlFor="level" error={form.errors.level}>
          <select {...form.field('level')}>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="EXPERT">Expert</option>
          </select>
        </Field>
      </div>

      <Field
        label="Details (optional)"
        htmlFor="description"
        error={form.errors.description}
        counter={<Counter value={form.values.description} max={400} />}
      >
        <textarea rows={3} placeholder="What exactly can you teach or want to learn?" {...form.field('description')} />
      </Field>

      <FormError message={form.formError} />
      <div className="row end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={form.submitting}>
          {editing ? 'Save changes' : 'Add skill'}
        </Button>
      </div>
    </form>
  );
}

function Column({ title, icon: I, items, type, onAdd, onEdit }) {
  const dispatch = useDispatch();
  const deleting = useSelector((s) => s.skills.deleting);
  const [confirmId, setConfirmId] = useState(null);

  const remove = async (skill) => {
    try {
      await dispatch(deleteSkill(skill)).unwrap();
      dispatch(toast.success(`Removed "${skill.title}"`));
    } catch (e) {
      dispatch(toast.error(e.message));
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>
          <I size={18} aria-hidden="true" /> {title} <span className="count">{items.length}</span>
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={() => onAdd(type)}>
          <Plus size={14} /> Add
        </button>
      </header>
      {items.length === 0 ? (
        <p className="muted">{type === 'OFFER' ? 'Nothing yet. Everyone is good at something!' : 'What would you love to learn?'}</p>
      ) : (
        <div className="stack">
          {items.map((s) => (
            <SkillCard
              key={s.id}
              skill={s}
              showOwner={false}
              actions={
                confirmId === s.id ? (
                  <>
                    <span className="muted small grow">Delete this skill?</span>
                    <Button variant="ghost" className="btn-sm" onClick={() => setConfirmId(null)}>
                      Keep
                    </Button>
                    <Button variant="danger" className="btn-sm" loading={deleting[s.id]} onClick={() => remove(s)}>
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <button className="icon-btn" onClick={() => onEdit(s)} aria-label={`Edit ${s.title}`}>
                      <Pencil size={16} />
                    </button>
                    <button className="icon-btn danger" onClick={() => setConfirmId(s.id)} aria-label={`Delete ${s.title}`}>
                      <Trash2 size={16} />
                    </button>
                  </>
                )
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function MySkills() {
  const dispatch = useDispatch();
  const { status, error } = useSelector((s) => s.skills);
  const offers = useSelector(selectMyOffers);
  const wants = useSelector(selectMyWants);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    dispatch(fetchMySkills());
    dispatch(fetchCategories());
  }, [dispatch]);

  if (status === 'loading') return <Spinner label="Loading your skills" />;
  if (status === 'error') return <ErrorState message={error} onRetry={() => dispatch(fetchMySkills())} />;

  return (
    <div className="stack-lg">
      <header className="page-head">
        <div>
          <h1>My skills</h1>
          <p className="muted">Your matches come from these. More detail gives better matches.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({ type: 'OFFER' })}>
          <Plus size={16} /> New skill
        </button>
      </header>

      {offers.length + wants.length === 0 && (
        <EmptyState icon={GraduationCap} title="Your skill list is empty">
          Add at least one skill you can teach and one you want to learn.
        </EmptyState>
      )}

      <div className="grid-2">
        <Column title="I can teach" icon={GraduationCap} items={offers} type="OFFER" onAdd={(type) => setEditing({ type })} onEdit={setEditing} />
        <Column title="I want to learn" icon={BookOpen} items={wants} type="WANT" onAdd={(type) => setEditing({ type })} onEdit={setEditing} />
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Edit skill' : 'Add a skill'}>
        {editing && <SkillForm initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
