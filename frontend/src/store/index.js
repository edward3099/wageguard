import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import complianceReducer from './slices/complianceSlice';
import uploadReducer from './slices/uploadSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    compliance: complianceReducer,
    upload: uploadReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

// Export store for use in the app
export default store;
