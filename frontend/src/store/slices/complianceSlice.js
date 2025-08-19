import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Async thunks
export const fetchComplianceResults = createAsyncThunk(
  'compliance/fetchResults',
  async (uploadId, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(`${API_BASE_URL}/api/compliance/${uploadId}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch compliance results');
    }
  }
);

export const exportEvidencePack = createAsyncThunk(
  'compliance/exportEvidence',
  async ({ uploadId, format }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await axios.get(`${API_BASE_URL}/api/compliance/${uploadId}/export`, {
        params: { format },
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        responseType: 'blob',
      });
      return { data: response.data, format };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Export failed');
    }
  }
);

const initialState = {
  results: null,
  loading: false,
  error: null,
  exportLoading: false,
  exportError: null,
};

const complianceSlice = createSlice({
  name: 'compliance',
  initialState,
  reducers: {
    clearComplianceError: (state) => {
      state.error = null;
    },
    clearExportError: (state) => {
      state.exportError = null;
    },
    setResults: (state, action) => {
      state.results = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch compliance results
      .addCase(fetchComplianceResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplianceResults.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload;
        state.error = null;
      })
      .addCase(fetchComplianceResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Export evidence pack
      .addCase(exportEvidencePack.pending, (state) => {
        state.exportLoading = true;
        state.exportError = null;
      })
      .addCase(exportEvidencePack.fulfilled, (state, action) => {
        state.exportLoading = false;
        state.exportError = null;
        // Handle file download
        const { data, format } = action.payload;
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `wageguard-evidence-pack.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .addCase(exportEvidencePack.rejected, (state, action) => {
        state.exportLoading = false;
        state.exportError = action.payload;
      });
  },
});

export const { clearComplianceError, clearExportError, setResults } = complianceSlice.actions;
export default complianceSlice.reducer;
