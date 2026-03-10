import { useState } from 'react';
import { Box, Button, CircularProgress, Divider, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import BabyFoxIcon from '../shared/BabyFoxIcon';
import SeatedFoxIcon from '../shared/SeatedFoxIcon';
import type { AuthUser } from '../../types';
import type { LoginViewProps } from './LoginView.types';

const Shell = styled(Box)({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  overflow: 'hidden',
  background: 'linear-gradient( 111.8deg,  rgb(9, 65, 124) 12%, rgb(0, 24, 68) 70% )',
});

const FoxBg = styled(Box)({
  position: 'absolute',
  top: 30,
  right: 30,
  bottom: 30,
  display: 'flex',
  alignItems: 'stretch',
  pointerEvents: 'none',
  opacity: 0.16,
  '& svg': {
    height: '100%',
    width: 'auto',
  },
});

const Card = styled(Box)(({ theme }) => ({
  background: 'rgba(30, 41, 59, 0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 20,
  padding: theme.spacing(5, 5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: theme.spacing(2),
  boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)',
  minWidth: 360,
  maxWidth: 420,
  width: '100%',
}));

const SubmitButton = styled(Button)({
  background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)',
  color: '#fff',
  fontWeight: 700,
  borderRadius: 10,
  textTransform: 'none',
  fontSize: 15,
  boxShadow: '0 4px 14px rgba(30,60,200,0.4)',
  '&:hover': { background: 'linear-gradient(45deg, #1535a8 0%, #5580e8 100%)' },
  '&:disabled': { background: 'rgba(100,120,200,0.3)', color: 'rgba(255,255,255,0.4)' },
});


const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#e2e8f0',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#6690f5' },
    '& input:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 100px #1e293b inset',
      WebkitTextFillColor: '#e2e8f0',
    },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#6690f5' },
};

const LoginView = ({ error: initialError, onAuth }: LoginViewProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === 'failed' ? 'Sign-in failed. Your account may not be authorized.' : (initialError ?? null),
  );

  const handleLogin = async () => {
    if (!email || !password) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { ok: boolean; error?: string; user?: AuthUser; mfaEnrolled?: boolean; mfaVerified?: boolean };
      if (!data.ok || !data.user) {
        setError(data.error || 'Login failed');
      } else {
        onAuth?.(data.user, !!data.mfaEnrolled, !!data.mfaVerified);
      }
    } catch {
      setError('Network error — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <FoxBg>
        <SeatedFoxIcon color="#ffffff" size="100%" />
      </FoxBg>
      <Card>
        <Box display="flex" flexDirection="column" alignItems="center" gap={0.5} mb={1}>
          <BabyFoxIcon size={88} color="#ffffff" />
          <Typography variant="h5" fontWeight={800} color="#fff" letterSpacing={0.5}>
            FoxOps<Typography component="sup" sx={{ fontSize: 11, fontWeight: 400, verticalAlign: 'super', ml: 0.25, color: 'rgba(255,255,255,0.5)' }}>®</Typography>
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.70)', textAlign: 'center' }}>
            Operational dashboard for the FoxLight platform
          </Typography>
        </Box>

        {error && (
          <Typography variant="body2" sx={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: 2, px: 2, py: 1, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
          fullWidth
          autoFocus
          size="small"
          sx={fieldSx}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()}
          fullWidth
          size="small"
          sx={fieldSx}
        />

        <SubmitButton fullWidth onClick={handleLogin} disabled={!email || !password || loading}>
          {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Sign in'}
        </SubmitButton>

        <Divider sx={{ my: 0.5, '&::before, &::after': { borderColor: 'rgba(255,255,255,0.30)' } }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', px: 1 }}>or</Typography>
        </Divider>

        <SubmitButton fullWidth onClick={() => { window.location.href = '/auth/google'; }} sx={{ gap: 1 }}>
          <GoogleLogo />
          Continue with Google
        </SubmitButton>

        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.52)', textAlign: 'center', mt: 0.5 }}>
          Copyright © {new Date().getFullYear()}, Foxlight Foundation. All Rights Reserved.
        </Typography>
      </Card>
    </Shell>
  );
};

export default LoginView;
