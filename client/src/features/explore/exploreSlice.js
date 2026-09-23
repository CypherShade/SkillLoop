import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../lib/apiThunk';

// `signal` cancels an in-flight search when the filters change again (fast typing).
export const fetchExplore = apiThunk('explore/fetch', async (api, params, { signal }) => {
  const { data } = await api.get('/skills', { params, signal });
  return data;
});

const slice = createSlice({
  name: 'explore',
  initialState: { items: [], total: 0, pages: 1, page: 1, status: 'idle', error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchExplore.pending, (s) => {
      s.status = 'loading';
      s.error = null;
    })
      .addCase(fetchExplore.fulfilled, (s, { payload }) => {
        Object.assign(s, { items: payload.items, total: payload.total, pages: payload.pages, page: payload.page, status: 'ready' });
      })
      .addCase(fetchExplore.rejected, (s, { payload, meta }) => {
        if (meta.aborted) return;
        s.status = 'error';
        s.error = payload?.message;
      });
  },
});

export default slice.reducer;
