import { useCallback, useState } from 'react';
import { normalizeError } from '../lib/errors';

const collect = (zodError) => {
  const out = {};
  for (const issue of zodError.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
};

// Small form helper:
//  - validates one field on blur, and every field on submit, with the same zod schema;
//  - once a field is touched it re-validates as you type, so errors clear immediately;
//  - maps server 422 { fields } back onto the inputs and other errors to a form banner.
export function useForm(schema, initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validateField = useCallback(
    (name, nextValues) => {
      const result = schema.safeParse(nextValues);
      const msg = result.success ? undefined : collect(result.error)[name];
      setErrors((e) => ({ ...e, [name]: msg }));
    },
    [schema],
  );

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    const next = { ...values, [name]: type === 'checkbox' ? checked : value };
    setValues(next);
    setFormError('');
    if (touched[name]) validateField(name, next);
  };

  const setMany = (patch) => {
    const next = { ...values, ...patch };
    setValues(next);
    setFormError('');
    for (const name of Object.keys(patch)) if (touched[name]) validateField(name, next);
  };
  const setValue = (name, value) => setMany({ [name]: value });

  const onBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    validateField(name, values);
  };

  const handleSubmit = (fn) => async (e) => {
    e?.preventDefault();
    const result = schema.safeParse(values);
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    if (!result.success) {
      setErrors(collect(result.error));
      return;
    }
    setErrors({});
    setFormError('');
    setSubmitting(true);
    try {
      await fn(result.data);
    } catch (err) {
      const n = normalizeError(err);
      if (n.fields) setErrors(n.fields);
      setFormError(n.message);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name) => ({
    name,
    id: name,
    value: values[name] ?? '',
    onChange,
    onBlur,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  });

  const reset = (next = initialValues) => {
    setValues(next);
    setErrors({});
    setTouched({});
    setFormError('');
  };

  return { values, errors, formError, submitting, field, setValue, setMany, handleSubmit, reset };
}
