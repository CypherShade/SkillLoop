// Every API error is reduced to { status, code, message, fields } so components never
// need to know about Axios internals.
export function normalizeError(err) {
  if (err?.normalized) return err.normalized;
  // Already normalized (for example a thunk's rejectWithValue payload re-thrown by unwrap()).
  if (err && typeof err === 'object' && 'fields' in err && 'code' in err) return err;

  if (err?.response) {
    const { status, data } = err.response;
    const e = data?.error || {};
    return {
      status,
      code: e.code || `HTTP_${status}`,
      message: e.message || defaultMessage(status),
      fields: e.fields || null,
    };
  }
  if (err?.code === 'ECONNABORTED') {
    return { status: 0, code: 'TIMEOUT', message: 'The server took too long to respond. Please try again.', fields: null };
  }
  if (err?.request) {
    return {
      status: 0,
      code: 'NETWORK',
      message: 'Cannot reach the server. Check your connection. (The free API host may take a minute to wake up.)',
      fields: null,
    };
  }
  return { status: 0, code: 'UNKNOWN', message: err?.message || 'Something went wrong', fields: null };
}

function defaultMessage(status) {
  if (status === 429) return 'Too many requests. Please wait a moment.';
  if (status >= 500) return 'The server had a problem. Please try again.';
  return 'Request failed';
}
