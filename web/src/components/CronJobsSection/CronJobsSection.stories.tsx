import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CronJobsSection from './CronJobsSection';
import type { CronJob } from '../../types';

const theme = createTheme({ typography: { fontFamily: '"Ubuntu", sans-serif' } });

const meta: Meta<typeof CronJobsSection> = {
  title: 'Components/CronJobsSection',
  component: CronJobsSection,
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
type Story = StoryObj<typeof CronJobsSection>;

const now = Date.now();

const jobs: CronJob[] = [
  {
    id: 'job-001',
    agentId: 'main',
    name: 'Foxmemory progress pulse',
    enabled: true,
    schedule: { kind: 'every', everyMs: 900000 },
    sessionTarget: 'isolated',
    wakeMode: 'now',
    payload: { kind: 'agentTurn', message: 'Execute one progress pulse…', timeoutSeconds: 120 },
    delivery: { mode: 'announce', channel: 'last' },
    state: { lastRunStatus: 'ok', lastRunAtMs: now - 38000, lastDurationMs: 38439, nextRunAtMs: now + 860000, consecutiveErrors: 0, lastDeliveryStatus: 'delivered' },
  },
  {
    id: 'job-002',
    agentId: 'main',
    name: 'Auto heartbeat learning pulse',
    enabled: true,
    schedule: { kind: 'every', everyMs: 10800000 },
    sessionTarget: 'isolated',
    wakeMode: 'now',
    payload: { kind: 'agentTurn', message: 'Run one heartbeat cycle…', timeoutSeconds: 90 },
    delivery: { mode: 'announce' },
    state: { lastRunStatus: 'ok', lastRunAtMs: now - 3600000, lastDurationMs: 67399, nextRunAtMs: now + 7200000, consecutiveErrors: 0, lastDeliveryStatus: 'not-delivered' },
  },
  {
    id: 'job-003',
    agentId: 'main',
    name: 'Disabled old job',
    enabled: false,
    schedule: { kind: 'every', everyMs: 3600000 },
    state: { lastRunStatus: 'error', consecutiveErrors: 3 },
  },
];

export const Default: Story = { args: { jobs } };
export const Empty: Story = { args: { jobs: [] } };
