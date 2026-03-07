import { useMemo, useState } from 'react';
import { Alert, Box, Container, CssBaseline } from '@mui/material';
import { createTheme, styled, ThemeProvider } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { setSection, setChartRange, toggleMode } from './uiSlice';
import {
  useGetSessionsQuery,
  useGetFoxmemoryOverviewQuery,
  useGetCronsQuery,
  useKillSessionMutation,
  useDeleteSessionMutation,
} from './services/dashboardApi';
import type { RootState } from './store';
import type { OpenclawSession, Notice } from './types';
import Sidebar from './components/Sidebar/Sidebar';
import TopBar from './components/TopBar/TopBar';
import AgentSessionsSection from './components/AgentSessionsSection/AgentSessionsSection';
import CronJobsSection from './components/CronJobsSection/CronJobsSection';
import FoxMemorySection from './components/FoxMemorySection/FoxMemorySection';

const AppShell = styled(Box)({ display: 'flex', minHeight: '100vh' });

type RtkError = { data?: { error?: string }; error?: string; message?: string } | undefined;

const getErrorText = (err: RtkError) => {
  const e = err?.data?.error || err?.error || err?.message;
  return e ? String(e).slice(0, 120) : 'request failed';
};

const MS_12H = 12 * 60 * 60 * 1000;
const EXCLUDED_TYPES = ['main', 'telegram', 'heartbeat'];
const isExcluded = (s: OpenclawSession) => EXCLUDED_TYPES.includes(s.key.split(':')[2] ?? '');
const isActive = (s: OpenclawSession) => (s.ageMs ?? Infinity) < MS_12H;

const App = () => {
  const dispatch = useDispatch();
  const { mode, section, chartRange } = useSelector((s: RootState) => s.ui);
  const [notice, setNotice] = useState<Notice | null>(null);

  const {
    data: sessionsData,
    isFetching: sessionsFetching,
    isError: sessionsIsError,
    error: sessionsError,
    refetch: refetchSessions,
    fulfilledTimeStamp: sessionsFulfilledAt,
  } = useGetSessionsQuery(undefined, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true });

  const {
    data: foxmemory,
    isFetching: foxLoading,
    isError: foxIsError,
    error: foxError,
    refetch: refetchFox,
    fulfilledTimeStamp: foxFulfilledAt,
  } = useGetFoxmemoryOverviewQuery(undefined, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true });

  const {
    data: cronsData,
    isFetching: cronsFetching,
    refetch: refetchCrons,
    fulfilledTimeStamp: cronsFulfilledAt,
  } = useGetCronsQuery(undefined, { pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true });

  const [killSession, { isLoading: killLoading }] = useKillSessionMutation();
  const [deleteSession, { isLoading: deleteLoading }] = useDeleteSessionMutation();

  const cardShadow = mode === 'dark'
    ? '0 2px 8px rgba(0,0,0,0.3), 0 10px 28px rgba(0,0,0,0.4)'
    : '0 2px 4px rgba(0,0,0,0.04), 0 8px 22px rgba(0,0,0,0.12)';

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
        shadows: Array.from({ length: 25 }, (_, i) => (i === 0 ? 'none' : cardShadow)) as Parameters<typeof createTheme>[0]['shadows'],
      }),
    [mode, cardShadow],
  );

  const allSessions = sessionsData?.sessions || [];
  const sessions = allSessions.filter((s) => !isExcluded(s));
  const activeSessions = sessions.filter(isActive);
  const staleSessions = sessions.filter((s) => !isActive(s));
  const cronJobs = cronsData?.jobs || [];

  const onRefresh = () => {
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
        text: json.immediateKillSucceeded ? `Stop command sent. ${json.note || ''}` : `Kill queued. ${json.note || ''}`,
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

  const lastRefreshTs = section === 'acp' ? sessionsFulfilledAt : section === 'cron' ? cronsFulfilledAt : foxFulfilledAt;
  const lastRefreshLabel = lastRefreshTs
    ? new Date(lastRefreshTs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
    : '—';

  const apiErrorText =
    section === 'acp' && sessionsIsError ? getErrorText(sessionsError as RtkError)
    : section === 'foxmemory' && foxIsError ? getErrorText(foxError as RtkError)
    : '';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell sx={{ backgroundColor: 'background.default' }}>
        <Sidebar section={section} onSectionChange={(s) => dispatch(setSection(s))} />
        <Box sx={{ flexGrow: 1 }}>
          <TopBar
            section={section}
            mode={mode}
            sessionCount={sessions.length}
            cronJobCount={cronJobs.length}
            foxmemoryBaseUrl={foxmemory?.baseUrl}
            lastRefreshLabel={lastRefreshLabel}
            isLoading={sessionsFetching || foxLoading || cronsFetching || killLoading}
            apiErrorText={apiErrorText}
            onRefresh={onRefresh}
            onToggleMode={() => dispatch(toggleMode())}
          />
          <Container maxWidth="xl" sx={{ py: 3 }}>
            {notice && <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice.text}</Alert>}
            {section === 'cron' ? (
              <CronJobsSection jobs={cronJobs} />
            ) : section === 'acp' ? (
              <AgentSessionsSection
                sessions={sessions}
                activeSessions={activeSessions}
                staleSessions={staleSessions}
                killLoading={killLoading}
                deleteLoading={deleteLoading}
                onKill={onKill}
                onDelete={onDelete}
              />
            ) : (
              <FoxMemorySection
                foxmemory={foxmemory}
                chartRange={chartRange}
                onChartRangeChange={(r) => dispatch(setChartRange(r))}
              />
            )}
          </Container>
        </Box>
      </AppShell>
    </ThemeProvider>
  );
};

export default App;
