import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import TopBar from './TopBar';

const theme = createTheme({ typography: { fontFamily: '"Ubuntu", sans-serif' } });

const meta: Meta<typeof TopBar> = {
  title: 'Components/TopBar',
  component: TopBar,
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TopBar>;

const base = {
  mode: 'light' as const,
  sessionCount: 8,
  cronJobCount: 2,
  foxmemoryBaseUrl: 'http://192.168.0.118:8082',
  lastRefreshLabel: '2:34:01 PM',
  isLoading: false,
  apiErrorText: '',
  onRefresh: () => {},
  onToggleMode: () => {},
};

export const AgentSessions: Story = { args: { ...base, section: 'acp' } };
export const CronJobs: Story = { args: { ...base, section: 'cron' } };
export const FoxMemory: Story = { args: { ...base, section: 'foxmemory' } };
export const Loading: Story = { args: { ...base, section: 'acp', isLoading: true } };
export const WithError: Story = { args: { ...base, section: 'acp', apiErrorText: 'Connection refused on :8787' } };
