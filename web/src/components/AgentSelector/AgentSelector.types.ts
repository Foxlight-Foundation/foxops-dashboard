export interface AgentSelectorProps {
  selectedAgentId: string | null;
  onAgentChange: (agentId: string | null) => void;
}
