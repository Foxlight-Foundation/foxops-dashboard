import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import FoxMemoryAgentsView from './FoxMemoryAgentsView';
import type { FoxmemoryResponse, FoxmemoryPromptsResponse } from '../../types';

const theme = createTheme({ typography: { fontFamily: '"Ubuntu", sans-serif' } });

const meta: Meta<typeof FoxMemoryAgentsView> = {
  title: 'Components/FoxMemoryAgentsView',
  component: FoxMemoryAgentsView,
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ p: 3 }}>
          <Story />
        </Box>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FoxMemoryAgentsView>;

const foxmemory = { llmModel: 'gpt-4.1-nano', embedModel: 'text-embedding-3-small' } as unknown as FoxmemoryResponse;

const defaultEffective = 'You are a Personal Information Organizer… (built-in default prompt)';

const promptsDefault: FoxmemoryPromptsResponse = {
  ok: true,
  extractionPrompt: { prompt: null, effective_prompt: defaultEffective, source: 'default', persisted: true },
  updatePrompt: { prompt: null, effective_prompt: defaultEffective, source: 'default', persisted: true },
  graphPrompt: { prompt: null, effective_prompt: defaultEffective, source: 'default', persisted: false },
};

const promptsCustom: FoxmemoryPromptsResponse = {
  ok: true,
  extractionPrompt: { prompt: 'Extract only factual preferences, habits, and goals from the user. Ignore assistant messages.', effective_prompt: 'Extract only factual preferences, habits, and goals from the user. Ignore assistant messages.', source: 'persisted', persisted: true },
  updatePrompt: { prompt: null, effective_prompt: defaultEffective, source: 'default', persisted: true },
  graphPrompt: { prompt: null, effective_prompt: defaultEffective, source: 'default', persisted: false },
};

const noop = async () => {};

export const DefaultPrompts: Story = {
  args: { foxmemory, prompts: promptsDefault, promptsLoading: false, onSaveExtractionPrompt: noop, onSaveUpdatePrompt: noop, onSaveGraphPrompt: noop },
};

export const CustomExtractionPrompt: Story = {
  args: { foxmemory, prompts: promptsCustom, promptsLoading: false, onSaveExtractionPrompt: noop, onSaveUpdatePrompt: noop, onSaveGraphPrompt: noop },
};

export const Loading: Story = {
  args: { foxmemory, prompts: undefined, promptsLoading: true, onSaveExtractionPrompt: noop, onSaveUpdatePrompt: noop, onSaveGraphPrompt: noop },
};
