import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AccessAlarmRoundedIcon from '@mui/icons-material/AccessAlarmRounded';
import type { SidebarProps } from './Sidebar.types';

const DRAWER_WIDTH = 300;

const StyledDrawer = styled(Drawer)(() => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    border: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    overflow: 'visible',
  },
}));

const SidebarPanel = styled(Box)(({ theme }) => ({
  margin: theme.spacing(1.5),
  height: `calc(100% - ${theme.spacing(3)})`,
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

const NavDivider = styled(Box)(({ theme }) => ({
  height: 2,
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(to right, transparent, rgba(0,0,0,0.12) 25%, rgba(0,0,0,0.12) 75%, transparent)'
    : 'linear-gradient(to right, transparent, rgba(255,255,255,0.18) 25%, rgba(255,255,255,0.18) 75%, transparent)',
  margin: `${theme.spacing(1)} ${theme.spacing(-2)} ${theme.spacing(1.5)}`,
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

const NAV_ITEMS = [
  { section: 'foxmemory' as const, label: 'FoxMemory', icon: <HubRoundedIcon fontSize="small" /> },
  { section: 'acp' as const, label: 'Agent Sessions', icon: <DashboardRoundedIcon fontSize="small" /> },
  { section: 'cron' as const, label: 'Cron Jobs', icon: <AccessAlarmRoundedIcon fontSize="small" /> },
];

const Sidebar = ({ section, onSectionChange }: SidebarProps) => (
  <StyledDrawer variant="permanent">
    <SidebarPanel>
      <Box display="flex" alignItems="center" gap={1} px={0.5} py={0.75} mb={0.5}>
        <Typography component="span" sx={{ fontSize: 22, lineHeight: 1 }}>🦊</Typography>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#344767' : '#fff', letterSpacing: 0.3 }}
        >
          FoxOps
        </Typography>
      </Box>
      <NavDivider />
      <List disablePadding sx={{ display: 'grid' }}>
        {NAV_ITEMS.map(({ section: s, label, icon }) => (
          <NavItem key={s} selected={section === s} onClick={() => onSectionChange(s)}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={label} />
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
