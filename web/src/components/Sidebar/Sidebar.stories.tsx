import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Sidebar from './Sidebar';

const theme = createTheme({ typography: { fontFamily: '"Ubuntu", sans-serif' } });

const meta: Meta<typeof Sidebar> = {
  title: 'Components/Sidebar',
  component: Sidebar,
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ display: 'flex', height: '100vh' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const AcpSelected: Story = {
  args: { section: 'acp', onSectionChange: () => {} },
};

export const CronSelected: Story = {
  args: { section: 'cron', onSectionChange: () => {} },
};

export const FoxMemorySelected: Story = {
  args: { section: 'foxmemory', onSectionChange: () => {} },
};
