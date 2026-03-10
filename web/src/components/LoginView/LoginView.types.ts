import type { AuthUser } from '../../types';

export interface LoginViewProps {
  error?: string | null;
  onAuth?: (user: AuthUser, mfaEnrolled: boolean, mfaVerified: boolean) => void;
}
