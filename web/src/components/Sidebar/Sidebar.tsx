import { Box, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AccessAlarmRoundedIcon from '@mui/icons-material/AccessAlarmRounded';
import type { SidebarProps } from './Sidebar.types';

const DRAWER_WIDTH = 250;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
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

const NAV_ITEMS = [
  { section: 'foxmemory' as const, label: 'FoxMemory', icon: <HubRoundedIcon /> },
  { section: 'acp' as const, label: 'Agent Sessions', icon: <DashboardRoundedIcon /> },
  { section: 'cron' as const, label: 'Cron Jobs', icon: <AccessAlarmRoundedIcon /> },
];

const Sidebar = ({ section, onSectionChange }: SidebarProps) => (
  <StyledDrawer variant="permanent">
    <Box px={1} pb={1.5}>
      <LogoBar>
        <LogoAvatar>
          <Typography component="span" sx={{ fontSize: 14, lineHeight: 1 }}>🦊</Typography>
        </LogoAvatar>
        <Typography variant="subtitle2" fontWeight={700}>FoxOps</Typography>
      </LogoBar>
    </Box>
    <Divider sx={{ mb: 1.5 }} />
    <List sx={{ gap: 0.7, display: 'grid' }}>
      {NAV_ITEMS.map(({ section: s, label, icon }) => (
        <ListItemButton
          key={s}
          selected={section === s}
          onClick={() => onSectionChange(s)}
          sx={{ borderRadius: 1 }}
        >
          <ListItemIcon>{icon}</ListItemIcon>
          <ListItemText primary={label} />
        </ListItemButton>
      ))}
    </List>
    <Box sx={{ mt: 'auto', px: 1, pb: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
        Built with ❤️ by FoxLight Imagineering
      </Typography>
    </Box>
  </StyledDrawer>
);

export default Sidebar;
