import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import FoxMemorySection from './FoxMemorySection';
import type { FoxmemoryResponse } from '../../types';

const theme = createTheme({ typography: { fontFamily: '"Ubuntu", sans-serif' } });

const meta: Meta<typeof FoxMemorySection> = {
  title: 'Components/FoxMemorySection',
  component: FoxMemorySection,
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FoxMemorySection>;

const foxmemory: FoxmemoryResponse = {
  ok: true,
  baseUrl: 'http://192.168.0.118:8082',
  userId: 'user@example.com',
  api: { ok: true, status: 200, endpoint: '/health' },
  ingestionQueueDepth: 2,
  memoryCount: 347,
  memoriesByDay: [
    { day: '2026-02-27', count: 12 },
    { day: '2026-02-28', count: 8 },
    { day: '2026-03-01', count: 19 },
    { day: '2026-03-02', count: 5 },
    { day: '2026-03-03', count: 22 },
    { day: '2026-03-04', count: 14 },
    { day: '2026-03-05', count: 7 },
  ],
  memoriesByDay7d: [
    { day: '2026-02-27', count: 12 },
    { day: '2026-02-28', count: 8 },
    { day: '2026-03-01', count: 19 },
    { day: '2026-03-02', count: 5 },
    { day: '2026-03-03', count: 22 },
    { day: '2026-03-04', count: 14 },
    { day: '2026-03-05', count: 7 },
  ],
  retrievalQuality: { value: '91%', source: 'root-cause-eval-001.json' },
  recentErrors: { count: 0, samples: [] },
  autoCapture: { lastAutoCaptureAt: '2026-03-05T14:22:11Z', captureSuccessCountWindow: 4, captureWindowMinutes: 60, lastCaptureError: null },
  pluginTelemetry: { windowMinutes: 60, captureAttempts: 5, captureSuccess: 4, captureNone: 1, captureFailed: 0, recallFailed: 0, modeInfer: 3, modeRaw: 1, lastCaptureMode: 'infer', lastEndpoint: '/v2/memories', recent: [] },
  pluginLogs: { file: '/root/.openclaw/logs/gateway.log', count: 0, lines: [] },
  stats: { writesByMode: { infer: 3, raw: 1 }, memoryEvents: { ADD: 12, UPDATE: 3, DELETE: 1, NONE: 0 } },
};

export const Default: Story = {
  args: { foxmemory, chartRange: '7d', onChartRangeChange: () => {} },
};

export const Degraded: Story = {
  args: {
    foxmemory: { ...foxmemory, api: { ok: false, status: 503, endpoint: '/health' } },
    chartRange: '7d',
    onChartRangeChange: () => {},
  },
};

export const Loading: Story = {
  args: { foxmemory: undefined, chartRange: '7d', onChartRangeChange: () => {} },
};
