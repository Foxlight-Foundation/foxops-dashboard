import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import FoxMemorySection from './FoxMemorySection';
import type { FoxmemoryResponse } from '../../types';

const theme = createTheme();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
);

const mockFoxmemory: FoxmemoryResponse = {
  ok: true,
  baseUrl: 'http://localhost:8082',
  userId: 'user@example.com',
  api: { ok: true, status: 200, endpoint: '/health' },
  ingestionQueueDepth: 3,
  memoryCount: 142,
  memoriesByDay: [],
  memoriesByDay7d: [],
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

  it('renders retrieval quality', () => {
    render(<FoxMemorySection foxmemory={mockFoxmemory} chartRange="7d" onChartRangeChange={() => {}} />, { wrapper });
    expect(screen.getByText('94%')).toBeInTheDocument();
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
