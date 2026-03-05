import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode, Section, ChartRange } from './types';

export interface UiState {
  mode: ThemeMode;
  section: Section;
  chartRange: ChartRange;
}

const initialState: UiState = {
  mode:
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  section: 'foxmemory',
  chartRange: '7d',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
    toggleMode(state) {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
    },
    setSection(state, action: PayloadAction<Section>) {
      state.section = action.payload;
    },
    setChartRange(state, action: PayloadAction<ChartRange>) {
      state.chartRange = action.payload;
    },
  },
});

export const { setMode, toggleMode, setSection, setChartRange } = uiSlice.actions;
export default uiSlice.reducer;
