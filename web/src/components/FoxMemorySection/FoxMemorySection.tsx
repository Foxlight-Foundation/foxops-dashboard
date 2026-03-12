import { useMemo, useState } from 'react';
import { Box, CardContent, Chip, Collapse, Grid, LinearProgress, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import { GlassCard } from '../shared/styled';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import MemoryRoundedIcon from '@mui/icons-material/MemoryRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import StatCard from '../StatCard/StatCard';
import FoxMemoryAgentsView from '../FoxMemoryAgentsView/FoxMemoryAgentsView';
import FoxMemoryGraphView from '../FoxMemoryGraphView/FoxMemoryGraphView';
import { grad } from '../shared/styled';
import {
  useGetFoxmemoryPromptsQuery,
  useGetFoxmemoryGraphStatsQuery,
  useSetFoxmemoryExtractionPromptMutation,
  useSetFoxmemoryUpdatePromptMutation,
  useSetFoxmemoryGraphPromptMutation,
} from '../../services/dashboardApi';
import type { FoxMemorySectionProps } from './FoxMemorySection.types';
import type { ChartRange } from '../../types';

const fmtMs = (ms: number | null | undefined): string => {
  if (ms == null) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
};

type SubView = 'performance' | 'agents' | 'graph';

const EVENT_COLORS: Record<string, string> = { ADD: '#2dce89', UPDATE: '#5e72e4', DELETE: '#f5365c', NONE: '#adb5bd' };

const PillTooltip = ({ active, payload, label }: TooltipContentProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const { name, value, color } = payload[0];
  return (
    <Box sx={{ bgcolor: 'rgba(15,17,26,0.92)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', px: 1.5, py: 0.5, borderRadius: 10, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.75, pointerEvents: 'none' }}>
      {color && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />}
      {label && <span style={{ opacity: 0.6 }}>{label}</span>}
      {label && <span style={{ opacity: 0.4 }}>·</span>}
      <span>{name ?? ''} {value}</span>
    </Box>
  );
};

const TabLabel = ({ label, health }: { label: string; health?: import('../../types').SectionHealth }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    {label}
    {health === 'error' && <ErrorRoundedIcon sx={{ fontSize: 16, color: '#f5365c' }} />}
  </Box>
);

const FoxMemorySection = ({ foxmemory, chartRange, onChartRangeChange, tabHealth }: FoxMemorySectionProps) => {
  const [subView, setSubView] = useState<SubView>('performance');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const toggleRow = (i: number) => setExpandedRows((prev) => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const { data: prompts, isFetching: promptsLoading } = useGetFoxmemoryPromptsQuery(undefined, {
    skip: subView !== 'agents',
  });
  const { data: graphStatsData, isFetching: graphStatsLoading } = useGetFoxmemoryGraphStatsQuery(undefined, {
    skip: subView !== 'graph',
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
  });
  const [saveExtractionPrompt] = useSetFoxmemoryExtractionPromptMutation();
  const [saveUpdatePrompt] = useSetFoxmemoryUpdatePromptMutation();
  const [saveGraphPrompt] = useSetFoxmemoryGraphPromptMutation();

  const onSaveExtractionPrompt = async (prompt: string | null) => { await saveExtractionPrompt({ prompt }).unwrap(); };
  const onSaveUpdatePrompt = async (prompt: string | null) => { await saveUpdatePrompt({ prompt }).unwrap(); };
  const onSaveGraphPrompt = async (prompt: string | null) => { await saveGraphPrompt({ prompt }).unwrap(); };

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
      <Tabs
        value={subView}
        onChange={(_, v: SubView) => setSubView(v)}
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={<TabLabel label="Performance" health={tabHealth?.performance} />} value="performance" />
        <Tab label={<TabLabel label="Agents" health={tabHealth?.agents} />} value="agents" />
        <Tab label={<TabLabel label="Graph" health={tabHealth?.graph} />} value="graph" />
      </Tabs>

      {subView === 'graph' ? (
        <FoxMemoryGraphView
          stats={graphStatsData?.data}
          diagnostics={foxmemory?.diagnostics}
          loading={graphStatsLoading}
        />
      ) : subView === 'agents' ? (
        <FoxMemoryAgentsView
          foxmemory={foxmemory}
          prompts={prompts}
          promptsLoading={promptsLoading}
          onSaveExtractionPrompt={onSaveExtractionPrompt}
          onSaveUpdatePrompt={onSaveUpdatePrompt}
          onSaveGraphPrompt={onSaveGraphPrompt}
        />
      ) : (
      <>
      <Grid container spacing={1.5} mb={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Memories Stored" value={foxmemory?.memoryCount ?? 0} icon={<TimelineRoundedIcon fontSize="small" />} iconColor={grad('#5e72e4', '#825ee4')} />
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
          <GlassCard sx={{ borderRadius: 1, height: '100%' }}>
            <CardContent sx={{ p: 3, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexShrink={0}>
                <Typography variant="h6" fontWeight={700}>Memory events by day</Typography>
                <ToggleButtonGroup exclusive size="small" value={chartRange} onChange={(_, v: ChartRange | null) => v && onChartRangeChange(v)}>
                  <ToggleButton value="7d">7d</ToggleButton>
                  <ToggleButton value="30d">30d</ToggleButton>
                  <ToggleButton value="all">All</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Grid container spacing={1} sx={{ flex: 1, minHeight: 0 }}>
                {(['ADD', 'UPDATE', 'DELETE'] as const).map((event) => (
                  <Grid item xs={12} key={event} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontWeight: 600, color: EVENT_COLORS[event], flexShrink: 0 }}>
                      {event}
                    </Typography>
                    <Box sx={{ flex: 1, minHeight: 60 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 2, right: 8, left: -18, bottom: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                          <ReTooltip cursor={false} content={PillTooltip} isAnimationActive={false} />
                          <Bar dataKey={event} fill={EVENT_COLORS[event]} radius={[3, 3, 0, 0]} activeBar={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </GlassCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
            {/* Search Performance */}
            <GlassCard sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Search Performance (30d)</Typography>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Total searches', value: foxmemory?.searches?.total ?? '—' },
                    { label: 'Avg results', value: foxmemory?.searches?.avgResults?.toFixed(1) ?? '—' },
                    { label: 'Avg latency', value: fmtMs(foxmemory?.searches?.avgLatencyMs) },
                  ].map(({ label, value }) => (
                    <Grid item xs={4} key={label}>
                      <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>{value}</Typography>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                <Box sx={{ mt: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Avg top score</Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {foxmemory?.searches?.avgTopScore != null ? foxmemory.searches.avgTopScore.toFixed(3) : '—'}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(foxmemory?.searches?.avgTopScore ?? 0) * 100}
                    sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: '#11cdef' } }}
                  />
                </Box>
              </CardContent>
            </GlassCard>

            {/* Write Latency */}
            <GlassCard sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Write Latency (30d)</Typography>
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                  {[
                    { label: 'avg', value: fmtMs(foxmemory?.memorySummary?.writeLatency?.avgMs) },
                    { label: 'min', value: fmtMs(foxmemory?.memorySummary?.writeLatency?.minMs) },
                    { label: 'max', value: fmtMs(foxmemory?.memorySummary?.writeLatency?.maxMs) },
                  ].map(({ label, value }) => (
                    <Grid item xs={4} key={label}>
                      <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: 'action.hover', textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>{value}</Typography>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                {foxmemory?.memorySummary?.writeLatency && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">avg vs max</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {Math.round((foxmemory.memorySummary.writeLatency.avgMs / foxmemory.memorySummary.writeLatency.maxMs) * 100)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(foxmemory.memorySummary.writeLatency.avgMs / foxmemory.memorySummary.writeLatency.maxMs) * 100}
                      sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: '#f5365c' } }}
                    />
                  </Box>
                )}
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Write mode mix</Typography>
                  <Box sx={{ height: 80 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={modeData} dataKey="value" nameKey="name" innerRadius={18} outerRadius={34} paddingAngle={2}>
                          <Cell fill="#5e72e4" />
                          <Cell fill="#11cdef" />
                        </Pie>
                        <ReTooltip content={PillTooltip} isAnimationActive={false} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </Box>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <GlassCard sx={{ borderRadius: 1, mt: 1.5 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Recent Activity</Typography>
          {(foxmemory?.recentActivity || []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">No recent activity.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Type', 'Mode', 'Latency', 'Id', 'Date', ''].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, py: 0.75, color: 'text.secondary' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(foxmemory?.recentActivity || []).map((entry, i) => {
                  const d = new Date(entry.ts);
                  const date = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)} at ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                  return [
                    <TableRow key={`row-${i}`} onClick={() => toggleRow(i)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell sx={{ py: 0.75 }}>
                        <Chip size="small" label={entry.event} sx={{ height: 20, fontSize: 10, bgcolor: EVENT_COLORS[entry.event] || '#adb5bd', color: '#fff' }} />
                      </TableCell>
                      <TableCell sx={{ py: 0.75, fontSize: 11 }}>{entry.inferMode ? 'infer' : 'raw'}</TableCell>
                      <TableCell sx={{ py: 0.75, fontSize: 11, fontFamily: 'monospace' }}>{fmtMs(entry.latencyMs)}</TableCell>
                      <TableCell sx={{ py: 0.75, fontSize: 11, fontFamily: 'monospace' }}>{entry.memoryId ? entry.memoryId.slice(0, 8) : '—'}</TableCell>
                      <TableCell sx={{ py: 0.75, fontSize: 11 }}>{date}</TableCell>
                      <TableCell sx={{ py: 0.75, width: 24 }}>
                        <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: 'text.secondary', transition: 'transform 0.2s', transform: expandedRows.has(i) ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                      </TableCell>
                    </TableRow>,
                    <TableRow key={`exp-${i}`}>
                      <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                        <Collapse in={expandedRows.has(i)}>
                          <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {entry.reason && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>Reason</Typography>
                                <Typography variant="caption" sx={{ fontStyle: 'italic' }}>{entry.reason}</Typography>
                              </Box>
                            )}
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>Memory</Typography>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'text.secondary' }}>
                                {entry.memoryText || entry.preview || entry.memoryId}
                              </Typography>
                            </Box>
                            {entry.extractedFacts && entry.extractedFacts.length > 0 && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>Extracted facts ({entry.extractedFacts.length})</Typography>
                                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                  {entry.extractedFacts.map((f, fi) => (
                                    <Box component="li" key={fi}>
                                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{f}</Typography>
                                    </Box>
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>,
                  ];
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </GlassCard>
      </>
      )}
    </>
  );
};

export default FoxMemorySection;
