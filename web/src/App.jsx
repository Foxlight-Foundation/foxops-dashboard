import React, { useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Card,
  CardContent,
  Chip,
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
import { alpha, createTheme, ThemeProvider } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import PauseCircleRoundedIcon from '@mui/icons-material/PauseCircleRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, PieChart, Pie, Cell } from 'recharts';
import { setSection, setChartRange, toggleMode } from './uiSlice';
import {
  useGetRegistryQuery,
  useGetFoxmemoryOverviewQuery,
  useKillRegistryRunMutation,
} from './services/dashboardApi';

const DRAWER_WIDTH = 250;

const STATUS_HELP = {
  spawned: 'Session was created and registered, but no runtime confirmation yet.',
  running: 'Session is actively executing work.',
  silent: 'Run accepted, but no child output has been observed yet.',
  completed: 'Work finished successfully and outcome was recorded.',
  failed: 'Work ended with an error or unsuccessful result.',
  killed: 'Session was intentionally stopped or kill-requested.',
};

const STATUS_COLOR = {
  spawned: 'info',
  running: 'primary',
  silent: 'warning',
  completed: 'success',
  failed: 'error',
  killed: 'secondary',
};

function StatusBadge({ value }) {
  const key = (value || 'unknown').toLowerCase();
  return (
    <Tooltip title={STATUS_HELP[key] || 'Unknown status'} arrow>
      <Chip size="small" label={value || 'unknown'} color={STATUS_COLOR[key] || 'default'} variant="filled" />
    </Tooltip>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))'
            : 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.65))',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', color: 'white', background: color }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const { mode, section, chartRange } = useSelector((s) => s.ui);
  const [notice, setNotice] = useState(null);

  const {
    data: registryData,
    isFetching: registryFetching,
    isError: registryIsError,
    error: registryError,
    refetch: refetchRegistry,
    fulfilledTimeStamp: registryFulfilledAt,
  } = useGetRegistryQuery(undefined, {
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

  const [killRun, { isLoading: killLoading }] = useKillRegistryRunMutation();

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === 'dark' ? '#5e72e4' : '#344767' },
          background: mode === 'dark' ? { default: '#111827', paper: '#1f2937' } : { default: '#f8f9fa', paper: '#fff' },
        },
        shape: { borderRadius: 12 },
      }),
    [mode],
  );

  const grad = (a, b) => `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;

  const onManualRefresh = () => {
    if (section === 'acp') refetchRegistry();
    else refetchFox();
  };

  const onKill = async (row) => {
    const reason = window.prompt('Reason for kill request?', 'Manual kill requested from dashboard');
    if (reason === null) return;
    try {
      const json = await killRun({ runId: row.run_id, childSessionKey: row.child_session_key, reason }).unwrap();
      setNotice({
        severity: json.immediateKillSucceeded ? 'success' : 'warning',
        text: json.immediateKillSucceeded
          ? `Immediate kill attempted. ${json.note || ''}`
          : `Immediate kill unavailable; queued. ${json.note || ''}`,
      });
    } catch (e) {
      setNotice({ severity: 'error', text: `Kill request failed: ${String(e?.data?.error || e.message || e)}` });
    }
  };

  const registry = registryData || { summary: {}, rows: [] };
  const summary = registry.summary || {};

  const chartData = useMemo(() => {
    if (!foxmemory) return [];
    if (chartRange === 'all') return foxmemory.memoriesByDay || [];
    if (chartRange === '30d') {
      const all = foxmemory.memoriesByDay || [];
      const map = Object.fromEntries(all.map((d) => [d.day, d.count]));
      const out = [];
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

  const lastRefreshTs = section === 'acp' ? registryFulfilledAt : foxFulfilledAt;
  const lastRefreshLabel = lastRefreshTs
    ? new Date(lastRefreshTs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
    : '—';

  const getErrorText = (err) => {
    const e = err?.data?.error || err?.error || err?.message;
    if (!e) return 'request failed';
    return String(e).slice(0, 120);
  };

  const apiErrorText = section === 'acp'
    ? (registryIsError ? getErrorText(registryError) : '')
    : (foxIsError ? getErrorText(foxError) : '');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: 0, px: 2, py: 2 } }}>
          <Box px={1} pb={1.5}>
            <Box sx={{ height: 44, borderRadius: 2, background: grad('#5e72e4', '#825ee4'), color: 'white', display: 'flex', alignItems: 'center', px: 1.5, mb: 1 }}>
              <Box
                sx={{
                  mr: 1,
                  borderRadius: '50%',
                  bgcolor: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  p: '3px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                <Typography component="span" sx={{ fontSize: 14, lineHeight: 1 }}>🦊</Typography>
              </Box>
              <Typography variant="subtitle2" fontWeight={700}>FoxOps</Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          <List sx={{ gap: 0.7, display: 'grid' }}>
            <ListItemButton selected={section === 'acp'} onClick={() => dispatch(setSection('acp'))} sx={{ borderRadius: 2 }}>
              <ListItemIcon><DashboardRoundedIcon /></ListItemIcon><ListItemText primary="ACP Sessions" />
            </ListItemButton>
            <ListItemButton selected={section === 'foxmemory'} onClick={() => dispatch(setSection('foxmemory'))} sx={{ borderRadius: 2 }}>
              <ListItemIcon><HubRoundedIcon /></ListItemIcon><ListItemText primary="FoxMemory" />
            </ListItemButton>
          </List>

          <Box sx={{ mt: 'auto', px: 1, pb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
              Built with ❤️ by FoxLight Imagineering
            </Typography>
          </Box>
        </Drawer>

        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(8px)', borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.background.default, 0.72) }}>
            <Toolbar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={700}>FoxOps</Typography>
                <Typography variant="caption" color="text.secondary">
                  {section === 'acp' ? `Source: ${registryData?.registryPath || 'Loading…'}` : `Source: ${foxmemory?.baseUrl || 'Loading…'}`} · Last refresh: {lastRefreshLabel}
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
          </AppBar>

          <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box sx={{ height: 8, mb: 1.25 }}>
              <LinearProgress
                sx={{
                  height: 3,
                  borderRadius: 999,
                  opacity: registryFetching || foxLoading || killLoading ? 1 : 0,
                  transition: 'opacity 140ms ease',
                }}
              />
            </Box>
            {notice && <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice.text}</Alert>}

            {section === 'acp' ? (
              <>
                <Grid container spacing={1.5} mb={2.5}>
                  <Grid item xs={12} sm={6} md={3} lg={2}><StatCard title="total" value={summary.total ?? 0} icon={<MemoryRoundedIcon fontSize="small" />} color={grad('#5e72e4', '#825ee4')} /></Grid>
                  <Grid item xs={12} sm={6} md={3} lg={2}><StatCard title="running" value={summary.running ?? 0} icon={<MemoryRoundedIcon fontSize="small" />} color={grad('#11cdef', '#1171ef')} /></Grid>
                  <Grid item xs={12} sm={6} md={3} lg={2}><StatCard title="completed" value={summary.completed ?? 0} icon={<CheckCircleRoundedIcon fontSize="small" />} color={grad('#2dce89', '#2dbd5a')} /></Grid>
                  <Grid item xs={12} sm={6} md={3} lg={2}><StatCard title="failed" value={summary.failed ?? 0} icon={<ErrorRoundedIcon fontSize="small" />} color={grad('#f5365c', '#f56036')} /></Grid>
                  <Grid item xs={12} sm={6} md={3} lg={2}><StatCard title="silent" value={summary.silent ?? 0} icon={<PauseCircleRoundedIcon fontSize="small" />} color={grad('#fb6340', '#fbb140')} /></Grid>
                </Grid>

                <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                  <Table size="small" stickyHeader>
                    <TableHead><TableRow><TableCell>Created (CT)</TableCell><TableCell>Purpose</TableCell><TableCell>Status</TableCell><TableCell>Run ID</TableCell><TableCell>Child Session</TableCell><TableCell>Done (CT)</TableCell><TableCell>Outcome</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
                    <TableBody>
                      {(registry.rows || []).map((r, idx) => {
                        const done = ['completed', 'failed', 'killed'].includes((r.status || '').toLowerCase());
                        return (
                          <TableRow key={`${r.run_id}-${idx}`} hover>
                            <TableCell>{r.created_at_ct}</TableCell><TableCell sx={{ minWidth: 260 }}>{r.purpose}</TableCell><TableCell><StatusBadge value={r.status} /></TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.run_id}</TableCell><TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.child_session_key}</TableCell>
                            <TableCell>{r.done_at_ct}</TableCell><TableCell sx={{ minWidth: 260 }}>{r.outcome_summary}</TableCell>
                            <TableCell align="right"><Tooltip title={done ? 'Already terminal status' : 'Attempt immediate kill, then queue fallback'} arrow><span><IconButton color="error" size="small" disabled={done} onClick={() => onKill(r)}><DeleteForeverIcon fontSize="small" /></IconButton></span></Tooltip></TableCell>
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
                  <Grid item xs={12} sm={6} md={3}><StatCard title="memories stored" value={foxmemory?.memoryCount ?? 0} icon={<TimelineRoundedIcon fontSize="small" />} color={grad('#5e72e4', '#825ee4')} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="ingestion queue" value={foxmemory?.ingestionQueueDepth ?? '—'} icon={<HubRoundedIcon fontSize="small" />} color={grad('#11cdef', '#1171ef')} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="retrieval quality" value={foxmemory?.retrievalQuality?.value ?? '—'} icon={<CheckCircleRoundedIcon fontSize="small" />} color={grad('#2dce89', '#2dbd5a')} /></Grid>
                  <Grid item xs={12} sm={6} md={3}><StatCard title="api health" value={foxmemory?.api?.ok ? 'healthy' : 'degraded'} icon={<MemoryRoundedIcon fontSize="small" />} color={foxmemory?.api?.ok ? grad('#2dce89', '#2dbd5a') : grad('#f5365c', '#f56036')} /></Grid>
                </Grid>

                <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, mb: 1.5 }}>
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
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, height: '100%' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="h6" fontWeight={700}>Memories stored by day</Typography>
                          <ToggleButtonGroup exclusive size="small" value={chartRange} onChange={(_, v) => v && dispatch(setChartRange(v))}>
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
                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 3, height: '100%' }}>
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
                        <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 140, overflow: 'auto', bgcolor: 'background.default' }}>
                          {(foxmemory?.recentErrors?.samples || []).length ? (foxmemory.recentErrors.samples.map((line, i) => <Typography key={i} variant="caption" display="block" sx={{ fontFamily: 'monospace', mb: 0.75 }}>{line}</Typography>)) : <Typography variant="body2" color="text.secondary">No recent error samples found.</Typography>}
                        </Paper>

                        <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1.5, mb: 1 }}>
                          Plugin logs ({foxmemory?.pluginLogs?.count ?? 0})
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Source: {foxmemory?.pluginLogs?.file || '—'} · showing last {(foxmemory?.pluginLogs?.lines || []).length} lines
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 220, overflow: 'auto', bgcolor: 'background.default' }}>
                          {(foxmemory?.pluginLogs?.lines || []).length ? (
                            foxmemory.pluginLogs.lines.map((line, i) => (
                              <Typography key={i} variant="caption" display="block" sx={{ fontFamily: 'monospace', mb: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {line}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">No plugin log lines found yet.</Typography>
                          )}
                        </Paper>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </>
            )}
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
