import { combineReducers, configureStore } from '@reduxjs/toolkit';
import auth from '../features/auth/authSlice';
import categories from '../features/categories/categoriesSlice';
import skills from '../features/skills/skillsSlice';
import explore from '../features/explore/exploreSlice';
import matches from '../features/matches/matchesSlice';
import swaps from '../features/swaps/swapsSlice';
import dashboard from '../features/dashboard/dashboardSlice';
import admin from '../features/admin/adminSlice';
import toasts from '../features/toasts/toastsSlice';
import { injectStore } from '../api/client';

const appReducer = combineReducers({ auth, categories, skills, explore, matches, swaps, dashboard, admin, toasts });

// When a session ends, wipe every user-specific slice so the next user in the same
// browser never sees the previous user's data. Public categories and toasts are kept.
const SESSION_END = ['auth/logout/fulfilled', 'auth/sessionEnded'];
const rootReducer = (state, action) => {
  if (SESSION_END.includes(action.type) && state) {
    const kept = { categories: state.categories, toasts: state.toasts };
    return appReducer({ ...kept, auth: appReducer(state, action).auth }, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({ reducer: rootReducer });

injectStore(store);
