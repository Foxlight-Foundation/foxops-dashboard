import type { AuthUser, Section, ThemeMode } from '../../types';

export interface TopBarProps {
  section: Section;
  mode: ThemeMode;
  sessionCount: number;
  cronJobCount: number;
  foxmemoryBaseUrl: string | undefined;
  lastRefreshLabel: string;
  isLoading: boolean;
  apiErrorText: string;
  user: AuthUser | null;
  onRefresh: () => void;
  onToggleMode: () => void;
  onLogout: () => void;
}
