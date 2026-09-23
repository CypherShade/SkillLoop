import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeftRight } from 'lucide-react';
import { useForm } from '../hooks/useForm';
import { swapSchema } from '../lib/validation';
import { fetchMySkills, selectMyOffers } from '../features/skills/skillsSlice';
import { createSwap } from '../features/swaps/swapsSlice';
import { toast } from '../features/toasts/toastsSlice';
import { Button, Counter, EmptyState, Field, FormError, Modal, Spinner } from './ui';

// target: the skill to learn (someone else's OFFER, including its owner).
// suggestedOfferId: optionally preselects which of my skills to offer (from Matches).
export default function ProposeSwapModal({ target, suggestedOfferId, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const offers = useSelector(selectMyOffers);
  const skillsStatus = useSelector((s) => s.skills.status);

  useEffect(() => {
    if (skillsStatus === 'idle') dispatch(fetchMySkills());
  }, [dispatch, skillsStatus]);

  const form = useForm(swapSchema, {
    offeredSkillId: suggestedOfferId || '',
    requestedSkillId: target?.id || '',
    message: '',
  });

  useEffect(() => {
    if (!form.values.offeredSkillId && offers.length === 1) form.setValue('offeredSkillId', offers[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offers.length]);

  const submit = form.handleSubmit(async (data) => {
    await dispatch(createSwap(data)).unwrap();
    dispatch(toast.success(`Swap request sent to ${target.user.name.split(' ')[0]}`));
    onClose();
    navigate('/swaps?box=outgoing');
  });

  return (
    <Modal open={Boolean(target)} onClose={onClose} title="Propose a skill swap">
      {target && (
        <>
          {skillsStatus !== 'ready' ? (
            <Spinner label="Loading your skills" />
          ) : offers.length === 0 ? (
            <EmptyState title="Add something you can teach first" action={<Link className="btn btn-primary" to="/skills">Add a skill</Link>}>
              A swap is a trade, so you need at least one skill to offer {target.user.name.split(' ')[0]}.
            </EmptyState>
          ) : (
            <form onSubmit={submit} noValidate className="stack">
              <div className="swap-preview">
                <div>
                  <small>You learn</small>
                  <strong>{target.title}</strong>
                  <span className="muted">from {target.user.name}</span>
                </div>
                <ArrowLeftRight size={20} aria-hidden="true" />
                <div>
                  <small>You teach</small>
                  <strong>{offers.find((o) => o.id === form.values.offeredSkillId)?.title || 'Pick below'}</strong>
                </div>
              </div>

              <Field label="Skill you will teach" htmlFor="offeredSkillId" error={form.errors.offeredSkillId}>
                <select {...form.field('offeredSkillId')}>
                  <option value="">Select one of your skills</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} · {o.category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Message"
                htmlFor="message"
                error={form.errors.message}
                hint="Say when you're free and how you'd like to meet (online or in person)."
                counter={<Counter value={form.values.message} max={500} />}
              >
                <textarea rows={4} placeholder="Hi! I'd love to learn ..." {...form.field('message')} />
              </Field>

              <FormError message={form.formError} />
              <div className="row end">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={form.submitting}>
                  Send request
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </Modal>
  );
}
