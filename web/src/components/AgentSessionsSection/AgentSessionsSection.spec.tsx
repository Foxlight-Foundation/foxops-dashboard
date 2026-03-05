import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AgentSessionsSection from './AgentSessionsSection';
import type { OpenclawSession } from '../../types';

const theme = createTheme();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
);

const activeSession: OpenclawSession = {
  key: 'agent:main:cron:abc:run:123',
  sessionId: 'session-active-1',
  agentId: 'main',
  ageMs: 60_000,
  model: 'gpt-4',
  totalTokens: 10000,
  contextTokens: 100000,
};

const staleSession: OpenclawSession = {
  key: 'agent:main:cron:def:run:456',
  sessionId: 'session-stale-1',
  agentId: 'main',
  ageMs: 50 * 60 * 60 * 1000,
  model: 'gpt-4',
  totalTokens: 5000,
  contextTokens: 100000,
};

const baseProps = {
  sessions: [activeSession, staleSession],
  activeSessions: [activeSession],
  staleSessions: [staleSession],
  killLoading: false,
  deleteLoading: false,
  onKill: vi.fn(),
  onDelete: vi.fn(),
};

describe('AgentSessionsSection', () => {
  it('shows active and stale counts in stat cards', () => {
    render(<AgentSessionsSection {...baseProps} />, { wrapper });
    expect(screen.getAllByText('active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('stale').length).toBeGreaterThan(0);
  });

  it('renders session rows', () => {
    render(<AgentSessionsSection {...baseProps} />, { wrapper });
    expect(screen.getByText('agent:main:cron:abc:run:123')).toBeInTheDocument();
    expect(screen.getByText('agent:main:cron:def:run:456')).toBeInTheDocument();
  });

  it('calls onKill when stop button clicked on active session', async () => {
    const user = userEvent.setup();
    const onKill = vi.fn();
    render(<AgentSessionsSection {...baseProps} onKill={onKill} />, { wrapper });
    await user.click(screen.getByRole('button', { name: /stop session/i }));
    expect(onKill).toHaveBeenCalledWith(activeSession);
  });

  it('calls onDelete when delete button clicked on stale session', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<AgentSessionsSection {...baseProps} onDelete={onDelete} />, { wrapper });
    await user.click(screen.getByRole('button', { name: /delete session/i }));
    expect(onDelete).toHaveBeenCalledWith(staleSession);
  });
});
