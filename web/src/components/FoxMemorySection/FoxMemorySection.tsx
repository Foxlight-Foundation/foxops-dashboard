import { useMemo } from 'react';
import { Box, Card, CardContent, Grid, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from 'recharts';
import StatCard from '../StatCard/StatCard';
import { LogPaper, grad } from '../shared/styled';
import type { FoxMemorySectionProps } from './FoxMemorySection.types';
import type { ChartRange } from '../../types';

const FoxMemorySection = ({ foxmemory, chartRange, onChartRangeChange }: FoxMemorySectionProps) => {
  const chartData = useMemo(() => {
    if (!foxmemory) return [];
    if (chartRange === 'all') return foxmemory.memoriesByDay || [];
    if (chartRange === '30d') {
      const all = foxmemory.memoriesByDay || [];
      const map = Object.fromEntries(all.map((d) => [d.day, d.count]));
      const out: { day: string; count: number }[] = [];
      const now = new Date();
      for (let i = 29; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i);
        const day = d.toISOString().slice(0, 10);
        out.push({ day, count: map[day] || 0 });
      }
      return out;
    }
    return foxmemory.memoriesByDay7d || [];
  }, [foxmemory, chartRange]);

  const modeData = useMemo(() => [
    { name: 'infer', value: Number(foxmemory?.stats?.writesByMode?.infer ?? 0) },
    { name: 'raw', value: Number(foxmemory?.stats?.writesByMode?.raw ?? 0) },
  ], [foxmemory]);

  const eventData = useMemo(() => {
    const e = foxmemory?.stats?.memoryEvents || {};
    return [
      { event: 'ADD', count: Number(e.ADD ?? 0) },
      { event: 'UPDATE', count: Number(e.UPDATE ?? 0) },
      { event: 'DELETE', count: Number(e.DELETE ?? 0) },
      { event: 'NONE', count: Number(e.NONE ?? 0) },
    ];
  }, [foxmemory]);

  return (
    <>
      <Grid container spacing={1.5} mb={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="memories stored" value={foxmemory?.memoryCount ?? 0} icon={<TimelineRoundedIcon fontSize="small" />} iconColor={grad('#5e72e4', '#825ee4')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="ingestion queue" value={foxmemory?.ingestionQueueDepth ?? '—'} icon={<HubRoundedIcon fontSize="small" />} iconColor={grad('#11cdef', '#1171ef')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="retrieval quality" value={foxmemory?.retrievalQuality?.value ?? '—'} icon={<CheckCircleRoundedIcon fontSize="small" />} iconColor={grad('#2dce89', '#2dbd5a')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="api health"
            value={foxmemory?.api?.ok ? 'healthy' : 'degraded'}
            icon={<MemoryRoundedIcon fontSize="small" />}
            iconColor={foxmemory?.api?.ok ? grad('#2dce89', '#2dbd5a') : grad('#f5365c', '#f56036')}
          />
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1.5 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700}>Auto-capture health</Typography>
          <Typography variant="body2" color="text.secondary">
            Last capture: {foxmemory?.autoCapture?.lastAutoCaptureAt || '—'} · successes in last {foxmemory?.autoCapture?.captureWindowMinutes ?? 60}m: {foxmemory?.autoCapture?.captureSuccessCountWindow ?? 0}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Plugin telemetry ({foxmemory?.pluginTelemetry?.windowMinutes ?? 60}m): attempts {foxmemory?.pluginTelemetry?.captureAttempts ?? 0} · success {foxmemory?.pluginTelemetry?.captureSuccess ?? 0} · failed {foxmemory?.pluginTelemetry?.captureFailed ?? 0} · recallFailed {foxmemory?.pluginTelemetry?.recallFailed ?? 0}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            mode infer/raw: {foxmemory?.pluginTelemetry?.modeInfer ?? 0}/{foxmemory?.pluginTelemetry?.modeRaw ?? 0} · endpoint: {foxmemory?.pluginTelemetry?.lastEndpoint || '—'}
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={7}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" fontWeight={700}>Memories stored by day</Typography>
                <ToggleButtonGroup exclusive size="small" value={chartRange} onChange={(_, v: ChartRange | null) => v && onChartRangeChange(v)}>
                  <ToggleButton value="7d">7d</ToggleButton>
                  <ToggleButton value="30d">30d</ToggleButton>
                  <ToggleButton value="all">All</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <ReTooltip />
                    <Bar dataKey="count" fill="#5e72e4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>FoxMemory details</Typography>
              <Typography color="text.secondary">Base URL: {foxmemory?.baseUrl || '—'}</Typography>
              <Typography color="text.secondary">User ID: {foxmemory?.userId || '—'}</Typography>
              <Typography color="text.secondary">Health probe: {foxmemory?.api?.endpoint || '—'} · status {foxmemory?.api?.status ?? '—'}</Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                Writes (infer/raw): {foxmemory?.stats?.writesByMode?.infer ?? 0}/{foxmemory?.stats?.writesByMode?.raw ?? 0} · Events ADD/UPDATE/DELETE: {foxmemory?.stats?.memoryEvents?.ADD ?? 0}/{foxmemory?.stats?.memoryEvents?.UPDATE ?? 0}/{foxmemory?.stats?.memoryEvents?.DELETE ?? 0}
              </Typography>
              <Grid container spacing={1} sx={{ mb: 1.25 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Write mode mix</Typography>
                  <Box sx={{ height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={modeData} dataKey="value" nameKey="name" innerRadius={24} outerRadius={42} paddingAngle={2}>
                          <Cell fill="#5e72e4" />
                          <Cell fill="#11cdef" />
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Memory event mix</Typography>
                  <Box sx={{ height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventData} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                        <XAxis dataKey="event" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <ReTooltip />
                        <Bar dataKey="count" fill="#2dce89" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Recent memory-related error lines ({foxmemory?.recentErrors?.count ?? 0})</Typography>
              <LogPaper variant="outlined" maxH={140}>
                {(foxmemory?.recentErrors?.samples || []).length
                  ? foxmemory!.recentErrors.samples.map((line, i) => (
                      <Typography key={i} variant="caption" display="block" sx={{ fontFamily: 'monospace', mb: 0.75 }}>{line}</Typography>
                    ))
                  : <Typography variant="body2" color="text.secondary">No recent error samples found.</Typography>}
              </LogPaper>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1.5, mb: 1 }}>
                Plugin logs ({foxmemory?.pluginLogs?.count ?? 0})
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Source: {foxmemory?.pluginLogs?.file || '—'} · showing last {(foxmemory?.pluginLogs?.lines || []).length} lines
              </Typography>
              <LogPaper variant="outlined" maxH={220}>
                {(foxmemory?.pluginLogs?.lines || []).length ? (
                  foxmemory!.pluginLogs.lines.map((line, i) => (
                    <Typography key={i} variant="caption" display="block" sx={{ fontFamily: 'monospace', mb: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {line}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No plugin log lines found yet.</Typography>
                )}
              </LogPaper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
};

export default FoxMemorySection;
