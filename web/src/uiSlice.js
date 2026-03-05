import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mode:
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  section: 'acp',
  chartRange: '7d',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMode(state, action) {
      state.mode = action.payload;
    },
    toggleMode(state) {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
    },
    setSection(state, action) {
      state.section = action.payload;
    },
    setChartRange(state, action) {
      state.chartRange = action.payload;
    },
  },
});

export const { setMode, toggleMode, setSection, setChartRange } = uiSlice.actions;
export default uiSlice.reducer;
