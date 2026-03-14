import type { FoxmemoryResponse, FoxmemoryPromptsResponse } from '../../types';

export interface FoxMemoryAgentsViewProps {
  foxmemory: FoxmemoryResponse | undefined;
  prompts: FoxmemoryPromptsResponse | undefined;
  promptsLoading: boolean;
  onSaveExtractionPrompt: (prompt: string | null) => Promise<void>;
  onSaveUpdatePrompt: (prompt: string | null) => Promise<void>;
  onSaveGraphPrompt: (prompt: string | null) => Promise<void>;
  agentId?: string | null;
}
