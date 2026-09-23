import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../lib/apiThunk';

export const fetchSwaps = apiThunk('swaps/fetch', async (api, params = {}) => (await api.get('/swaps', { params })).data.swaps);
export const createSwap = apiThunk('swaps/create', async (api, body) => (await api.post('/swaps', body)).data.swap);
export const changeSwapStatus = apiThunk(
  'swaps/changeStatus',
  async (api, { id, status }) => (await api.patch(`/swaps/${id}/status`, { status })).data.swap,
);

const slice = createSlice({
  name: 'swaps',
  initialState: { items: [], status: 'idle', error: null, updating: {} },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSwaps.pending, (s) => {
      if (s.status !== 'ready') s.status = 'loading';
    })
      .addCase(fetchSwaps.fulfilled, (s, { payload }) => {
        s.items = payload;
        s.status = 'ready';
      })
      .addCase(fetchSwaps.rejected, (s, { payload }) => {
        s.status = 'error';
        s.error = payload?.message;
      })
      .addCase(createSwap.fulfilled, (s, { payload }) => {
        s.items.unshift(payload);
      })
      .addCase(changeSwapStatus.pending, (s, { meta }) => {
        s.updating[meta.arg.id] = meta.arg.status;
      })
      .addCase(changeSwapStatus.fulfilled, (s, { payload }) => {
        const i = s.items.findIndex((x) => x.id === payload.id);
        if (i !== -1) s.items[i] = payload;
        delete s.updating[payload.id];
      })
      .addCase(changeSwapStatus.rejected, (s, { meta }) => {
        delete s.updating[meta.arg.id];
      });
  },
});

export default slice.reducer;
