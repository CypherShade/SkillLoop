import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import { apiThunk } from '../../lib/apiThunk';
import { createSkill, deleteSkill, updateSkill } from '../skills/skillsSlice';

export const fetchMatches = apiThunk('matches/fetch', async (api) => (await api.get('/matches')).data);

const slice = createSlice({
  name: 'matches',
  initialState: { items: [], hint: null, status: 'idle', stale: true, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMatches.pending, (s) => {
      s.status = 'loading';
    })
      .addCase(fetchMatches.fulfilled, (s, { payload }) => {
        s.items = payload.matches;
        s.hint = payload.hint || null;
        s.status = 'ready';
        s.stale = false;
      })
      .addCase(fetchMatches.rejected, (s, { payload }) => {
        s.status = 'error';
        s.error = payload?.message;
      })
      // Matches depend on my skills, so any change to them makes the cached matches stale.
      .addMatcher(isAnyOf(createSkill.fulfilled, updateSkill.fulfilled, deleteSkill.fulfilled), (s) => {
        s.stale = true;
      });
  },
});

export default slice.reducer;
