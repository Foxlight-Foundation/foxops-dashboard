import { CircularProgress, MenuItem, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import Select from '@mui/material/Select';
import { useGetTenantsQuery, useGetAgentsQuery } from '../../services/dashboardApi';
import type { AgentSelectorProps } from './AgentSelector.types';

const CompactSelect = styled(Select)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 8,
  color: theme.palette.mode === 'dark' ? '#67748e' : 'rgba(255,255,255,0.85)',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.24)' : 'rgba(255,255,255,0.35)',
  },
  '& .MuiSvgIcon-root': {
    color: theme.palette.mode === 'dark' ? '#67748e' : 'rgba(255,255,255,0.6)',
    fontSize: 18,
  },
  '& .MuiSelect-select': {
    py: '6px',
    px: '12px',
  },
}));

const NONE_VALUE = '__none__';

const AgentSelector = ({ selectedAgentId, onAgentChange }: AgentSelectorProps) => {
  const { data: tenantsData, isLoading: tenantsLoading } = useGetTenantsQuery();
  const firstTenantId = tenantsData?.data?.[0]?.id;
  const { data: agentsData, isLoading: agentsLoading } = useGetAgentsQuery(firstTenantId!, {
    skip: !firstTenantId,
  });

  const loading = tenantsLoading || agentsLoading;
  const agents = agentsData?.data ?? [];

  if (loading) {
    return <CircularProgress size={16} sx={{ mx: 'auto', display: 'block', my: 1 }} />;
  }

  if (agents.length === 0) {
    return (
      <Typography variant="caption" sx={{ fontSize: 11, opacity: 0.5, px: 1.5, py: 1, display: 'block' }}>
        Default agent
      </Typography>
    );
  }

  return (
    <CompactSelect
      size="small"
      fullWidth
      value={selectedAgentId ?? NONE_VALUE}
      onChange={(e) => {
        const val = e.target.value as string;
        onAgentChange(val === NONE_VALUE ? null : val);
      }}
    >
      <MenuItem value={NONE_VALUE} sx={{ fontSize: 12 }}>Default (all)</MenuItem>
      {agents.map((agent) => (
        <MenuItem key={agent.id} value={agent.id} sx={{ fontSize: 12 }}>
          {agent.name}
        </MenuItem>
      ))}
    </CompactSelect>
  );
};

export default AgentSelector;
