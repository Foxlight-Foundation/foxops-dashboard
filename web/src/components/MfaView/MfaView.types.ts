import type { AuthUser } from '../../types';

export interface MfaViewProps {
  user: AuthUser;
  mode: 'setup' | 'verify';
  onSuccess: () => void;
}
