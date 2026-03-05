import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CronJobsSection from './CronJobsSection';
import type { CronJob } from '../../types';

const theme = createTheme();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
);

const job: CronJob = {
  id: 'job-001',
  agentId: 'main',
  name: 'My Test Job',
  enabled: true,
  schedule: { kind: 'every', everyMs: 900000 },
  payload: { kind: 'agentTurn', message: 'Do the thing' },
  state: {
    lastRunStatus: 'ok',
    lastRunAtMs: Date.now() - 5 * 60 * 1000,
    lastDurationMs: 38000,
    nextRunAtMs: Date.now() + 10 * 60 * 1000,
    consecutiveErrors: 0,
  },
};

describe('CronJobsSection', () => {
  it('renders job name', () => {
    render(<CronJobsSection jobs={[job]} />, { wrapper });
    expect(screen.getByText('My Test Job')).toBeInTheDocument();
  });

  it('shows schedule', () => {
    render(<CronJobsSection jobs={[job]} />, { wrapper });
    expect(screen.getByText('every 15m')).toBeInTheDocument();
  });

  it('expands row on click to show payload message', async () => {
    const user = userEvent.setup();
    render(<CronJobsSection jobs={[job]} />, { wrapper });
    await user.click(screen.getByText('My Test Job'));
    expect(await screen.findByText('Do the thing')).toBeInTheDocument();
  });

  it('collapses row on second click', async () => {
    const user = userEvent.setup();
    render(<CronJobsSection jobs={[job]} />, { wrapper });
    const row = screen.getByText('My Test Job');
    await user.click(row);
    await screen.findByText('Do the thing');
    await user.click(row);
    expect(screen.queryByText('Do the thing')).not.toBeInTheDocument();
  });
});
