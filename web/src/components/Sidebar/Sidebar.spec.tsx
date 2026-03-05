import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Sidebar from './Sidebar';

const theme = createTheme();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
);

describe('Sidebar', () => {
  it('renders all nav items', () => {
    render(<Sidebar section="acp" onSectionChange={() => {}} />, { wrapper });
    expect(screen.getByText('FoxMemory')).toBeInTheDocument();
    expect(screen.getByText('Agent Sessions')).toBeInTheDocument();
    expect(screen.getByText('Cron Jobs')).toBeInTheDocument();
  });

  it('calls onSectionChange when a nav item is clicked', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    render(<Sidebar section="acp" onSectionChange={onSectionChange} />, { wrapper });
    await user.click(screen.getByText('FoxMemory'));
    expect(onSectionChange).toHaveBeenCalledWith('foxmemory');
  });
});
