import type { Section, ThemeMode } from '../../types';

export interface TopBarProps {
  section: Section;
  mode: ThemeMode;
  sessionCount: number;
  cronJobCount: number;
  foxmemoryBaseUrl: string | undefined;
  lastRefreshLabel: string;
  isLoading: boolean;
  apiErrorText: string;
  onRefresh: () => void;
  onToggleMode: () => void;
}
