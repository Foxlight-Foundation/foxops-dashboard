import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Container, CssBaseline } from '@mui/material';
import { createTheme, styled, ThemeProvider } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { setSection, setChartRange, toggleMode, setSelectedAgentId } from './uiSlice';
import {
  useGetSessionsQuery,
  useGetFoxmemoryOverviewQuery,
  useGetCronsQuery,
  useKillSessionMutation,
  useDeleteSessionMutation,
} from './services/dashboardApi';
import type { RootState } from './store';
import type { AuthState, AuthUser, OpenclawSession, Notice } from './types';
import Sidebar from './components/Sidebar/Sidebar';
import TopBar from './components/TopBar/TopBar';
import AgentSessionsSection from './components/AgentSessionsSection/AgentSessionsSection';
import CronJobsSection from './components/CronJobsSection/CronJobsSection';
import FoxMemorySection from './components/FoxMemorySection/FoxMemorySection';
import ModelConfigSection from './components/ModelConfigSection/ModelConfigSection';
import LoginView from './components/LoginView/LoginView';
import MfaView from './components/MfaView/MfaView';
import AgentSelector from './components/AgentSelector/AgentSelector';
import SeatedFoxIcon from './components/shared/SeatedFoxIcon';

const AppShell = styled(Box, { shouldForwardProp: (p) => p !== 'mode' })<{ mode: 'light' | 'dark' }>(({ mode }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  overflowY: 'auto',
  background: mode === 'dark'
    ? 'radial-gradient( circle farthest-corner at 50% 52.5%,  rgba(14,53,92,1) 0%, rgba(16,14,72,1) 90% )'
    : 'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
}));

const FoxBg = styled(Box)({
  position: 'fixed',
  top: 108,
  right: 30,
  bottom: 30,
  display: 'flex',
  alignItems: 'stretch',
  pointerEvents: 'none',
  opacity: 0.05,
  zIndex: 0,
  '& svg': {
    height: '100%',
    width: 'auto',
  },
});

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
  const { mode, section, chartRange, selectedAgentId } = useSelector((s: RootState) => s.ui);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth');
    if (authError) {
      window.history.replaceState({}, '', '/');
      setAuthState('unauthenticated');
      return;
    }
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data: { ok: boolean; user?: AuthUser; mfaEnrolled?: boolean; mfaVerified?: boolean }) => {
        if (!data.ok || !data.user) { setAuthState('unauthenticated'); return; }
        setAuthUser(data.user);
        if (!data.mfaEnrolled) { setAuthState('mfa-setup'); return; }
        if (!data.mfaVerified) { setAuthState('mfa-verify'); return; }
        setAuthState('authenticated');
      })
      .catch(() => setAuthState('unauthenticated'));
  }, []);

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
  } = useGetFoxmemoryOverviewQuery(selectedAgentId ?? undefined, { skip: section !== 'foxmemory', pollingInterval: 15000, skipPollingIfUnfocused: true, refetchOnFocus: true, refetchOnReconnect: true });

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

  const healthMap: import('./types').HealthMap = {
    acp: sessionsData ? (sessions.some((s) => s.abortedLastRun) ? 'error' : 'ok') : undefined,
    cron: cronsData ? (cronJobs.some((j) => (j.state?.lastRunStatus ?? j.state?.lastStatus) === 'error') ? 'error' : 'ok') : undefined,
    foxmemory: foxIsError ? 'error' : foxmemory ? 'ok' : undefined,
    config: 'ok',
  };

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

  if (authState === 'loading') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1a1a2e 100%)' }} />
      </ThemeProvider>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginView
          onAuth={(user, mfaEnrolled, mfaVerified) => {
            setAuthUser(user);
            if (!mfaEnrolled) { setAuthState('mfa-setup'); return; }
            if (!mfaVerified) { setAuthState('mfa-verify'); return; }
            setAuthState('authenticated');
          }}
        />
      </ThemeProvider>
    );
  }

  if ((authState === 'mfa-setup' || authState === 'mfa-verify') && authUser) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MfaView
          user={authUser}
          mode={authState === 'mfa-setup' ? 'setup' : 'verify'}
          onSuccess={() => setAuthState('authenticated')}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell mode={mode} sx={{ flexDirection: 'column' }}>
        <FoxBg>
          <SeatedFoxIcon color={mode === 'dark' ? '#ffffff' : '#000000'} size="100%" />
        </FoxBg>
        <TopBar
          section={section}
          mode={mode}
          sessionCount={sessions.length}
          cronJobCount={cronJobs.length}
          foxmemoryBaseUrl={foxmemory?.baseUrl}
          lastRefreshLabel={lastRefreshLabel}
          isLoading={sessionsFetching || foxLoading || cronsFetching || killLoading}
          apiErrorText={apiErrorText}
          user={authUser}
          onRefresh={onRefresh}
          onToggleMode={() => dispatch(toggleMode())}
          onLogout={() => { window.location.href = '/auth/logout'; }}
        />
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          <Sidebar section={section} onSectionChange={(s) => dispatch(setSection(s))} health={healthMap}>
            <AgentSelector selectedAgentId={selectedAgentId} onAgentChange={(id) => dispatch(setSelectedAgentId(id))} />
          </Sidebar>
          <Box sx={{ flexGrow: 1 }}>
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
            ) : section === 'config' ? (
              <ModelConfigSection agentId={selectedAgentId} />
            ) : (
              <FoxMemorySection
                foxmemory={foxmemory}
                chartRange={chartRange}
                onChartRangeChange={(r) => dispatch(setChartRange(r))}
                tabHealth={{ performance: foxIsError ? 'error' : foxmemory ? 'ok' : undefined }}
                agentId={selectedAgentId}
              />
            )}
          </Container>
          </Box>
        </Box>
      </AppShell>
    </ThemeProvider>
  );
};

export default App;
