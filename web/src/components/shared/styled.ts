import { Paper, TableCell } from '@mui/material';
import { styled } from '@mui/material/styles';

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
