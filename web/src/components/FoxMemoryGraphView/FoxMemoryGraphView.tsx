import { useState } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, Grid, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import type { TooltipProps } from 'recharts';
import StatCard from '../StatCard/StatCard';
import { grad } from '../shared/styled';
import type { FoxMemoryGraphViewProps } from './FoxMemoryGraphView.types';

const LABEL_COLORS: Record<string, string> = {
  technology: '#5e72e4',
  file: '#11cdef',
  concept: '#2dce89',
  command: '#fb6340',
  filepath: '#11cdef',
  document: '#825ee4',
  programmingelement: '#5e72e4',
  url: '#2dce89',
  issue: '#f5365c',
  software: '#5e72e4',
  event: '#fb6340',
  website: '#2dce89',
  process: '#11cdef',
  operation: '#825ee4',
  organization: '#2dce89',
  hardware: '#fb6340',
  project: '#5e72e4',
  error: '#f5365c',
  errorcode: '#f5365c',
};

const labelColor = (label: string) => LABEL_COLORS[label.toLowerCase()] ?? '#adb5bd';

const PIE_COLORS = ['#5e72e4', '#2dce89', '#11cdef', '#fb6340', '#825ee4', '#f5365c', '#ffd600', '#2dbd5a', '#11b4ef', '#e91e63'];

const PillTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: entry } = payload[0];
  const color = entry?.fill as string;
  return (
    <Box sx={{ bgcolor: 'rgba(15,17,26,0.92)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', px: 1.5, py: 0.5, borderRadius: 10, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.75, pointerEvents: 'none' }}>
      {color && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />}
      <span style={{ fontFamily: 'monospace' }}>{name}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>degree {value}</span>
    </Box>
  );
};

type GraphSubView = 'performance' | 'explorer';

const FoxMemoryGraphView = ({ stats, diagnostics, loading }: FoxMemoryGraphViewProps) => {
  const [subView, setSubView] = useState<GraphSubView>('performance');

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const byLabel = stats?.byLabel ? Object.entries(stats.byLabel).sort((a, b) => b[1] - a[1]) : [];
  const topRelations = stats?.byRelationType
    ? Object.entries(stats.byRelationType).sort((a, b) => b[1] - a[1]).slice(0, 10)
    : [];

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={subView}
          onChange={(_, v: GraphSubView | null) => v && setSubView(v)}
          sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12)', borderRadius: '8px', overflow: 'hidden' }}
        >
          <ToggleButton
            value="performance"
            sx={{
              px: 2, fontWeight: 600, fontSize: 12, borderRadius: '8px 0 0 8px !important',
              '&.Mui-selected': {
                background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(30,60,200,0.45)',
                '&:hover': { background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)' },
              },
            }}
          >
            Performance
          </ToggleButton>
          <ToggleButton
            value="explorer"
            sx={{
              px: 2, fontWeight: 600, fontSize: 12, borderRadius: '0 8px 8px 0 !important',
              '&.Mui-selected': {
                background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(30,60,200,0.45)',
                '&:hover': { background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)' },
              },
            }}
          >
            Explorer
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {subView === 'explorer' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
          <Typography variant="body2" color="text.secondary">Graph explorer coming soon.</Typography>
        </Box>
      ) : (
      <>
      <Grid container spacing={1.5} mb={2.5}>
        <Grid item xs={12} sm={4}>
          <StatCard title="Nodes" value={stats?.nodeCount ?? '—'} icon={<HubRoundedIcon fontSize="small" />} iconColor={grad('#5e72e4', '#825ee4')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard title="Edges" value={stats?.edgeCount ?? '—'} icon={<DeviceHubRoundedIcon fontSize="small" />} iconColor={grad('#2dce89', '#11cdef')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Neo4j"
            value={diagnostics?.neo4jConnected ? 'connected' : 'disconnected'}
            icon={<HubRoundedIcon fontSize="small" />}
            iconColor={diagnostics?.neo4jConnected ? grad('#2dce89', '#2dbd5a') : grad('#f5365c', '#f56036')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        {/* Left column: node labels + relation types stacked */}
        <Grid item xs={12} md={7}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Card sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Node labels</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {byLabel.map(([label, count]) => (
                    <Chip
                      key={label}
                      label={`${label} · ${count}`}
                      size="small"
                      sx={{
                        bgcolor: `${labelColor(label)}22`,
                        color: labelColor(label),
                        fontWeight: 600,
                        fontSize: 11,
                        border: `1px solid ${labelColor(label)}44`,
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Top relation types */}
            <Card sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Top relation types</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {topRelations.map(([rel, count]) => (
                    <Chip
                      key={rel}
                      label={`${rel} · ${count}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 11, fontFamily: 'monospace' }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Right column: most connected pie */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 1, height: '100%' }}>
            <CardContent sx={{ p: 2.5, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Most connected</Typography>
              <Box sx={{ flex: 1, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(stats?.mostConnected ?? []).map((n) => ({ name: n.name, value: n.degree }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="38%"
                      outerRadius="62%"
                      paddingAngle={2}
                    >
                      {(stats?.mostConnected ?? []).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip content={<PillTooltip />} isAnimationActive={false} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {(stats?.mostConnected ?? []).map((node, i) => (
                  <Box key={node.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {node.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </>
      )}
    </>
  );
};

export default FoxMemoryGraphView;
