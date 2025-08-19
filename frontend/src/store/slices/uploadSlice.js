import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Async thunks
export const uploadCSV = createAsyncThunk(
  'upload/csv',
  async (file, { rejectWithValue, getState, dispatch }) => {
    try {
      const { auth } = getState();
      const formData = new FormData();
      formData.append('csv', file);
      
      const response = await axios.post(`${API_BASE_URL}/api/v1/csv/upload`, formData, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          dispatch(setUploadProgress(progress));
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Upload failed');
    }
  }
);

// Note: Processing is now handled automatically in the upload endpoint

export const getUploadStatus = createAsyncThunk(
  'upload/status',
  async (uploadId, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(`${API_BASE_URL}/api/v1/csv/uploads/${uploadId}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to get upload status');
    }
  }
);

const initialState = {
  currentUpload: null,
  uploads: [],
  loading: false,
  error: null,
  uploadProgress: 0,
};

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    clearUploadError: (state) => {
      state.error = null;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    clearCurrentUpload: (state) => {
      state.currentUpload = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload CSV
      .addCase(uploadCSV.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadCSV.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUpload = action.payload;
        state.uploads.unshift(action.payload);
        state.uploadProgress = 100;
        state.error = null;
      })
      .addCase(uploadCSV.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.uploadProgress = 0;
      })
      // Processing is now handled automatically in upload
      // Get upload status
      .addCase(getUploadStatus.fulfilled, (state, action) => {
        const updatedUpload = action.payload;
        state.currentUpload = updatedUpload;
        // Update in uploads array
        const index = state.uploads.findIndex(upload => upload.id === updatedUpload.id);
        if (index !== -1) {
          state.uploads[index] = updatedUpload;
        }
      });
  },
});

export const { clearUploadError, setUploadProgress, clearCurrentUpload } = uploadSlice.actions;
export default uploadSlice.reducer;
