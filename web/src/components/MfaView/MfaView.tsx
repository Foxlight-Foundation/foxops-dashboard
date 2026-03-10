import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import BabyFoxIcon from '../shared/BabyFoxIcon';
import SeatedFoxIcon from '../shared/SeatedFoxIcon';
import type { MfaViewProps } from './MfaView.types';

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
  alignItems: 'center',
  gap: theme.spacing(2.5),
  boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)',
  minWidth: 360,
  maxWidth: 440,
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

interface SetupData { secret: string; qrDataUrl: string }

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

const MfaView = ({ user, mode, onSuccess }: MfaViewProps) => {
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(mode === 'setup');

  useEffect(() => {
    if (mode !== 'setup') return;
    setFetching(true);
    fetch('/api/auth/mfa/setup')
      .then((r) => r.json())
      .then((data: { ok: boolean; secret?: string; qrDataUrl?: string }) => {
        if (data.ok && data.secret && data.qrDataUrl) {
          setSetupData({ secret: data.secret, qrDataUrl: data.qrDataUrl });
        } else {
          setError('Failed to generate QR code');
        }
      })
      .catch(() => setError('Failed to load setup data'))
      .finally(() => setFetching(false));
  }, [mode]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const url = mode === 'setup' ? '/api/auth/mfa/enroll' : '/api/auth/mfa/verify';
      const body = mode === 'setup'
        ? { secret: setupData!.secret, token }
        : { token };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Invalid token');
      }
    } catch {
      setError('Request failed');
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
        <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
          <BabyFoxIcon size={88} color="#ffffff" />
          <Typography variant="h6" fontWeight={800} color="#fff">
            {mode === 'setup' ? 'Set up two-factor auth' : 'Two-factor verification'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.70)', textAlign: 'center' }}>
            {mode === 'setup'
              ? 'Scan this QR code with your authenticator app'
              : `Welcome, ${user.name.split(' ')[0]}. Enter your authenticator code to continue.`}
          </Typography>
        </Box>

        {mode === 'setup' && (
          <>
            {fetching ? (
              <CircularProgress size={80} sx={{ color: '#6690f5', my: 2 }} />
            ) : setupData ? (
              <Box sx={{ background: '#fff', borderRadius: 3, p: 1.5, display: 'inline-flex' }}>
                <img src={setupData.qrDataUrl} alt="MFA QR code" width={160} height={160} />
              </Box>
            ) : null}
            {setupData && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', letterSpacing: 1, wordBreak: 'break-all', textAlign: 'center' }}>
                Manual key: {setupData.secret}
              </Typography>
            )}
          </>
        )}

        {error && (
          <Typography variant="body2" sx={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: 2, px: 2, py: 1, width: '100%', textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        <TextField
          label="6-digit code"
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && token.length === 6 && handleSubmit()}
          inputProps={{ inputMode: 'numeric', maxLength: 6 }}
          fullWidth
          autoFocus
          sx={{ ...fieldSx, input: { color: '#fff', letterSpacing: 6, fontSize: 22, textAlign: 'center' } }}
        />

        <SubmitButton
          fullWidth
          onClick={handleSubmit}
          disabled={token.length !== 6 || loading || (mode === 'setup' && !setupData)}
        >
          {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : mode === 'setup' ? 'Activate' : 'Verify'}
        </SubmitButton>
      </Card>
    </Shell>
  );
};

export default MfaView;
