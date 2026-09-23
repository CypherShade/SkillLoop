import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../lib/apiThunk';

export const fetchMySkills = apiThunk('skills/fetchMine', async (api) => (await api.get('/skills/mine')).data.skills);
export const createSkill = apiThunk('skills/create', async (api, body) => (await api.post('/skills', body)).data.skill);
export const updateSkill = apiThunk('skills/update', async (api, { id, ...body }) => (await api.patch(`/skills/${id}`, body)).data.skill);
// Takes the whole skill so other slices (dashboard counters) know which type was removed.
export const deleteSkill = apiThunk('skills/delete', async (api, skill) => {
  await api.delete(`/skills/${skill.id}`);
  return { id: skill.id, type: skill.type };
});

const slice = createSlice({
  name: 'skills',
  initialState: { items: [], status: 'idle', error: null, deleting: {} },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMySkills.pending, (s) => {
      if (s.status === 'idle') s.status = 'loading';
    })
      .addCase(fetchMySkills.fulfilled, (s, { payload }) => {
        s.items = payload;
        s.status = 'ready';
      })
      .addCase(fetchMySkills.rejected, (s, { payload }) => {
        s.status = 'error';
        s.error = payload?.message;
      })
      .addCase(createSkill.fulfilled, (s, { payload }) => {
        s.items.unshift(payload);
      })
      .addCase(updateSkill.fulfilled, (s, { payload }) => {
        const i = s.items.findIndex((x) => x.id === payload.id);
        if (i !== -1) s.items[i] = payload;
      })
      .addCase(deleteSkill.pending, (s, { meta }) => {
        s.deleting[meta.arg.id] = true;
      })
      .addCase(deleteSkill.fulfilled, (s, { payload }) => {
        s.items = s.items.filter((x) => x.id !== payload.id);
        delete s.deleting[payload.id];
      })
      .addCase(deleteSkill.rejected, (s, { meta }) => {
        delete s.deleting[meta.arg.id];
      });
  },
});

export default slice.reducer;

export const selectMyOffers = (s) => s.skills.items.filter((x) => x.type === 'OFFER');
export const selectMyWants = (s) => s.skills.items.filter((x) => x.type === 'WANT');
