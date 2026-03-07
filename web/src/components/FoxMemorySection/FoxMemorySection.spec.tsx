import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from '../../store';
import FoxMemorySection from './FoxMemorySection';
import type { FoxmemoryResponse } from '../../types';

const theme = createTheme();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
  </Provider>
);

const mockFoxmemory: FoxmemoryResponse = {
  ok: true,
  baseUrl: 'http://localhost:8082',
  userId: 'user@example.com',
  api: { ok: true, status: 200, endpoint: '/v2/health' },
  llmModel: 'gpt-4.1-nano',
  embedModel: 'text-embedding-3-small',
  ingestionQueueDepth: null,
  memoryCount: 142,
  memoriesByDay: [],
  memorySummary: { total: 142, byEvent: { ADD: 120, UPDATE: 18, DELETE: 4, NONE: 0 } },
  recentActivity: [],
  searches: { total: 37, avgResults: 5, avgTopScore: 0.82, avgLatencyMs: 310 },
  stats: null,
  diagnostics: { graphEnabled: true, graphLlmModel: 'gpt-4o-mini', neo4jUrl: 'bolt://neo4j:7687' },
};

describe('FoxMemorySection', () => {
  it('renders memory count stat card', () => {
    render(<FoxMemorySection foxmemory={mockFoxmemory} chartRange="7d" onChartRangeChange={() => {}} />, { wrapper });
    expect(screen.getByText('142')).toBeInTheDocument();
  });

  it('renders search count stat card', () => {
    render(<FoxMemorySection foxmemory={mockFoxmemory} chartRange="7d" onChartRangeChange={() => {}} />, { wrapper });
    expect(screen.getAllByText('37').length).toBeGreaterThan(0);
  });

  it('renders healthy api status', () => {
    render(<FoxMemorySection foxmemory={mockFoxmemory} chartRange="7d" onChartRangeChange={() => {}} />, { wrapper });
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('renders write mode mix section', () => {
    render(<FoxMemorySection foxmemory={mockFoxmemory} chartRange="7d" onChartRangeChange={() => {}} />, { wrapper });
    expect(screen.getByText('Write mode mix')).toBeInTheDocument();
  });
});
