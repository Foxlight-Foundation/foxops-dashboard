import type { Meta, StoryObj } from '@storybook/react';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import StatCard from './StatCard';

const theme = createTheme({ typography: { fontFamily: '"Ubuntu", sans-serif' } });

const meta: Meta<typeof StatCard> = {
  title: 'Components/StatCard',
  component: StatCard,
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ width: 280, padding: 16 }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Active: Story = {
  args: {
    title: 'active sessions',
    value: 7,
    icon: <CheckCircleRoundedIcon fontSize="small" />,
    iconColor: 'linear-gradient(135deg, #2dce89 0%, #2dbd5a 100%)',
  },
};

export const Degraded: Story = {
  args: {
    title: 'api health',
    value: 'degraded',
    icon: <MemoryRoundedIcon fontSize="small" />,
    iconColor: 'linear-gradient(135deg, #f5365c 0%, #f56036 100%)',
  },
};
