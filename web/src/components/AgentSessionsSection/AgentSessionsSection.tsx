import { Box, Chip, Grid, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';
import StatCard from '../StatCard/StatCard';
import { MonoTableCell, grad } from '../shared/styled';
import type { AgentSessionsSectionProps } from './AgentSessionsSection.types';
import type { OpenclawSession } from '../../types';

const fmtAge = (ageMs?: number) => {
  if (ageMs == null) return '—';
  const s = Math.floor(ageMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fmtTokens = (s: OpenclawSession) => {
  if (s.totalTokens == null || s.contextTokens == null) return '—';
  const pct = Math.round((s.totalTokens / s.contextTokens) * 100);
  return `${Math.round(s.totalTokens / 1000)}k / ${Math.round(s.contextTokens / 1000)}k (${pct}%)`;
};

const AgentSessionsSection = ({
  sessions,
  activeSessions,
  staleSessions,
  killLoading,
  deleteLoading,
  onKill,
  onDelete,
}: AgentSessionsSectionProps) => {
  const MS_12H = 12 * 60 * 60 * 1000;
  const isActive = (s: OpenclawSession) => (s.ageMs ?? Infinity) < MS_12H;

  return (
    <>
      <Grid container spacing={1.5} mb={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="active" value={activeSessions.length} icon={<CheckCircleRoundedIcon fontSize="small" />} iconColor={grad('#2dce89', '#2dbd5a')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="stale" value={staleSessions.length} icon={<MemoryRoundedIcon fontSize="small" />} iconColor={grad('#8898aa', '#6c7a8d')} />
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ borderRadius: 1, overflow: 'hidden' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Model</TableCell>
              <TableCell>Tokens</TableCell>
              <TableCell>Session ID</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((s: OpenclawSession) => {
              const active = isActive(s);
              return (
                <TableRow key={s.sessionId} hover>
                  <TableCell>
                    <Chip size="small" label={active ? 'active' : 'stale'} color={active ? 'success' : 'default'} variant={active ? 'filled' : 'outlined'} />
                  </TableCell>
                  <MonoTableCell>{s.key}</MonoTableCell>
                  <TableCell>{fmtAge(s.ageMs)}</TableCell>
                  <TableCell>{s.model ?? '—'}</TableCell>
                  <TableCell>{fmtTokens(s)}</TableCell>
                  <MonoTableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sessionId}</MonoTableCell>
                  <TableCell align="right">
                    {active ? (
                      <Tooltip title="Send stop command to active session" arrow>
                        <Box component="span">
                          <IconButton aria-label="stop session" color="error" size="small" disabled={killLoading} onClick={() => onKill(s)}>
                            <StopCircleRoundedIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Delete stale session + transcript" arrow>
                        <Box component="span">
                          <IconButton aria-label="delete session" color="default" size="small" disabled={deleteLoading} onClick={() => onDelete(s)}>
                            <DeleteForeverIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default AgentSessionsSection;
