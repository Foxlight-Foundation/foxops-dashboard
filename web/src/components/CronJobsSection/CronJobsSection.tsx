import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { GlassPaper } from '../shared/styled';
import AccessAlarmRoundedIcon from '@mui/icons-material/AccessAlarmRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StatCard from '../StatCard/StatCard';
import { MonoTableCell, grad } from '../shared/styled';
import { useGetCronRunsQuery, useRunCronJobMutation } from '../../services/dashboardApi';
import type { CronJobsSectionProps } from './CronJobsSection.types';
import type { CronJob, CronRunEntry } from '../../types';

const fmtMs = (ms?: number | null) => {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

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

const fmtSchedule = (job: CronJob) => {
  const s = job.schedule;
  if (!s) return '—';
  if (s.kind === 'every' && s.everyMs) return `every ${fmtMs(s.everyMs)}`;
  if (s.kind === 'cron' && s.cron) return s.cron;
  return s.kind ?? '—';
};

const runStatusColor = (status: string) =>
  status === 'ok' ? 'success' : status === 'error' ? 'error' : 'default';

const CronRunHistory = ({ jobId }: { jobId: string }) => {
  const { data, isLoading } = useGetCronRunsQuery({ id: jobId, limit: 10 }, { refetchOnMountOrArgChange: true });

  if (isLoading) return <Box sx={{ py: 1, display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={12} /><Typography variant="caption" color="text.secondary">Loading run history…</Typography></Box>;
  if (!data?.entries.length) return <Typography variant="caption" color="text.secondary">No run history available.</Typography>;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {data.total.toLocaleString()} total runs · showing last {data.entries.length}
      </Typography>
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: 11, py: 0.5 }}>Status</TableCell>
            <TableCell sx={{ fontSize: 11, py: 0.5 }}>Ran at</TableCell>
            <TableCell sx={{ fontSize: 11, py: 0.5 }}>Duration</TableCell>
            <TableCell sx={{ fontSize: 11, py: 0.5 }}>Summary / Error</TableCell>
            <TableCell sx={{ fontSize: 11, py: 0.5 }}>Tokens</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.entries.map((entry: CronRunEntry) => (
            <TableRow key={entry.ts}>
              <TableCell sx={{ py: 0.5 }}>
                <Chip size="small" label={entry.status} color={runStatusColor(entry.status) as 'success' | 'error' | 'default'} sx={{ fontSize: 10, height: 18 }} />
              </TableCell>
              <TableCell sx={{ py: 0.5, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                {new Date(entry.runAtMs).toLocaleString()}
              </TableCell>
              <TableCell sx={{ py: 0.5, fontFamily: 'monospace', fontSize: 11 }}>
                {fmtMs(entry.durationMs)}
              </TableCell>
              <TableCell sx={{ py: 0.5, fontSize: 11, color: entry.error ? 'error.main' : 'text.primary', fontFamily: entry.error ? 'monospace' : undefined, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Tooltip title={entry.error ?? entry.summary ?? ''} arrow>
                  <span>{entry.error ?? entry.summary ?? '—'}</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ py: 0.5, fontFamily: 'monospace', fontSize: 11 }}>
                {entry.usage?.total_tokens != null ? entry.usage.total_tokens.toLocaleString() : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
    </Box>
  );
};

const RunNowButton = ({ jobId, isError }: { jobId: string; isError: boolean }) => {
  const [runCronJob, { isLoading, error }] = useRunCronJobMutation();
  const [lastResult, setLastResult] = useState<{ ran: boolean; reason: string | null } | null>(null);

  const handleRun = async () => {
    setLastResult(null);
    const result = await runCronJob(jobId).unwrap().catch(() => null);
    if (result) setLastResult({ ran: result.ran, reason: result.reason });
  };

  const resultMsg = lastResult
    ? lastResult.ran
      ? '✓ fired'
      : `skipped${lastResult.reason ? ` — ${lastResult.reason}` : ''}`
    : error
    ? '✗ error'
    : null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button
        size="small"
        variant={isError ? 'contained' : 'outlined'}
        color={isError ? 'error' : 'primary'}
        startIcon={isLoading ? <CircularProgress size={12} color="inherit" /> : <PlayArrowRoundedIcon fontSize="small" />}
        disabled={isLoading}
        onClick={handleRun}
        sx={{ fontSize: 12, py: 0.4 }}
      >
        Run now
      </Button>
      {resultMsg && (
        <Typography variant="caption" sx={{ color: lastResult?.ran ? 'success.main' : 'text.secondary' }}>
          {resultMsg}
        </Typography>
      )}
    </Box>
  );
};

const CronJobsSection = ({ jobs }: CronJobsSectionProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const erroredCount = jobs.filter((j) => {
    const s = j.state?.lastRunStatus ?? j.state?.lastStatus;
    return s === 'error';
  }).length;

  return (
    <>
      <Grid container spacing={1.5} mb={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="total jobs" value={jobs.length} icon={<AccessAlarmRoundedIcon fontSize="small" />} iconColor={grad('#5e72e4', '#825ee4')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="enabled" value={jobs.filter((j) => j.enabled).length} icon={<CheckCircleRoundedIcon fontSize="small" />} iconColor={grad('#2dce89', '#2dbd5a')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="disabled" value={jobs.filter((j) => !j.enabled).length} icon={<MemoryRoundedIcon fontSize="small" />} iconColor={grad('#8898aa', '#6c7a8d')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="errored"
            value={erroredCount}
            icon={<ErrorRoundedIcon fontSize="small" />}
            iconColor={erroredCount > 0 ? grad('#f5365c', '#f56036') : grad('#2dce89', '#2dbd5a')}
          />
        </Grid>
      </Grid>

      <TableContainer component={GlassPaper} sx={{ borderRadius: 1, overflow: 'hidden' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>Status</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Last run</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Next run</TableCell>
              <TableCell>Errors</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job: CronJob) => {
              const lastStatus = job.state?.lastRunStatus ?? job.state?.lastStatus;
              const statusColor = lastStatus === 'ok' ? 'success' : lastStatus === 'error' ? 'error' : 'default';
              const now = Date.now();
              const nextRunIn = job.state?.nextRunAtMs ? job.state.nextRunAtMs - now : null;
              const expanded = expandedId === job.id;

              return (
                <React.Fragment key={job.id}>
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer', '& > *': { borderBottom: expanded ? 0 : undefined } }}
                    onClick={() => setExpandedId(expanded ? null : job.id)}
                  >
                    <TableCell padding="checkbox">
                      <IconButton size="small">
                        {expanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={job.enabled ? (lastStatus ?? 'enabled') : 'disabled'}
                        color={job.enabled ? statusColor : 'default'}
                        variant={job.enabled ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.name}
                    </TableCell>
                    <MonoTableCell>{fmtSchedule(job)}</MonoTableCell>
                    <TableCell>{fmtAge(job.state?.lastRunAtMs != null ? now - job.state.lastRunAtMs : undefined)}</TableCell>
                    <TableCell>{fmtMs(job.state?.lastDurationMs)}</TableCell>
                    <TableCell>{nextRunIn != null ? (nextRunIn > 0 ? `in ${fmtMs(nextRunIn)}` : 'now') : '—'}</TableCell>
                    <TableCell>{job.state?.consecutiveErrors ?? 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 0, borderBottom: expanded ? undefined : 0 }}>
                      <Collapse in={expanded} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 1.5, px: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">ID</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{job.id}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Agent</Typography>
                            <Typography variant="body2">{job.agentId}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Created</Typography>
                            <Typography variant="body2">{job.createdAtMs ? `${new Date(job.createdAtMs as number).toLocaleString()} (${fmtAge(now - (job.createdAtMs as number))})` : '—'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Last updated</Typography>
                            <Typography variant="body2">{job.updatedAtMs ? `${fmtAge(now - (job.updatedAtMs as number))}` : '—'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Session target</Typography>
                            <Typography variant="body2">{job.sessionTarget ?? '—'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Wake mode</Typography>
                            <Typography variant="body2">{job.wakeMode ?? '—'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Delivery</Typography>
                            <Typography variant="body2">
                              {job.delivery?.mode ?? '—'}{job.delivery?.channel ? ` / ${job.delivery.channel}` : ''}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Last delivery</Typography>
                            <Typography variant="body2">{job.state?.lastDeliveryStatus ?? '—'}</Typography>
                          </Box>
                          {job.state?.lastError && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                              <Typography variant="caption" color="error" display="block" fontWeight={600}>Last error</Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, color: 'error.main', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {job.state.lastError}
                              </Typography>
                            </Box>
                          )}
                          <Box sx={{ gridColumn: '1 / -1' }}>
                            <Typography variant="caption" color="text.secondary" display="block">Payload message</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {job.payload?.message ?? '—'}
                            </Typography>
                          </Box>
                        </Box>
                        {job.enabled && (
                          <Box sx={{ px: 2, pt: 0.5, pb: 0 }}>
                            <RunNowButton jobId={job.id} isError={lastStatus === 'error'} />
                          </Box>
                        )}
                        <Divider sx={{ mt: 1.5, mb: 1 }} />
                        <Box sx={{ px: 2, pb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>
                            Run history (last 10)
                          </Typography>
                          <CronRunHistory jobId={job.id} />
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default CronJobsSection;
