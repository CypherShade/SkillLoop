import axios from 'axios';
import { normalizeError } from '../lib/errors';

const baseURL = import.meta.env.VITE_API_URL || '/api';

// withCredentials lets the browser send the httpOnly refresh cookie. The access token
// lives only in Redux memory and is added to requests by the interceptor below.
export const api = axios.create({ baseURL, withCredentials: true, timeout: 20000 });

// The store is injected at startup to avoid a circular import (store -> slices -> api -> store).
let store;
export const injectStore = (s) => {
  store = s;
};

api.interceptors.request.use((config) => {
  const token = store?.getState().auth.accessToken;
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------------------------------------------------------------------------
// Silent refresh
//  - One refresh at a time per tab (a shared promise), so ten parallel 401s cause one refresh.
//  - One refresh at a time across tabs (Web Locks API), because refresh tokens rotate.
//    Each tab then sends the newest cookie instead of one another tab has just rotated.
// ---------------------------------------------------------------------------
let refreshPromise = null;

async function callRefresh() {
  const { data } = await axios.post(`${baseURL}/auth/refresh`, null, { withCredentials: true, timeout: 20000 });
  return data;
}

export function refreshSession() {
  if (!refreshPromise) {
    const run = () => callRefresh();
    const locked = navigator.locks?.request ? navigator.locks.request('skillloop-refresh', run) : run();
    refreshPromise = locked.finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const code = error.response?.data?.error?.code;

    if (
      error.response?.status === 401 &&
      code === 'TOKEN_EXPIRED' &&
      original &&
      !original._retry &&
      !NO_RETRY.some((p) => original.url?.includes(p))
    ) {
      original._retry = true;
      try {
        const data = await refreshSession();
        store.dispatch({ type: 'auth/sessionRefreshed', payload: data });
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        store.dispatch({ type: 'auth/sessionEnded', payload: { reason: normalizeError(refreshErr).message } });
        return Promise.reject(Object.assign(refreshErr, { normalized: normalizeError(refreshErr) }));
      }
    }

    // A deactivated account or a token the server no longer accepts ends the session in this tab.
    if (code === 'ACCOUNT_DISABLED' || code === 'TOKEN_INVALID') {
      store?.dispatch({ type: 'auth/sessionEnded', payload: { reason: error.response.data.error.message } });
    }

    error.normalized = normalizeError(error);
    return Promise.reject(error);
  },
);
