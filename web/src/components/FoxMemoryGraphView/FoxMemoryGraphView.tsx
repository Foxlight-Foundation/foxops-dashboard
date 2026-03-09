import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, FormControl, Grid, MenuItem, Select, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import ForceGraph2D from 'react-force-graph-2d';
import StatCard from '../StatCard/StatCard';
import { grad } from '../shared/styled';
import { useGetFoxmemoryGraphDataQuery } from '../../services/dashboardApi';
import type { FoxmemoryGraphNode, FoxmemoryGraphLink } from '../../types';
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

// Lerp through #281EE6 → #3E6BE6 → #5CACE6
const hashNodeColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  const t = (Math.abs(h) % 1000) / 999;
  const stops = [[0x28, 0x1e, 0xe6], [0x3e, 0x6b, 0xe6], [0x5c, 0xac, 0xe6]] as const;
  const seg = t < 0.5 ? 0 : 1;
  const st = seg === 0 ? t * 2 : (t - 0.5) * 2;
  const [r1, g1, b1] = stops[seg];
  const [r2, g2, b2] = stops[seg + 1];
  return `rgb(${Math.round(r1 + (r2 - r1) * st)},${Math.round(g1 + (g2 - g1) * st)},${Math.round(b1 + (b2 - b1) * st)})`;
};

const PillTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = item.name;
  const value = item.value;
  const color = (item as unknown as { payload?: { fill?: string } }).payload?.fill as string | undefined;
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

// ── Explorer ─────────────────────────────────────────────────────────────────

type RawNode = FoxmemoryGraphNode & { x?: number; y?: number; vx?: number; vy?: number };
type RawLink = { source: string | RawNode; target: string | RawNode; label: string };


const MIN_DEGREE_OPTIONS = [
  { value: 0, label: 'All nodes' },
  { value: 1, label: '1+ connections' },
  { value: 2, label: '2+ connections' },
  { value: 3, label: '3+ connections' },
  { value: 5, label: '5+ connections' },
  { value: 10, label: '10+ connections' },
];

const GraphExplorer = ({ minDegree }: { minDegree: number }) => {
  const { data, isLoading } = useGetFoxmemoryGraphDataQuery();
  const [selectedNode, setSelectedNode] = useState<FoxmemoryGraphNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(520);

  const measureSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.offsetWidth);
    const top = el.getBoundingClientRect().top;
    setHeight(Math.max(300, Math.floor(window.innerHeight - top - 24)));
  }, []);

  useLayoutEffect(() => {
    measureSize();
    const obs = new ResizeObserver(measureSize);
    if (containerRef.current) obs.observe(containerRef.current);
    window.addEventListener('resize', measureSize);
    return () => { obs.disconnect(); window.removeEventListener('resize', measureSize); };
  }, [measureSize, data]);

  useEffect(() => {
    if (!selectedNode) return;
    const handler = (e: MouseEvent) => {
      if (detailRef.current && !detailRef.current.contains(e.target as Node)) {
        setSelectedNode(null);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [selectedNode]);

  const graphData = useMemo(() => {
    const raw = data?.data;
    if (!raw) return { nodes: [], links: [] };
    const keep = new Set(raw.nodes.filter((n) => n.degree >= minDegree).map((n) => n.id));
    return {
      nodes: raw.nodes.filter((n) => keep.has(n.id)).map((n) => ({ ...n })) as RawNode[],
      links: raw.links.filter((l) => keep.has(l.source) && keep.has(l.target)).map((l) => ({ ...l })) as RawLink[],
    };
  }, [data, minDegree]);

  const selectedLinks = useMemo<FoxmemoryGraphLink[]>(() => {
    if (!selectedNode || !data?.data) return [];
    return data.data.links.filter(
      (l) => l.source === selectedNode.id || l.target === selectedNode.id
    );
  }, [selectedNode, data]);

  const handleNodeClick = useCallback((node: object) => {
    const n = node as RawNode;
    setSelectedNode((prev) => (prev?.id === n.id ? null : { id: n.id, name: n.name, degree: n.degree }));
  }, []);

  const nodeColor = useCallback((node: object) => {
    const n = node as RawNode;
    return hashNodeColor(n.name);
  }, []);

  const nodeLabel = useCallback((node: object) => {
    const n = node as RawNode;
    return `${n.name} · ${n.degree} connections`;
  }, []);

  const nodeVal = useCallback((node: object) => {
    const n = node as RawNode;
    return Math.max(1, Math.log(n.degree + 1) * 3);
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!data?.data?.nodes.length) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <Typography variant="body2" color="text.secondary">No graph data available.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Card sx={{ borderRadius: 1, overflow: 'hidden' }}>
        <Box ref={containerRef} sx={{ width: '100%', cursor: 'grab', '&:active': { cursor: 'grabbing' }, lineHeight: 0 }}>
          <ForceGraph2D
            graphData={graphData}
            width={width}
            height={height}
            nodeColor={nodeColor}
            nodeLabel={nodeLabel}
            nodeVal={nodeVal}
            linkColor={() => 'rgba(100,110,140,0.4)'}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setSelectedNode(null)}
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const n = node as RawNode;
              if (globalScale < 1.5) return;
              const label = n.name.length > 20 ? n.name.slice(0, 18) + '…' : n.name;
              const fontSize = 11 / globalScale;
              ctx.font = `${fontSize}px monospace`;
              const textW = ctx.measureText(label).width;
              const padX = 4 / globalScale;
              const padY = 2 / globalScale;
              const pillW = textW + padX * 2;
              const pillH = fontSize + padY * 2;
              const r = pillH / 2;
              const x = (n.x ?? 0) - pillW / 2;
              const y = (n.y ?? 0) + 5 / globalScale;
              ctx.fillStyle = 'rgba(255,255,255,0.70)';
              ctx.beginPath();
              ctx.roundRect(x, y, pillW, pillH, r);
              ctx.fill();
              ctx.fillStyle = 'rgba(30,30,50,1)';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillText(label, n.x ?? 0, y + padY);
            }}
            cooldownTicks={120}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        </Box>
      </Card>

      {selectedNode && (
        <Box
          ref={detailRef}
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            zIndex: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Card sx={{ borderRadius: 1, background: 'rgba(255,255,255,0.79)', backdropFilter: 'blur(21px)', border: '1px solid rgba(255,255,255,0.5)' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: hashNodeColor(selectedNode.name), flexShrink: 0 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {selectedNode.name}
                </Typography>
                <Chip label={`${selectedNode.degree} connections`} size="small" sx={{ ml: 'auto', fontSize: 11 }} />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 160, overflowY: 'auto' }}>
                {selectedLinks.map((l, i) => {
                  const isSource = l.source === selectedNode.id;
                  return (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 1, px: 1, py: 0.25 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: 'text.secondary', opacity: isSource ? 0.70 : 1 }}>
                        {isSource ? l.target : l.source}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: 11, color: '#5e72e4', fontStyle: 'italic' }}>
                        {isSource ? `→ ${l.label}` : `← ${l.label}`}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const FoxMemoryGraphView = ({ stats, diagnostics, loading }: FoxMemoryGraphViewProps) => {
  const [subView, setSubView] = useState<GraphSubView>('performance');
  const [minDegree, setMinDegree] = useState(1);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        {subView === 'explorer' ? (
          <FormControl size="small">
            <Select
              value={minDegree}
              onChange={(e) => setMinDegree(Number(e.target.value))}
              sx={{
                fontSize: 12,
                fontWeight: 600,
                background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12)',
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.8)' },
                '&:hover': { background: 'linear-gradient(45deg, #1a3fc4 0%, #6690f5 100%)' },
                '& .MuiSelect-select': { py: '6px', px: '14px' },
              }}
            >
              {MIN_DEGREE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: 12 }}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : <Box />}
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
        <GraphExplorer minDegree={minDegree} />
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
                    <ReTooltip content={PillTooltip} isAnimationActive={false} />
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
