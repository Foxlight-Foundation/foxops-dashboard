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
  retrievalQuality: { value: '94%', source: 'eval-001.json' },
  recentErrors: { count: 0, samples: [] },
  autoCapture: { lastAutoCaptureAt: null, captureSuccessCountWindow: 0, captureWindowMinutes: 60, lastCaptureError: null },
  pluginTelemetry: { windowMinutes: 60, captureAttempts: 0, captureSuccess: 0, captureNone: 0, captureFailed: 0, recallFailed: 0, modeInfer: 0, modeRaw: 0, lastCaptureMode: null, lastEndpoint: null, recent: [] },
  pluginLogs: { file: '/path/to/gateway.log', count: 0, lines: [] },
  stats: null,
};

describe('FoxMemorySection', () => {
  it('renders memory count stat card', () => {
    render(<FoxMemorySection foxmemory={mockFoxmemory} chartRange="7d" onChartRangeChange={() => {}} />, { wrapper });
    expect(screen.getByText('142')).toBeInTheDocument();
  });

  it('renders search count stat card', () => {
    render(<FoxMemorySection foxmemory={mockFoxmemory} chartRange="7d" onChartRangeChange={() => {}} />, { wrapper });
    expect(screen.getByText('37')).toBeInTheDocument();
  });

  it('renders healthy api status', () => {
    render(<FoxMemorySection foxmemory={mockFoxmemory} chartRange="7d" onChartRangeChange={() => {}} />, { wrapper });
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('renders no error samples message when empty', () => {
    render(<FoxMemorySection foxmemory={mockFoxmemory} chartRange="7d" onChartRangeChange={() => {}} />, { wrapper });
    expect(screen.getByText('No recent error samples found.')).toBeInTheDocument();
  });
});
