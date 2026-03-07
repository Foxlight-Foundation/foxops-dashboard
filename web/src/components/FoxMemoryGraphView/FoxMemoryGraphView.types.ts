import type { FoxmemoryGraphStats, FoxmemoryDiagnostics } from '../../types';

export interface FoxMemoryGraphViewProps {
  stats: FoxmemoryGraphStats | undefined;
  diagnostics: FoxmemoryDiagnostics | null | undefined;
  loading: boolean;
}
