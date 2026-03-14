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
  api: { ok: true, status: 200, endpoint: '/v2/health' },
  llmModel: 'gpt-4.1-nano',
  embedModel: 'text-embedding-3-small',
  memoryCount: 347,
  memoriesByDay: [
    { date: '2026-02-27', ADD: 10, UPDATE: 2, DELETE: 0, NONE: 0 },
    { date: '2026-02-28', ADD: 6, UPDATE: 2, DELETE: 0, NONE: 0 },
    { date: '2026-03-01', ADD: 15, UPDATE: 4, DELETE: 0, NONE: 0 },
    { date: '2026-03-02', ADD: 4, UPDATE: 1, DELETE: 0, NONE: 0 },
    { date: '2026-03-03', ADD: 18, UPDATE: 4, DELETE: 0, NONE: 0 },
    { date: '2026-03-04', ADD: 11, UPDATE: 3, DELETE: 0, NONE: 0 },
    { date: '2026-03-05', ADD: 5, UPDATE: 2, DELETE: 0, NONE: 0 },
  ],
  memorySummary: { total: 347, byEvent: { ADD: 302, UPDATE: 42, DELETE: 3, NONE: 0 }, writeLatency: { avgMs: 18500, minMs: 4200, maxMs: 85000 } },
  recentActivity: [
    { ts: '2026-03-05T14:22:11Z', event: 'ADD', memoryId: 'b849671c-1234', preview: 'User prefers concise answers.', latencyMs: 18200, inferMode: true },
    { ts: '2026-03-05T13:10:05Z', event: 'UPDATE', memoryId: 'a123456c-5678', preview: 'assistant: Done ✅', latencyMs: 9800, inferMode: true },
  ],
  searches: { total: 142, avgResults: 5, avgTopScore: 0.759, avgLatencyMs: 376 },
  stats: { writesByMode: { infer: 3, raw: 1 }, memoryEvents: { ADD: 12, UPDATE: 3, DELETE: 1, NONE: 0 } },
  diagnostics: { graphEnabled: true, graphLlmModel: 'gpt-4o-mini', neo4jUrl: 'bolt://neo4j:7687' },
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
