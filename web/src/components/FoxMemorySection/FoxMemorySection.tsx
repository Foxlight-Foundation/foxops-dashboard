import { useMemo, useState } from 'react';
import { Box, Card, CardContent, Chip, Grid, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from 'recharts';
import StatCard from '../StatCard/StatCard';
import FoxMemoryAgentsView from '../FoxMemoryAgentsView/FoxMemoryAgentsView';
import { LogPaper, grad } from '../shared/styled';
import {
  useGetFoxmemoryPromptsQuery,
  useSetFoxmemoryExtractionPromptMutation,
  useSetFoxmemoryUpdatePromptMutation,
} from '../../services/dashboardApi';
import type { FoxMemorySectionProps } from './FoxMemorySection.types';
import type { ChartRange } from '../../types';

type SubView = 'performance' | 'agents';

const EVENT_COLORS: Record<string, string> = { ADD: '#2dce89', UPDATE: '#5e72e4', DELETE: '#f5365c', NONE: '#adb5bd' };

const FoxMemorySection = ({ foxmemory, chartRange, onChartRangeChange }: FoxMemorySectionProps) => {
  const [subView, setSubView] = useState<SubView>('performance');

  const { data: prompts, isFetching: promptsLoading } = useGetFoxmemoryPromptsQuery(undefined, {
    skip: subView !== 'agents',
  });
  const [saveExtractionPrompt] = useSetFoxmemoryExtractionPromptMutation();
  const [saveUpdatePrompt] = useSetFoxmemoryUpdatePromptMutation();

  const onSaveExtractionPrompt = async (prompt: string | null) => { await saveExtractionPrompt({ prompt }).unwrap(); };
  const onSaveUpdatePrompt = async (prompt: string | null) => { await saveUpdatePrompt({ prompt }).unwrap(); };

  const chartData = useMemo(() => {
    if (!foxmemory) return [];
    const all = foxmemory.memoriesByDay || [];
    if (chartRange === 'all') return all;
    const days = chartRange === '30d' ? 30 : 7;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
    cutoff.setUTCHours(0, 0, 0, 0);
    return all.filter((d) => new Date(d.date) >= cutoff);
  }, [foxmemory, chartRange]);

  const modeData = useMemo(() => [
    { name: 'infer', value: Number(foxmemory?.stats?.writesByMode?.infer ?? 0) },
    { name: 'raw', value: Number(foxmemory?.stats?.writesByMode?.raw ?? 0) },
  ], [foxmemory]);

  return (
    <>
      <Tabs value={subView} onChange={(_, v: SubView) => setSubView(v)} sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Performance" value="performance" />
        <Tab label="Agents" value="agents" />
      </Tabs>

      {subView === 'agents' ? (
        <FoxMemoryAgentsView
          foxmemory={foxmemory}
          prompts={prompts}
          promptsLoading={promptsLoading}
          onSaveExtractionPrompt={onSaveExtractionPrompt}
          onSaveUpdatePrompt={onSaveUpdatePrompt}
        />
      ) : (
      <>
      <Grid container spacing={1.5} mb={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Memories Stored" value={foxmemory?.memorySummary?.total ?? foxmemory?.memoryCount ?? 0} icon={<TimelineRoundedIcon fontSize="small" />} iconColor={grad('#5e72e4', '#825ee4')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="searches (30d)"
            value={foxmemory?.searches?.total ?? '—'}
            icon={<HubRoundedIcon fontSize="small" />}
            iconColor={grad('#11cdef', '#1171ef')}
          />
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

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={7}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" fontWeight={700}>Memory events by day</Typography>
                <ToggleButtonGroup exclusive size="small" value={chartRange} onChange={(_, v: ChartRange | null) => v && onChartRangeChange(v)}>
                  <ToggleButton value="7d">7d</ToggleButton>
                  <ToggleButton value="30d">30d</ToggleButton>
                  <ToggleButton value="all">All</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Grid container spacing={1}>
                {(['ADD', 'UPDATE', 'DELETE'] as const).map((event) => (
                  <Grid item xs={12} key={event}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600, color: EVENT_COLORS[event] }}>
                      {event}
                    </Typography>
                    <Box sx={{ height: 72 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 2, right: 8, left: -18, bottom: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                          <ReTooltip />
                          <Bar dataKey={event} fill={EVENT_COLORS[event]} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>FoxMemory details</Typography>
              <Typography color="text.secondary">Base URL: {foxmemory?.baseUrl || '—'}</Typography>
              {foxmemory?.searches && (
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  Searches: {foxmemory.searches.total} · avg results {foxmemory.searches.avgResults ?? '—'} · avg score {foxmemory.searches.avgTopScore?.toFixed(3) ?? '—'}
                </Typography>
              )}

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
                  <Typography variant="caption" color="text.secondary">Recent activity</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {(foxmemory?.recentActivity || []).slice(0, 4).map((entry, i) => (
                      <Box key={i} sx={{ mb: 0.5 }}>
                        <Chip
                          size="small"
                          label={entry.event}
                          sx={{ mr: 0.5, fontSize: 10, height: 18, bgcolor: EVENT_COLORS[entry.event] || '#adb5bd', color: '#fff' }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                          {entry.preview ? entry.preview.slice(0, 40) : entry.memoryId.slice(0, 8)}
                        </Typography>
                      </Box>
                    ))}
                    {!(foxmemory?.recentActivity || []).length && (
                      <Typography variant="caption" color="text.secondary">No recent activity.</Typography>
                    )}
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
      )}
    </>
  );
};

export default FoxMemorySection;
