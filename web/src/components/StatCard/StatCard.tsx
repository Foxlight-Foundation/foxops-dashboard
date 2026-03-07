import { Box, Card, CardContent, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { StatCardProps } from './StatCard.types';

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
}));

const Content = styled(CardContent)({
  padding: 16,
  '&:last-child': { paddingBottom: 16 },
});

const IconBox = styled(Box, {
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

const StatCard = ({ title, value, icon, iconColor }: StatCardProps) => (
  <StyledCard>
    <Content>
      <Box display="flex" alignItems="center" gap={2}>
        <IconBox iconColor={iconColor}>{icon}</IconBox>
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
    </Content>
  </StyledCard>
);

export default StatCard;
