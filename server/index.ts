import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '..');
const killQueuePath = path.join(workspaceRoot, 'docs', 'ACP_KILL_QUEUE.md');
const foxmemoryBaseUrl = process.env.FOXMEMORY_BASE_URL || 'http://192.168.0.118:8082';
const foxmemoryUserId = process.env.FOXMEMORY_USER_ID || 'thomastupper92618@gmail.com';
const gatewayErrLogPath = path.join(process.env.HOME || '', '.openclaw', 'logs', 'gateway.err.log');
const pluginLogMatch = /foxmemory-openclaw-memory|foxmemory-plugin-v2/i;
const gatewayLogPath = path.join(process.env.HOME || '', '.openclaw', 'logs', 'gateway.log');
const artifactsDir = path.join(workspaceRoot, 'artifacts');

// ── Types ──────────────────────────────────────────────────────────────────────

interface OpenclawSession {
  key: string;
  sessionId: string;
  kind?: string;
  model?: string;
  age?: string;
  tokensUsed?: number;
  tokensCtx?: number;
  tokensPct?: number;
  flags?: string[];
  [key: string]: unknown;
}

interface RetrievalQuality {
  value: string;
  source: string;
  raw?: { total: number; searchable: number };
}

interface ErrorSamples {
  count: number;
  samples: string[];
}

interface AutoCaptureHealth {
  lastAutoCaptureAt: string | null;
  captureSuccessCountWindow: number;
  captureWindowMinutes: number;
  lastCaptureError: { at: string; line: string } | null;
}

interface PluginTelemetryEvent {
  at: string;
  type: string;
  mode?: string;
}

interface PluginTelemetry {
  windowMinutes: number;
  captureAttempts: number;
  captureSuccess: number;
  captureNone: number;
  captureFailed: number;
  recallFailed: number;
  modeInfer: number;
  modeRaw: number;
  lastCaptureMode: string | null;
  lastEndpoint: string | null;
  recent: PluginTelemetryEvent[];
}

interface PluginLogs {
  file: string;
  count: number;
  lines: string[];
}

interface DaySeries {
  day: string;
  count: number;
}

interface ApiResult {
  ok: boolean;
  status: number | null;
  endpoint: string | null;
}

interface MemoryItem {
  createdAt?: string;
  [key: string]: unknown;
}

interface FoxmemoryStats {
  writesByMode?: { infer?: number; raw?: number };
  memoryEvents?: { ADD?: number; UPDATE?: number; DELETE?: number; NONE?: number };
  ingestionQueueDepth?: number;
  ingestion_queue_depth?: number;
  queueDepth?: number;
  queue_depth?: number;
}

interface FoxmemoryOverview {
  baseUrl: string;
  userId: string;
  api: ApiResult;
  ingestionQueueDepth: number | null;
  memoryCount: number;
  memoriesByDay: DaySeries[];
  memoriesByDay7d: DaySeries[];
  retrievalQuality: RetrievalQuality;
  recentErrors: ErrorSamples;
  autoCapture: AutoCaptureHealth;
  pluginTelemetry: PluginTelemetry;
  pluginLogs: PluginLogs;
  stats: FoxmemoryStats | null;
}

interface KillRequestBody {
  sessionKey: string;
  sessionId: string;
  reason?: string;
}

// ── Data loading ───────────────────────────────────────────────────────────────

const countRecentFoxmemoryErrors = (): ErrorSamples => {
  if (!fs.existsSync(gatewayErrLogPath)) return { count: 0, samples: [] };
  const lines = fs.readFileSync(gatewayErrLogPath, 'utf8').split('\n').slice(-1500);
  const matches = lines.filter((l) => /foxmemory|mem0|qdrant|memory api/i.test(l));
  return { count: matches.length, samples: matches.slice(-5) };
}

const loadLatestRetrievalQuality = (): RetrievalQuality => {
  if (!fs.existsSync(artifactsDir)) return { value: '—', source: 'no artifacts dir' };
  const files = fs
    .readdirSync(artifactsDir)
    .filter((f) => /^root-cause-eval-.*\.json$/.test(f))
    .sort();

  if (!files.length) return { value: '—', source: 'no root-cause eval artifacts' };

  const latest = files[files.length - 1];
  const fullPath = path.join(artifactsDir, latest);
  try {
    const json = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as Record<string, unknown>;
    const totals = json?.totals as Record<string, unknown> | undefined;
    const total = Number(totals?.writes_attempted ?? json?.n ?? 0);
    const searchable = Number(totals?.searchable_immediate ?? totals?.searchable ?? 0);
    if (!total) return { value: '—', source: latest };
    const pct = Math.round((searchable / total) * 100);
    return { value: `${pct}%`, source: latest, raw: { total, searchable } };
  } catch {
    return { value: '—', source: `${latest} (parse error)` };
  }
}

const readLogTailLines = (filePath: string, maxBytes = 2 * 1024 * 1024): string[] => {
  const st = fs.statSync(filePath);
  const size = st.size;
  const start = Math.max(0, size - maxBytes);
  const len = size - start;
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, start);
    return buf.toString('utf8').split('\n');
  } finally {
    fs.closeSync(fd);
  }
}

const loadAutoCaptureHealth = (windowMinutes = 60): AutoCaptureHealth => {
  if (!fs.existsSync(gatewayLogPath)) {
    return {
      lastAutoCaptureAt: null,
      captureSuccessCountWindow: 0,
      captureWindowMinutes: windowMinutes,
      lastCaptureError: null,
    };
  }

  const lines = readLogTailLines(gatewayLogPath, 2 * 1024 * 1024);
  const successNeedle = 'auto-captured';
  const errorNeedle = 'capture failed:';

  let lastAutoCaptureAt: string | null = null;
  let lastCaptureError: { at: string; line: string } | null = null;
  let captureSuccessCountWindow = 0;
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  for (const line of lines) {
    if (!line) continue;
    const ts = line.slice(0, 24).trim();
    const t = Date.parse(ts);

    if (line.includes(successNeedle)) {
      if (!lastAutoCaptureAt || (Number.isFinite(t) && t > Date.parse(lastAutoCaptureAt))) {
        lastAutoCaptureAt = Number.isFinite(t) ? new Date(t).toISOString() : ts;
      }
      if (Number.isFinite(t) && now - t <= windowMs) {
        captureSuccessCountWindow += 1;
      }
    }

    if (line.includes(errorNeedle)) {
      lastCaptureError = {
        at: Number.isFinite(t) ? new Date(t).toISOString() : ts,
        line: line.slice(line.indexOf(errorNeedle)),
      };
    }
  }

  return {
    lastAutoCaptureAt,
    captureSuccessCountWindow,
    captureWindowMinutes: windowMinutes,
    lastCaptureError,
  };
}

const loadPluginTelemetry = (windowMinutes = 60): PluginTelemetry => {
  if (!fs.existsSync(gatewayLogPath)) {
    return {
      windowMinutes,
      captureAttempts: 0,
      captureSuccess: 0,
      captureNone: 0,
      captureFailed: 0,
      recallFailed: 0,
      modeInfer: 0,
      modeRaw: 0,
      lastCaptureMode: null,
      lastEndpoint: null,
      recent: [],
    };
  }

  const lines = readLogTailLines(gatewayLogPath, 2 * 1024 * 1024);
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const out: PluginTelemetry = {
    windowMinutes,
    captureAttempts: 0,
    captureSuccess: 0,
    captureNone: 0,
    captureFailed: 0,
    recallFailed: 0,
    modeInfer: 0,
    modeRaw: 0,
    lastCaptureMode: null,
    lastEndpoint: null,
    recent: [],
  };

  for (const line of lines) {
    if (!line || !pluginLogMatch.test(line)) continue;
    const ts = line.slice(0, 24).trim();
    const t = Date.parse(ts);
    if (Number.isFinite(t) && now - t > windowMs) continue;

    if (line.includes('auto-captured memory payload')) {
      out.captureSuccess += 1;
      out.captureAttempts += 1;
      const mode = line.includes('mode=raw') ? 'raw' : 'infer';
      out.lastCaptureMode = mode;
      if (mode === 'raw') {
        out.modeRaw += 1;
        out.lastEndpoint = '/memory.raw_write';
      } else {
        out.modeInfer += 1;
        out.lastEndpoint = line.includes('/v2/') ? '/v2/memories' : '/v1/memories';
      }
      out.recent.push({ at: Number.isFinite(t) ? new Date(t).toISOString() : ts, type: 'capture_success', mode });
    } else if (line.includes('capture none')) {
      out.captureNone += 1;
      out.captureAttempts += 1;
      out.recent.push({ at: Number.isFinite(t) ? new Date(t).toISOString() : ts, type: 'capture_none' });
    } else if (line.includes('capture failed')) {
      out.captureFailed += 1;
      out.captureAttempts += 1;
      out.recent.push({ at: Number.isFinite(t) ? new Date(t).toISOString() : ts, type: 'capture_failed' });
    } else if (line.includes('recall failed')) {
      out.recallFailed += 1;
      out.recent.push({ at: Number.isFinite(t) ? new Date(t).toISOString() : ts, type: 'recall_failed' });
    }
  }

  out.recent = out.recent.slice(-10);
  return out;
}

const loadPluginLogTail = (limit = 120): PluginLogs => {
  if (!fs.existsSync(gatewayLogPath)) {
    return { file: gatewayLogPath, count: 0, lines: [] };
  }

  const lines = readLogTailLines(gatewayLogPath, 2 * 1024 * 1024)
    .filter((line) => pluginLogMatch.test(line));

  return {
    file: gatewayLogPath,
    count: lines.length,
    lines: lines.slice(-limit),
  };
}

const buildLastNDaysSeries = (series: DaySeries[], days = 7): DaySeries[] => {
  const map = Object.fromEntries((series || []).map((d) => [d.day, d.count]));
  const out: DaySeries[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    out.push({ day, count: map[day] || 0 });
  }
  return out;
}

const probeFoxmemory = async (): Promise<FoxmemoryOverview> => {
  const endpoints = ['/health', '/v1/health', '/'];
  let api: ApiResult = { ok: false, status: null, endpoint: null };

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${foxmemoryBaseUrl}${ep}`, { method: 'GET' });
      api = { ok: res.ok, status: res.status, endpoint: ep };
      if (res.ok) break;
    } catch {
      // continue next endpoint
    }
  }

  let queueDepth: number | null = null;
  let foxmemoryStats: FoxmemoryStats | null = null;
  try {
    const statsEndpoints = ['/stats', '/v2/stats'];
    for (const ep of statsEndpoints) {
      const statsRes = await fetch(`${foxmemoryBaseUrl}${ep}`, { method: 'GET' });
      if (!statsRes.ok) continue;
      const stats = (await statsRes.json()) as FoxmemoryStats;
      foxmemoryStats = stats;
      queueDepth =
        stats?.ingestionQueueDepth ??
        stats?.ingestion_queue_depth ??
        stats?.queueDepth ??
        stats?.queue_depth ??
        null;
      break;
    }
  } catch {
    // optional probe
  }

  let memories: MemoryItem[] = [];
  try {
    const u = new URL(`${foxmemoryBaseUrl}/v1/memories`);
    u.searchParams.set('user_id', foxmemoryUserId);
    const memRes = await fetch(u.toString(), { method: 'GET' });
    if (memRes.ok) {
      const payload = (await memRes.json()) as any;
      memories = Array.isArray(payload) ? payload : (payload?.results || payload?.data || []);
    }
  } catch {
    // optional probe
  }

  const byDay = memories.reduce<Record<string, number>>((acc, m) => {
    const d = m?.createdAt ? new Date(m.createdAt) : null;
    if (!d || Number.isNaN(d.getTime())) return acc;
    const day = d.toISOString().slice(0, 10);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const dailySeries: DaySeries[] = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));

  const retrieval = loadLatestRetrievalQuality();
  const errors = countRecentFoxmemoryErrors();
  const autoCapture = loadAutoCaptureHealth(60);
  const pluginTelemetry = loadPluginTelemetry(60);
  const pluginLogs = loadPluginLogTail(120);

  return {
    baseUrl: foxmemoryBaseUrl,
    userId: foxmemoryUserId,
    api,
    ingestionQueueDepth: queueDepth,
    memoryCount: memories.length,
    memoriesByDay: dailySeries,
    memoriesByDay7d: buildLastNDaysSeries(dailySeries, 7),
    retrievalQuality: retrieval,
    recentErrors: errors,
    autoCapture,
    pluginTelemetry,
    pluginLogs,
    stats: foxmemoryStats,
  };
}

// ── Express app ────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/sessions', (_req: Request, res: Response) => {
  try {
    const raw = execFileSync('openclaw', ['sessions', '--all-agents', '--json'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    });
    const parsed = JSON.parse(raw) as { sessions?: OpenclawSession[] };
    const all = parsed.sessions || [];

    // Deduplicate by sessionId — when two keys share a sessionId (e.g. bare cron:<jobId>
    // and its cron:<jobId>:run:<runId> alias), keep the more specific (longer) key.
    const byId = new Map<string, OpenclawSession>();
    for (const s of all) {
      const existing = byId.get(s.sessionId);
      if (!existing || s.key.length > existing.key.length) {
        byId.set(s.sessionId, s);
      }
    }
    const sessions = Array.from(byId.values());
    res.json({ ok: true, sessions, total: sessions.length });
  } catch (e: unknown) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e), sessions: [] });
  }
});

app.get('/api/foxmemory/overview', async (_req: Request, res: Response) => {
  try {
    const overview = await probeFoxmemory();
    return res.json({ ok: true, ...overview });
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/sessions/kill', (req: Request<Record<string, never>, unknown, KillRequestBody>, res: Response) => {
  const { sessionKey, sessionId, reason } = req.body || {};
  if (!sessionKey || !sessionId) return res.status(400).json({ ok: false, error: 'sessionKey and sessionId are required' });

  try {
    const killReason = reason || 'Manual kill requested from dashboard';
    let immediateKillSucceeded = false;
    let immediateKillNote = '';

    try {
      execFileSync(
        'openclaw',
        ['agent', '--session-id', sessionId, '--message', 'STOP NOW. Terminate this run immediately and do not continue execution.', '--json'],
        { cwd: workspaceRoot, encoding: 'utf8' }
      );
      immediateKillSucceeded = true;
      immediateKillNote = `Immediate stop command sent to sessionId=${sessionId}`;
    } catch (e: unknown) {
      immediateKillNote = `Immediate kill attempt failed: ${e instanceof Error ? e.message : String(e)}`;
    }

    if (!fs.existsSync(killQueuePath)) {
      fs.writeFileSync(
        killQueuePath,
        '# ACP Kill Queue\n\n| requested_at_ct | session_key | session_id | reason | status |\n|---|---|---|---|---|\n'
      );
    }

    const requestedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour12: false });
    const queueStatus = immediateKillSucceeded ? 'attempted_immediate' : 'queued';
    const queueReason = `${killReason}. ${immediateKillNote}`.replace(/\|/g, '\\|');
    const queueRow = `| ${requestedAt} | ${sessionKey} | ${sessionId} | ${queueReason} | ${queueStatus} |\n`;
    fs.appendFileSync(killQueuePath, queueRow);

    return res.json({ ok: true, queued: !immediateKillSucceeded, immediateKillSucceeded, note: immediateKillNote });
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/sessions/delete', (req: Request<Record<string, never>, unknown, { sessionKey: string; sessionId: string }>, res: Response) => {
  const { sessionKey, sessionId } = req.body || {};
  if (!sessionKey || !sessionId) return res.status(400).json({ ok: false, error: 'sessionKey and sessionId are required' });

  try {
    // Extract agentId from key pattern "agent:<agentId>:..."
    const agentId = sessionKey.split(':')[1] ?? 'main';
    const home = process.env.HOME || '';
    const transcriptPath = path.join(home, '.openclaw', 'agents', agentId, 'sessions', `${sessionId}.jsonl`);

    if (fs.existsSync(transcriptPath)) {
      fs.unlinkSync(transcriptPath);
    }

    // Clean up the orphaned store entry
    execFileSync('openclaw', ['sessions', 'cleanup', '--fix-missing', '--enforce', '--agent', agentId], {
      encoding: 'utf8',
    });

    return res.json({ ok: true, deleted: true, transcriptPath });
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Serve built web app in production
const distPath = path.resolve(__dirname, '..', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`ACP dashboard API listening on http://localhost:${PORT}`);
});
