import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../lib/apiThunk';
import { createSkill, deleteSkill } from '../skills/skillsSlice';
import { changeSwapStatus } from '../swaps/swapsSlice';

export const fetchStats = apiThunk('dashboard/fetchStats', async (api) => (await api.get('/users/me/stats')).data.stats);

const empty = { offers: 0, wants: 0, incomingPending: 0, active: 0, completed: 0 };

// The navbar badge and dashboard counters read from here. They are updated locally as
// the user acts, so every screen stays consistent without waiting for a refetch.
const slice = createSlice({
  name: 'dashboard',
  initialState: { stats: empty, status: 'idle' },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchStats.fulfilled, (s, { payload }) => {
      s.stats = payload;
      s.status = 'ready';
    })
      .addCase(createSkill.fulfilled, (s, { payload }) => {
        s.stats[payload.type === 'OFFER' ? 'offers' : 'wants'] += 1;
      })
      .addCase(deleteSkill.fulfilled, (s, { payload }) => {
        const key = payload.type === 'OFFER' ? 'offers' : 'wants';
        s.stats[key] = Math.max(0, s.stats[key] - 1);
      })
      .addCase(changeSwapStatus.fulfilled, (s, { payload, meta }) => {
        const { stats } = s;
        const prev = meta.arg.previous;
        if (prev === 'PENDING' && meta.arg.incoming) stats.incomingPending = Math.max(0, stats.incomingPending - 1);
        if (prev === 'ACCEPTED') stats.active = Math.max(0, stats.active - 1);
        if (payload.status === 'ACCEPTED') stats.active += 1;
        if (payload.status === 'COMPLETED') stats.completed += 1;
      });
  },
});

export default slice.reducer;
