import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import StatCard from './StatCard';

const theme = createTheme();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('StatCard', () => {
  it('renders the title and value', () => {
    render(
      <StatCard title="active" value={42} icon={<MemoryRoundedIcon />} iconColor="#fff" />,
      { wrapper }
    );
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders string values', () => {
    render(
      <StatCard title="status" value="healthy" icon={<MemoryRoundedIcon />} iconColor="#fff" />,
      { wrapper }
    );
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });
});
