import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import FoxMemoryAgentsView from './FoxMemoryAgentsView';
import type { FoxmemoryPromptsResponse, FoxmemoryResponse } from '../../types';

const theme = createTheme();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>
);

const mockFoxmemory = {
  llmModel: 'gpt-4.1-nano',
  embedModel: 'text-embedding-3-small',
} as unknown as FoxmemoryResponse;

const mockPrompts: FoxmemoryPromptsResponse = {
  ok: true,
  extractionPrompt: { prompt: null, effective_prompt: 'You are a Personal Information Organizer…', source: 'default', persisted: true },
  updatePrompt: { prompt: 'Custom update prompt text', effective_prompt: 'Custom update prompt text', source: 'persisted', persisted: true },
  graphPrompt: { prompt: null, effective_prompt: 'Extract graph entities…', source: 'default', persisted: false },
};

const noop = async () => {};

describe('FoxMemoryAgentsView', () => {
  it('renders model chips', () => {
    render(<FoxMemoryAgentsView foxmemory={mockFoxmemory} prompts={mockPrompts} promptsLoading={false} onSaveExtractionPrompt={noop} onSaveUpdatePrompt={noop} onSaveGraphPrompt={noop} />, { wrapper });
    expect(screen.getByText('gpt-4.1-nano')).toBeInTheDocument();
    expect(screen.getByText('text-embedding-3-small')).toBeInTheDocument();
  });

  it('renders Call 1 and Call 2 editors', () => {
    render(<FoxMemoryAgentsView foxmemory={mockFoxmemory} prompts={mockPrompts} promptsLoading={false} onSaveExtractionPrompt={noop} onSaveUpdatePrompt={noop} onSaveGraphPrompt={noop} />, { wrapper });
    expect(screen.getByText('Call 1 — Fact Extraction')).toBeInTheDocument();
    expect(screen.getByText('Call 2 — Update Decision')).toBeInTheDocument();
  });

  it('shows spinner when loading and no prompts', () => {
    render(<FoxMemoryAgentsView foxmemory={mockFoxmemory} prompts={undefined} promptsLoading={true} onSaveExtractionPrompt={noop} onSaveUpdatePrompt={noop} onSaveGraphPrompt={noop} />, { wrapper });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows effective prompt text in disabled textfield', () => {
    render(<FoxMemoryAgentsView foxmemory={mockFoxmemory} prompts={mockPrompts} promptsLoading={false} onSaveExtractionPrompt={noop} onSaveUpdatePrompt={noop} onSaveGraphPrompt={noop} />, { wrapper });
    expect(screen.getByDisplayValue('Custom update prompt text')).toBeDisabled();
  });
});
