import { createSlice } from '@reduxjs/toolkit';
import { apiThunk } from '../../lib/apiThunk';

export const fetchCategories = apiThunk(
  'categories/fetch',
  async (api) => (await api.get('/categories')).data.categories,
  // Categories rarely change, so they are fetched once and shared by every page.
  { condition: (force, { getState }) => force === true || getState().categories.status === 'idle' },
);

export const createCategory = apiThunk('categories/create', async (api, body) => (await api.post('/categories', body)).data.category);

export const deleteCategory = apiThunk('categories/delete', async (api, id) => {
  await api.delete(`/categories/${id}`);
  return id;
});

const slice = createSlice({
  name: 'categories',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCategories.pending, (s) => {
      s.status = 'loading';
    })
      .addCase(fetchCategories.fulfilled, (s, { payload }) => {
        s.items = payload;
        s.status = 'ready';
      })
      .addCase(fetchCategories.rejected, (s, { payload }) => {
        s.status = 'error';
        s.error = payload?.message;
      })
      .addCase(createCategory.fulfilled, (s, { payload }) => {
        s.items = [...s.items, payload].sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(deleteCategory.fulfilled, (s, { payload }) => {
        s.items = s.items.filter((c) => c.id !== payload);
      });
  },
});

export default slice.reducer;
