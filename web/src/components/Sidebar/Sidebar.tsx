import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AccessAlarmRoundedIcon from '@mui/icons-material/AccessAlarmRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import type { SectionHealth } from '../../types';
import type { SidebarProps } from './Sidebar.types';

const DRAWER_WIDTH = 300;

const StyledDrawer = styled(Drawer)(() => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  position: 'sticky',
  top: 78,
  height: 'calc(100vh - 85px)',
  alignSelf: 'flex-start',
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    height: '100%',
    boxSizing: 'border-box',
    border: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    overflow: 'visible',
    position: 'relative',
  },
}));

const SidebarPanel = styled(Box)(({ theme }) => ({
  marginTop: '5px',
  marginLeft: theme.spacing(1.5),
  marginRight: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
  height: `calc(100% - 5px - ${theme.spacing(1.5)})`,
  borderRadius: 16,
  backgroundColor: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a2e',
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(2),
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 4px 24px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(0,0,0,0.06)'
      : '0 4px 24px rgba(0,0,0,0.5)',
  overflow: 'hidden',
}));

const NavItem = styled(ListItemButton)(({ theme }) => ({
  borderRadius: 10,
  marginBottom: 4,
  color: theme.palette.mode === 'dark' ? '#67748e' : 'rgba(255,255,255,0.65)',
  '& .MuiListItemIcon-root': {
    color: 'inherit',
    minWidth: 36,
  },
  '& .MuiListItemText-primary': {
    fontSize: 13,
    fontWeight: 500,
  },
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
  },
  paddingTop: 10,
  paddingBottom: 10,
  '&.Mui-selected': {
    background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)',
    color: '#fff',
    boxShadow: '0 4px 14px rgba(30,60,200,0.45)',
    '& .MuiListItemIcon-root': { color: '#fff' },
    '& .MuiListItemText-primary': { fontWeight: 700 },
    '&:hover': { background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)' },
  },
}));

const badgeSx = (color: string) => ({
  fontSize: 21,
  color,
  ml: 'auto',
  flexShrink: 0,
  '& path': {
    stroke: 'white',
    strokeWidth: '2px',
    paintOrder: 'stroke fill',
  },
});

const HealthBadge = ({ health }: { health?: SectionHealth }) => {
  if (health === 'error') return (
    <Tooltip title="One or more error conditions exist" arrow placement="right">
      <ErrorRoundedIcon sx={badgeSx('#f5365c')} />
    </Tooltip>
  );
  return null;
};

const NAV_ITEMS = [
  { section: 'foxmemory' as const, label: 'FoxMemory', icon: <HubRoundedIcon fontSize="small" /> },
  { section: 'acp' as const, label: 'Agent Sessions', icon: <DashboardRoundedIcon fontSize="small" /> },
  { section: 'cron' as const, label: 'Cron Jobs', icon: <AccessAlarmRoundedIcon fontSize="small" /> },
  { section: 'config' as const, label: 'Model Config', icon: <TuneRoundedIcon fontSize="small" /> },
];

const Sidebar = ({ section, onSectionChange, health }: SidebarProps) => (
  <StyledDrawer variant="permanent">
    <SidebarPanel>
      <List disablePadding sx={{ display: 'grid' }}>
        {NAV_ITEMS.map(({ section: s, label, icon }) => (
          <NavItem key={s} selected={section === s} onClick={() => onSectionChange(s)}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={label} />
            <HealthBadge health={health?.[s]} />
          </NavItem>
        ))}
      </List>
      <Box mt="auto" px={0.5}>
        <Typography
          variant="caption"
          sx={{
            color: (theme) => theme.palette.mode === 'dark' ? '#adb5bd' : 'rgba(255,255,255,0.35)',
            lineHeight: 1.4,
          }}
        >
          Built with ❤️ by FoxLight Imagineering
        </Typography>
      </Box>
    </SidebarPanel>
  </StyledDrawer>
);

export default Sidebar;
