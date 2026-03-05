import { AppBar, Box, Chip, IconButton, LinearProgress, Toolbar, Tooltip, Typography } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import type { TopBarProps } from './TopBar.types';

const GlassAppBar = styled(AppBar)(({ theme }) => ({
  backdropFilter: 'blur(16px)',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: alpha(theme.palette.background.default, 0.72),
  height: '78px',
  justifyContent: 'center',
}));

const SECTION_TITLES: Record<string, string> = {
  acp: 'Agent Sessions',
  cron: 'Cron Jobs',
  foxmemory: 'FoxMemory',
};

const TopBar = ({
  section,
  mode,
  sessionCount,
  cronJobCount,
  foxmemoryBaseUrl,
  lastRefreshLabel,
  isLoading,
  apiErrorText,
  onRefresh,
  onToggleMode,
}: TopBarProps) => {
  const subtitle =
    section === 'acp'
      ? `${sessionCount} sessions`
      : section === 'cron'
      ? `${cronJobCount} jobs`
      : foxmemoryBaseUrl || 'Loading…';

  return (
    <>
      <GlassAppBar position="sticky" color="transparent" elevation={0}>
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, mb: 0.25 }}>
              {SECTION_TITLES[section] ?? section}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle} · {lastRefreshLabel}
            </Typography>
          </Box>
          {apiErrorText ? (
            <Tooltip title={apiErrorText} arrow>
              <Chip size="small" color="error" variant="filled" label="API error" sx={{ mr: 1, fontWeight: 600 }} />
            </Tooltip>
          ) : null}
          <Tooltip title="Refresh now" arrow>
            <IconButton color="primary" onClick={onRefresh}><RefreshIcon /></IconButton>
          </Tooltip>
          <Tooltip title={mode === 'dark' ? 'Dark theme active' : 'Light theme active'} arrow>
            <IconButton color="primary" onClick={onToggleMode}>
              {mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </GlassAppBar>
      <Box sx={{ height: 8 }}>
        <LinearProgress
          sx={{
            height: 3,
            borderRadius: 999,
            opacity: isLoading ? 1 : 0,
            transition: 'opacity 140ms ease',
          }}
        />
      </Box>
    </>
  );
};

export default TopBar;
