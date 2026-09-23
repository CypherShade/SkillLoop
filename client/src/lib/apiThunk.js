import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/client';
import { normalizeError } from './errors';

// createAsyncThunk wrapper: the callback gets the Axios instance, and errors are
// always rejected as normalized { status, code, message, fields } objects.
export const apiThunk = (type, fn, options) =>
  createAsyncThunk(
    type,
    async (arg, thunkApi) => {
      try {
        return await fn(api, arg, thunkApi);
      } catch (err) {
        return thunkApi.rejectWithValue(normalizeError(err));
      }
    },
    options,
  );
