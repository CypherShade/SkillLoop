import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../lib/apiThunk';

export const fetchAdminStats = apiThunk('admin/fetchStats', async (api) => (await api.get('/admin/stats')).data.stats);
export const fetchAdminUsers = apiThunk('admin/fetchUsers', async (api, params) => (await api.get('/admin/users', { params })).data);
export const updateAdminUser = apiThunk(
  'admin/updateUser',
  async (api, { id, ...changes }) => (await api.patch(`/admin/users/${id}`, changes)).data.user,
);

const slice = createSlice({
  name: 'admin',
  initialState: {
    stats: null,
    users: { items: [], page: 1, pages: 1, total: 0, status: 'idle', error: null },
    updating: {},
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAdminStats.fulfilled, (s, { payload }) => {
      s.stats = payload;
    })
      .addCase(fetchAdminUsers.pending, (s) => {
        s.users.status = 'loading';
      })
      .addCase(fetchAdminUsers.fulfilled, (s, { payload }) => {
        s.users = { items: payload.users, page: payload.page, pages: payload.pages, total: payload.total, status: 'ready', error: null };
      })
      .addCase(fetchAdminUsers.rejected, (s, { payload }) => {
        s.users.status = 'error';
        s.users.error = payload?.message;
      })
      .addCase(updateAdminUser.pending, (s, { meta }) => {
        s.updating[meta.arg.id] = true;
      })
      .addCase(updateAdminUser.fulfilled, (s, { payload }) => {
        const i = s.users.items.findIndex((u) => u.id === payload.id);
        if (i !== -1) s.users.items[i] = payload;
        delete s.updating[payload.id];
      })
      .addCase(updateAdminUser.rejected, (s, { meta }) => {
        delete s.updating[meta.arg.id];
      });
  },
});

export default slice.reducer;
