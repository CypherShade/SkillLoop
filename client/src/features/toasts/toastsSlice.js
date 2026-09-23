import { createSlice, nanoid } from '@reduxjs/toolkit';

const slice = createSlice({
  name: 'toasts',
  initialState: [],
  reducers: {
    pushToast: {
      reducer: (s, { payload }) => {
        s.push(payload);
        if (s.length > 4) s.shift();
      },
      prepare: (message, tone = 'info') => ({ payload: { id: nanoid(), message, tone } }),
    },
    dismissToast: (s, { payload }) => s.filter((t) => t.id !== payload),
  },
});

export const { pushToast, dismissToast } = slice.actions;
export const toast = {
  success: (m) => pushToast(m, 'success'),
  error: (m) => pushToast(m, 'error'),
  info: (m) => pushToast(m, 'info'),
};
export default slice.reducer;
