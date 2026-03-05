import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AgentSessionsSection from './AgentSessionsSection';
import type { OpenclawSession } from '../../types';

const theme = createTheme({ typography: { fontFamily: '"Ubuntu", sans-serif' } });

const meta: Meta<typeof AgentSessionsSection> = {
  title: 'Components/AgentSessionsSection',
  component: AgentSessionsSection,
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
type Story = StoryObj<typeof AgentSessionsSection>;

const active: OpenclawSession = {
  key: 'agent:main:cron:abc-123:run:run-001',
  sessionId: 'aaa-bbb-ccc',
  agentId: 'main',
  ageMs: 5 * 60 * 1000,
  model: 'gpt-5.3-codex',
  totalTokens: 48000,
  contextTokens: 272000,
};

const stale: OpenclawSession = {
  key: 'agent:main:cron:old-job:run:run-099',
  sessionId: 'ddd-eee-fff',
  agentId: 'main',
  ageMs: 30 * 60 * 60 * 1000,
  model: 'gpt-4o',
  totalTokens: 12000,
  contextTokens: 128000,
};

export const Default: Story = {
  args: {
    sessions: [active, stale],
    activeSessions: [active],
    staleSessions: [stale],
    killLoading: false,
    deleteLoading: false,
    onKill: () => {},
    onDelete: () => {},
  },
};

export const Empty: Story = {
  args: {
    sessions: [],
    activeSessions: [],
    staleSessions: [],
    killLoading: false,
    deleteLoading: false,
    onKill: () => {},
    onDelete: () => {},
  },
};
