import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, refreshSession } from '../../api/client';
import { normalizeError } from '../../lib/errors';
import { broadcastSession } from '../../lib/sessionSync';

// status: 'checking' while auto-login runs on page load, then 'authenticated' or 'guest'.
// The access token is kept only in memory, never in localStorage, so injected scripts cannot
// read it from storage. On reload it is rebuilt from the httpOnly refresh cookie.
const initialState = { user: null, accessToken: null, status: 'checking', endedReason: null };

const fail = (err, { rejectWithValue }) => rejectWithValue(normalizeError(err));

export const bootstrapSession = createAsyncThunk('auth/bootstrap', async (_, thunk) => {
  try {
    return await refreshSession();
  } catch (err) {
    return fail(err, thunk);
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, thunk) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    broadcastSession('login');
    return data;
  } catch (err) {
    return fail(err, thunk);
  }
});

export const register = createAsyncThunk('auth/register', async ({ name, email, password }, thunk) => {
  try {
    const { data } = await api.post('/auth/register', { name, email, password });
    broadcastSession('login');
    return data;
  } catch (err) {
    return fail(err, thunk);
  }
});

export const logout = createAsyncThunk('auth/logout', async ({ everywhere = false } = {}) => {
  try {
    await api.post(everywhere ? '/auth/logout-all' : '/auth/logout');
  } catch {
    // Log out locally even if the network call fails.
  }
  broadcastSession('logout');
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (changes, thunk) => {
  try {
    const { data } = await api.patch('/users/me', changes);
    return data.user;
  } catch (err) {
    return fail(err, thunk);
  }
});

const setSession = (state, { payload }) => {
  state.user = payload.user;
  state.accessToken = payload.accessToken;
  state.status = 'authenticated';
  state.endedReason = null;
};

const clearSession = (state, reason = null) => {
  state.user = null;
  state.accessToken = null;
  state.status = 'guest';
  state.endedReason = reason;
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Dispatched by the Axios interceptor after a silent refresh.
    sessionRefreshed: setSession,
    // Dispatched when a refresh fails, the account is disabled, or another tab logs out.
    sessionEnded: (state, { payload }) => {
      if (state.status === 'authenticated') clearSession(state, payload?.reason || null);
      else state.status = 'guest';
    },
    clearEndedReason: (state) => {
      state.endedReason = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(bootstrapSession.fulfilled, setSession)
      .addCase(bootstrapSession.rejected, (state) => clearSession(state))
      .addCase(login.fulfilled, setSession)
      .addCase(register.fulfilled, setSession)
      .addCase(logout.fulfilled, (state) => clearSession(state))
      .addCase(updateProfile.fulfilled, (state, { payload }) => {
        state.user = payload;
      });
  },
});

export const { sessionRefreshed, sessionEnded, clearEndedReason } = authSlice.actions;
export default authSlice.reducer;

export const selectAuth = (s) => s.auth;
export const selectUser = (s) => s.auth.user;
export const selectIsAdmin = (s) => s.auth.user?.role === 'ADMIN';
