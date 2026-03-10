import { Card, Paper, TableCell } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

const glassMixin = (theme: Theme) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.55),
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: `0 4px 24px rgba(0,0,0,0.12), inset 0 0 0 1px ${alpha(theme.palette.common.white, 0.08)}`,
});

export const GlassPaper = styled(Paper)(({ theme }) => ({
  ...glassMixin(theme),
}));

export const GlassCard = styled(Card)(({ theme }) => ({
  ...glassMixin(theme),
}));

export const MonoTableCell = styled(TableCell)({
  fontFamily: 'monospace',
  fontSize: 12,
});

export const LogPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'maxH',
})<{ maxH?: number }>(({ theme, maxH = 140 }) => ({
  padding: theme.spacing(1.5),
  maxHeight: maxH,
  overflow: 'auto',
  backgroundColor: theme.palette.background.default,
}));

/** Gradient helper — `grad('#a', '#b')` → `linear-gradient(135deg, #a 0%, #b 100%)` */
export const grad = (a: string, b: string) =>
  `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
