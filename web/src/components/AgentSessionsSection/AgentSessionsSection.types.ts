import type { OpenclawSession } from '../../types';

export interface AgentSessionsSectionProps {
  sessions: OpenclawSession[];
  activeSessions: OpenclawSession[];
  staleSessions: OpenclawSession[];
  killLoading: boolean;
  deleteLoading: boolean;
  onKill: (session: OpenclawSession) => void;
  onDelete: (session: OpenclawSession) => void;
}
