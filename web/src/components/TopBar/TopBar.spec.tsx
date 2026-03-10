import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import TopBar from './TopBar';

const theme = createTheme();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
);

const baseProps = {
  section: 'acp' as const,
  mode: 'light' as const,
  sessionCount: 5,
  cronJobCount: 2,
  foxmemoryBaseUrl: 'http://localhost:8082',
  lastRefreshLabel: '12:00:00 PM',
  isLoading: false,
  apiErrorText: '',
  user: null,
  onRefresh: vi.fn(),
  onToggleMode: vi.fn(),
  onLogout: vi.fn(),
};

describe('TopBar', () => {
  it('shows correct title for acp section', () => {
    render(<TopBar {...baseProps} />, { wrapper });
    expect(screen.getByText('Agent Sessions')).toBeInTheDocument();
    expect(screen.getByText(/5 sessions/)).toBeInTheDocument();
  });

  it('shows correct title for cron section', () => {
    render(<TopBar {...baseProps} section="cron" />, { wrapper });
    expect(screen.getByText('Cron Jobs')).toBeInTheDocument();
    expect(screen.getByText(/2 jobs/)).toBeInTheDocument();
  });

  it('shows API error chip when apiErrorText is set', () => {
    render(<TopBar {...baseProps} apiErrorText="something broke" />, { wrapper });
    expect(screen.getByText('API error')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button clicked', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<TopBar {...baseProps} onRefresh={onRefresh} />, { wrapper });
    await user.click(screen.getByRole('button', { name: /refresh now/i }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});
