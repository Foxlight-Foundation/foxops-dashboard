import React, { useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  Container,
  CssBaseline,
  Divider,
  Drawer,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Tooltip,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { alpha, createTheme, styled, ThemeProvider } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import AccessAlarmRoundedIcon from '@mui/icons-material/AccessAlarmRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, PieChart, Pie, Cell } from 'recharts';
import { setSection, setChartRange, toggleMode } from './uiSlice';
import {
  useGetSessionsQuery,
  useGetFoxmemoryOverviewQuery,
  useGetCronsQuery,
  useKillSessionMutation,
  useDeleteSessionMutation,
} from './services/dashboardApi';
import type { RootState } from './store';
import type { OpenclawSession, CronJob, Notice, ChartRange } from './types';

const DRAWER_WIDTH = 250;


// ── Styled components ──────────────────────────────────────────────────────────

const AppShell = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const SidebarDrawer = styled(Drawer)(({ theme }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    borderRight: 0,
    padding: theme.spacing(2),
    boxShadow:
      theme.palette.mode === 'dark'
        ? '4px 0 16px rgba(0,0,0,0.4)'
        : '4px 0 16px rgba(0,0,0,0.06)',
  },
}));

const LogoBar = styled(Box)({
  height: 44,
  borderRadius: 10,
  background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 10,
  paddingRight: 10,
  marginBottom: 8,
});

const LogoAvatar = styled(Box)({
  marginRight: 8,
  borderRadius: '50%',
  backgroundColor: '#fff',
  display: 'grid',
  placeItems: 'center',
  padding: '3px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
});

const GlassAppBar = styled(AppBar)(({ theme }) => ({
  backdropFilter: 'blur(16px)',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: alpha(theme.palette.background.default, 0.72),
  height: '78px',
  justifyContent: 'center'
}));

const StyledStatCard = styled(Card)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 4px 20px rgba(0,0,0,0.35)'
      : '0 4px 20px rgba(0,0,0,0.07)',
}));

const StatCardContent = styled(CardContent)({
  padding: 16,
  '&:last-child': { paddingBottom: 16 },
});

const StatCardIconBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'iconColor',
})<{ iconColor: string }>(({ iconColor }) => ({
  width: 56,
  height: 56,
  borderRadius: 10,
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  color: 'white',
  background: iconColor,
  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
}));

const MonoTableCell = styled(TableCell)({
  fontFamily: 'monospace',
  fontSize: 12,
});

const LogPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'maxH',
})<{ maxH?: number }>(({ theme, maxH = 140 }) => ({
  padding: theme.spacing(1.5),
  maxHeight: maxH,
  overflow: 'auto',
  backgroundColor: theme.palette.background.default,
}));

const LogoBox = styled(Box)({
  padding: '0 0 8px'
});

// ── Sub-components ─────────────────────────────────────────────────────────────


interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconColor: string;
}

const StatCard = ({ title, value, icon, iconColor }: StatCardProps) => {
  return (
    <StyledStatCard elevation={0}>
      <StatCardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <StatCardIconBox iconColor={iconColor}>{icon}</StatCardIconBox>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', display: 'block' }}
            >
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.25, mt: 0.25 }}>
              {value}
            </Typography>
          </Box>
        </Box>
      </StatCardContent>
    </StyledStatCard>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type RtkError = { data?: { error?: string }; error?: string; message?: string } | undefined;

const App = () => {
  const dispatch = useDispatch();
  const { mode, section, chartRange } = useSelector((s: RootState) => s.ui);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [expandedCronId, setExpandedCronId] = useState<string | null>(null);

  const {
    data: sessionsData,
    isFetching: sessionsFetching,
    isError: sessionsIsError,
    error: sessionsError,
    refetch: refetchSessions,
    fulfilledTimeStamp: sessionsFulfilledAt,
  } = useGetSessionsQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: foxmemory,
    isFetching: foxLoading,
    isError: foxIsError,
    error: foxError,
    refetch: refetchFox,
    fulfilledTimeStamp: foxFulfilledAt,
  } = useGetFoxmemoryOverviewQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: cronsData,
    isFetching: cronsFetching,
    refetch: refetchCrons,
    fulfilledTimeStamp: cronsFulfilledAt,
  } = useGetCronsQuery(undefined, {
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const [killSession, { isLoading: killLoading }] = useKillSessionMutation();
  const [deleteSession, { isLoading: deleteLoading }] = useDeleteSessionMutation();

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === 'dark' ? '#5e72e4' : '#344767' },
          background: mode === 'dark' ? { default: '#111827', paper: '#1f2937' } : { default: '#f8f9fa', paper: '#fff' },
        },
        shape: { borderRadius: 10 },
        typography: { fontFamily: '"Ubuntu", sans-serif' },
      }),
    [mode],
  );

  const grad = (a: string, b: string) => `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;

  const onManualRefresh = () => {
    if (section === 'acp') refetchSessions();
    else if (section === 'cron') refetchCrons();
    else refetchFox();
  };

  const onKill = async (session: OpenclawSession) => {
    const reason = window.prompt('Reason for kill request?', 'Manual kill requested from dashboard');
    if (reason === null) return;
    try {
      const json = await killSession({ sessionKey: session.key, sessionId: session.sessionId, reason }).unwrap();
      setNotice({
        severity: json.immediateKillSucceeded ? 'success' : 'warning',
        text: json.immediateKillSucceeded
          ? `Stop command sent. ${json.note || ''}`
          : `Kill queued. ${json.note || ''}`,
      });
    } catch (e) {
      const err = e as RtkError;
      setNotice({ severity: 'error', text: `Kill request failed: ${String(err?.data?.error || err?.message || e)}` });
    }
  };

  const onDelete = async (session: OpenclawSession) => {
    if (!window.confirm(`Delete stale session?\n\n${session.key}`)) return;
    try {
      await deleteSession({ sessionKey: session.key, sessionId: session.sessionId }).unwrap();
      setNotice({ severity: 'success', text: `Session deleted: ${session.key}` });
    } catch (e) {
      const err = e as RtkError;
      setNotice({ severity: 'error', text: `Delete failed: ${String(err?.data?.error || err?.message || e)}` });
    }
  };

  const MS_12H = 12 * 60 * 60 * 1000;
  const isExcluded = (s: OpenclawSession) => ['main', 'telegram', 'heartbeat'].includes(s.key.split(':')[2] ?? '');
  const isActive = (s: OpenclawSession) => (s.ageMs ?? Infinity) < MS_12H;

  const allSessions = sessionsData?.sessions || [];
  const sessions = allSessions.filter((s) => !isExcluded(s));
  const activeSessions = sessions.filter(isActive);
  const staleSessions = sessions.filter((s) => !isActive(s));

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

  const chartData = useMemo(() => {
    if (!foxmemory) return [];
    if (chartRange === 'all') return foxmemory.memoriesByDay || [];
    if (chartRange === '30d') {
      const all = foxmemory.memoriesByDay || [];
      const map = Object.fromEntries(all.map((d) => [d.day, d.count]));
      const out: { day: string; count: number }[] = [];
      const now = new Date();
      for (let i = 29; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i);
        const day = d.toISOString().slice(0, 10);
        out.push({ day, count: map[day] || 0 });
      }
      return out;
    }
    return foxmemory.memoriesByDay7d || [];
  }, [foxmemory, chartRange]);

  const modeData = useMemo(() => {
    const infer = Number(foxmemory?.stats?.writesByMode?.infer ?? 0);
    const raw = Number(foxmemory?.stats?.writesByMode?.raw ?? 0);
    return [
      { name: 'infer', value: infer },
      { name: 'raw', value: raw },
    ];
  }, [foxmemory]);

  const eventData = useMemo(() => {
    const e = foxmemory?.stats?.memoryEvents || {};
    return [
      { event: 'ADD', count: Number(e.ADD ?? 0) },
      { event: 'UPDATE', count: Number(e.UPDATE ?? 0) },
      { event: 'DELETE', count: Number(e.DELETE ?? 0) },
      { event: 'NONE', count: Number(e.NONE ?? 0) },
    ];
  }, [foxmemory]);

  const cronJobs: CronJob[] = cronsData?.jobs || [];

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

  const fmtSchedule = (job: CronJob) => {
    const s = job.schedule;
    if (!s) return '—';
    if (s.kind === 'every' && s.everyMs) return `every ${fmtMs(s.everyMs)}`;
    if (s.kind === 'cron' && s.cron) return s.cron;
    return s.kind ?? '—';
  };

  const lastRefreshTs = section === 'acp' ? sessionsFulfilledAt : section === 'cron' ? cronsFulfilledAt : foxFulfilledAt;
  const lastRefreshLabel = lastRefreshTs
    ? new Date(lastRefreshTs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
    : '—';

  const getErrorText = (err: RtkError) => {
    const e = err?.data?.error || err?.error || err?.message;
    if (!e) return 'request failed';
    return String(e).slice(0, 120);
  };

  const apiErrorText = section === 'acp'
    ? (sessionsIsError ? getErrorText(sessionsError as RtkError) : '')
    : (foxIsError ? getErrorText(foxError as RtkError) : '');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell>
        <SidebarDrawer variant="permanent">
          <LogoBox px={1} pb={1.5}>
            <LogoBar>
              <LogoAvatar>
                <Typography component="span" sx={{ fontSize: 14, lineHeight: 1 }}>🦊</Typography>
              </LogoAvatar>
              <Typography variant="subtitle2" fontWeight={700}>FoxOps</Typography>
            </LogoBar>
          </LogoBox>
          <Divider sx={{ mb: 1.5 }} />
          <List sx={{ gap: 0.7, display: 'grid' }}>
            <ListItemButton selected={section === 'foxmemory'} onClick={() => dispatch(setSection('foxmemory'))} sx={{ borderRadius: 1 }}>
              <ListItemIcon><HubRoundedIcon /></ListItemIcon><ListItemText primary="FoxMemory" />
            </ListItemButton>
            <ListItemButton selected={section === 'acp'} onClick={() => dispatch(setSection('acp'))} sx={{ borderRadius: 1 }}>
              <ListItemIcon><DashboardRoundedIcon /></ListItemIcon><ListItemText primary="Agent Sessions" />
            </ListItemButton>
            <ListItemButton selected={section === 'cron'} onClick={() => dispatch(setSection('cron'))} sx={{ borderRadius: 1 }}>
              <ListItemIcon><AccessAlarmRoundedIcon /></ListItemIcon><ListItemText primary="Cron Jobs" />
            </ListItemButton>
          </List>

          <Box sx={{ mt: 'auto', px: 1, pb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
              Built with ❤️ by FoxLight Imagineering
            </Typography>
          </Box>
        </SidebarDrawer>

        <Box sx={{ flexGrow: 1 }}>
          <GlassAppBar position="sticky" color="transparent" elevation={0}>
            <Toolbar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, mb: 0.25 }}>
                  {section === 'acp' ? 'Agent Sessions' : section === 'cron' ? 'Cron Jobs' : 'FoxMemory'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {section === 'acp' ? `${sessions.length} sessions` : section === 'cron' ? `${cronJobs.length} jobs` : foxmemory?.baseUrl || 'Loading…'} · {lastRefreshLabel}
                </Typography>
              </Box>
              {apiErrorText ? (
                <Tooltip title={apiErrorText} arrow>
                  <Chip
                    size="small"
                    color="error"
                    variant="filled"
                    label={`API error`}
                    sx={{ mr: 1, fontWeight: 600 }}
                  />
                </Tooltip>
              ) : null}
              <Tooltip title="Refresh now" arrow>
                <IconButton color="primary" onClick={onManualRefresh}><RefreshIcon /></IconButton>
              </Tooltip>
              <Tooltip title={mode === 'dark' ? 'Dark theme active' : 'Light theme active'} arrow>
                <IconButton color="primary" onClick={() => dispatch(toggleMode())}>
                  {mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                </IconButton>
              </Tooltip>
            </Toolbar>
          </GlassAppBar>

          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box sx={{ height: 8, mb: 1.25 }}>
              <LinearProgress
                sx={{
                  height: 3,
                  borderRadius: 999,
                  opacity: sessionsFetching || foxLoading || cronsFetching || killLoading ? 1 : 0,
                  transition: 'opacity 140ms ease',
                }}
              />
            </Box>
            {notice && <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice.text}</Alert>}

            {section === 'cron' ? (
              <>
                <Grid container spacing={1.5} mb={2.5}>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="total jobs" value={cronJobs.length} icon={<AccessAlarmRoundedIcon fontSize="small" />} iconColor={grad('#5e72e4', '#825ee4')} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="enabled" value={cronJobs.filter((j) => j.enabled).length} icon={<CheckCircleRoundedIcon fontSize="small" />} iconColor={grad('#2dce89', '#2dbd5a')} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="disabled" value={cronJobs.filter((j) => !j.enabled).length} icon={<MemoryRoundedIcon fontSize="small" />} iconColor={grad('#8898aa', '#6c7a8d')} /></Grid>
                </Grid>

                <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
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
                      {cronJobs.map((job: CronJob) => {
                        const lastStatus = job.state?.lastRunStatus ?? job.state?.lastStatus;
                        const statusColor = lastStatus === 'ok' ? 'success' : lastStatus === 'error' ? 'error' : 'default';
                        const now = Date.now();
                        const nextRunIn = job.state?.nextRunAtMs ? job.state.nextRunAtMs - now : null;
                        const expanded = expandedCronId === job.id;
                        return (
                          <React.Fragment key={job.id}>
                            <TableRow hover sx={{ cursor: 'pointer', '& > *': { borderBottom: expanded ? 0 : undefined } }} onClick={() => setExpandedCronId(expanded ? null : job.id)}>
                              <TableCell padding="checkbox">
                                <IconButton size="small">{expanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}</IconButton>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={job.enabled ? (lastStatus ?? 'enabled') : 'disabled'}
                                  color={job.enabled ? statusColor : 'default'}
                                  variant={job.enabled ? 'filled' : 'outlined'}
                                />
                              </TableCell>
                              <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.name}</TableCell>
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
                                      <Typography variant="caption" color="text.secondary" display="block">Session target</Typography>
                                      <Typography variant="body2">{job.sessionTarget ?? '—'}</Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" color="text.secondary" display="block">Wake mode</Typography>
                                      <Typography variant="body2">{job.wakeMode ?? '—'}</Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" color="text.secondary" display="block">Delivery</Typography>
                                      <Typography variant="body2">{job.delivery?.mode ?? '—'}{job.delivery?.channel ? ` / ${job.delivery.channel}` : ''}</Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" color="text.secondary" display="block">Last delivery</Typography>
                                      <Typography variant="body2">{job.state?.lastDeliveryStatus ?? '—'}</Typography>
                                    </Box>
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                      <Typography variant="caption" color="text.secondary" display="block">Payload message</Typography>
                                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {job.payload?.message ?? '—'}
                                      </Typography>
                                    </Box>
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
            ) : section === 'acp' ? (
              <>
                <Grid container spacing={1.5} mb={2.5}>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="active" value={activeSessions.length} icon={<CheckCircleRoundedIcon fontSize="small" />} iconColor={grad('#2dce89', '#2dbd5a')} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="stale" value={staleSessions.length} icon={<MemoryRoundedIcon fontSize="small" />} iconColor={grad('#8898aa', '#6c7a8d')} /></Grid>
                </Grid>

                <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                  <Table size="small" stickyHeader>
                    <TableHead><TableRow><TableCell>Status</TableCell><TableCell>Key</TableCell><TableCell>Age</TableCell><TableCell>Model</TableCell><TableCell>Tokens</TableCell><TableCell>Session ID</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
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
                                  <IconButton color="error" size="small" disabled={killLoading} onClick={() => onKill(s)}><StopCircleRoundedIcon fontSize="small" /></IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Delete stale session + transcript" arrow>
                                  <IconButton color="default" size="small" disabled={deleteLoading} onClick={() => onDelete(s)}><DeleteForeverIcon fontSize="small" /></IconButton>
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
            ) : (
              <>
                <Grid container spacing={1.5} mb={2.5}>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="memories stored" value={foxmemory?.memoryCount ?? 0} icon={<TimelineRoundedIcon fontSize="small" />} iconColor={grad('#5e72e4', '#825ee4')} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="ingestion queue" value={foxmemory?.ingestionQueueDepth ?? '—'} icon={<HubRoundedIcon fontSize="small" />} iconColor={grad('#11cdef', '#1171ef')} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="retrieval quality" value={foxmemory?.retrievalQuality?.value ?? '—'} icon={<CheckCircleRoundedIcon fontSize="small" />} iconColor={grad('#2dce89', '#2dbd5a')} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="api health" value={foxmemory?.api?.ok ? 'healthy' : 'degraded'} icon={<MemoryRoundedIcon fontSize="small" />} iconColor={foxmemory?.api?.ok ? grad('#2dce89', '#2dbd5a') : grad('#f5365c', '#f56036')} /></Grid>
                </Grid>

                <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1.5 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700}>Auto-capture health</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last capture: {foxmemory?.autoCapture?.lastAutoCaptureAt || '—'} · successes in last {foxmemory?.autoCapture?.captureWindowMinutes ?? 60}m: {foxmemory?.autoCapture?.captureSuccessCountWindow ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Plugin telemetry ({foxmemory?.pluginTelemetry?.windowMinutes ?? 60}m): attempts {foxmemory?.pluginTelemetry?.captureAttempts ?? 0} · success {foxmemory?.pluginTelemetry?.captureSuccess ?? 0} · failed {foxmemory?.pluginTelemetry?.captureFailed ?? 0} · recallFailed {foxmemory?.pluginTelemetry?.recallFailed ?? 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      mode infer/raw: {foxmemory?.pluginTelemetry?.modeInfer ?? 0}/{foxmemory?.pluginTelemetry?.modeRaw ?? 0} · endpoint: {foxmemory?.pluginTelemetry?.lastEndpoint || '—'}
                    </Typography>
                  </CardContent>
                </Card>

                <Grid container spacing={1.5}>
                  <Grid item xs={12} lg={7}>
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, height: '100%' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="h6" fontWeight={700}>Memories stored by day</Typography>
                          <ToggleButtonGroup exclusive size="small" value={chartRange} onChange={(_, v: ChartRange | null) => v && dispatch(setChartRange(v))}>
                            <ToggleButton value="7d">7d</ToggleButton>
                            <ToggleButton value="30d">30d</ToggleButton>
                            <ToggleButton value="all">All</ToggleButton>
                          </ToggleButtonGroup>
                        </Box>
                        <Box sx={{ height: 280 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                              <ReTooltip />
                              <Bar dataKey="count" fill="#5e72e4" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} lg={5}>
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, height: '100%' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom>FoxMemory details</Typography>
                        <Typography color="text.secondary">Base URL: {foxmemory?.baseUrl || '—'}</Typography>
                        <Typography color="text.secondary">User ID: {foxmemory?.userId || '—'}</Typography>
                        <Typography color="text.secondary">Health probe: {foxmemory?.api?.endpoint || '—'} · status {foxmemory?.api?.status ?? '—'}</Typography>
                        <Typography color="text.secondary" sx={{ mb: 1 }}>
                          Writes (infer/raw): {foxmemory?.stats?.writesByMode?.infer ?? 0}/{foxmemory?.stats?.writesByMode?.raw ?? 0} · Events ADD/UPDATE/DELETE: {foxmemory?.stats?.memoryEvents?.ADD ?? 0}/{foxmemory?.stats?.memoryEvents?.UPDATE ?? 0}/{foxmemory?.stats?.memoryEvents?.DELETE ?? 0}
                        </Typography>
                        <Grid container spacing={1} sx={{ mb: 1.25 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Write mode mix</Typography>
                            <Box sx={{ height: 120 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={modeData} dataKey="value" nameKey="name" innerRadius={24} outerRadius={42} paddingAngle={2}>
                                    <Cell fill="#5e72e4" />
                                    <Cell fill="#11cdef" />
                                  </Pie>
                                  <ReTooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Memory event mix</Typography>
                            <Box sx={{ height: 120 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={eventData} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                                  <XAxis dataKey="event" tick={{ fontSize: 10 }} />
                                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                  <ReTooltip />
                                  <Bar dataKey="count" fill="#2dce89" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </Box>
                          </Grid>
                        </Grid>

                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Recent memory-related error lines ({foxmemory?.recentErrors?.count ?? 0})</Typography>
                        <LogPaper variant="outlined" maxH={140}>
                          {(foxmemory?.recentErrors?.samples || []).length
                            ? (foxmemory!.recentErrors.samples.map((line, i) => <Typography key={i} variant="caption" display="block" sx={{ fontFamily: 'monospace', mb: 0.75 }}>{line}</Typography>))
                            : <Typography variant="body2" color="text.secondary">No recent error samples found.</Typography>}
                        </LogPaper>

                        <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1.5, mb: 1 }}>
                          Plugin logs ({foxmemory?.pluginLogs?.count ?? 0})
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Source: {foxmemory?.pluginLogs?.file || '—'} · showing last {(foxmemory?.pluginLogs?.lines || []).length} lines
                        </Typography>
                        <LogPaper variant="outlined" maxH={220}>
                          {(foxmemory?.pluginLogs?.lines || []).length ? (
                            foxmemory!.pluginLogs.lines.map((line, i) => (
                              <Typography key={i} variant="caption" display="block" sx={{ fontFamily: 'monospace', mb: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {line}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">No plugin log lines found yet.</Typography>
                          )}
                        </LogPaper>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </>
            )}
          </Container>
        </Box>
      </AppShell>
    </ThemeProvider>
  );
};

export default App;
