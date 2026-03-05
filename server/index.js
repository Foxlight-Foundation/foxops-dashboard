import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..', '..');
const registryPath = path.join(workspaceRoot, 'docs', 'ACP_SESSION_REGISTRY.md');
const updateScriptPath = path.join(workspaceRoot, 'scripts', 'acp-session-registry-update.sh');
const killQueuePath = path.join(workspaceRoot, 'docs', 'ACP_KILL_QUEUE.md');
const foxmemoryBaseUrl = process.env.FOXMEMORY_BASE_URL || 'http://192.168.0.118:8082';
const foxmemoryUserId = process.env.FOXMEMORY_USER_ID || 'thomastupper92618@gmail.com';
const gatewayErrLogPath = path.join(process.env.HOME || '', '.openclaw', 'logs', 'gateway.err.log');
const gatewayLogPath = path.join(process.env.HOME || '', '.openclaw', 'logs', 'gateway.log');
const artifactsDir = path.join(workspaceRoot, 'artifacts');

function parseRegistryTable(md) {
  const lines = md.split('\n');
  const tableLines = lines.filter((l) => l.trim().startsWith('|'));
  if (tableLines.length < 3) return [];

  const header = tableLines[0]
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  const rows = tableLines.slice(2).map((line) =>
    line
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  return rows.map((cols) => {
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = cols[i] ?? '';
    });
    return obj;
  });
}

function loadRegistry() {
  if (!fs.existsSync(registryPath)) return [];
  const content = fs.readFileSync(registryPath, 'utf8');
  return parseRegistryTable(content);
}

function countRecentFoxmemoryErrors() {
  if (!fs.existsSync(gatewayErrLogPath)) return { count: 0, samples: [] };
  const lines = fs.readFileSync(gatewayErrLogPath, 'utf8').split('\n').slice(-1500);
  const matches = lines.filter((l) => /foxmemory|mem0|qdrant|memory api/i.test(l));
  return { count: matches.length, samples: matches.slice(-5) };
}

function loadLatestRetrievalQuality() {
  if (!fs.existsSync(artifactsDir)) return { value: '—', source: 'no artifacts dir' };
  const files = fs
    .readdirSync(artifactsDir)
    .filter((f) => /^root-cause-eval-.*\.json$/.test(f))
    .sort();

  if (!files.length) return { value: '—', source: 'no root-cause eval artifacts' };

  const latest = files[files.length - 1];
  const fullPath = path.join(artifactsDir, latest);
  try {
    const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const total = Number(json?.totals?.writes_attempted ?? json?.n ?? 0);
    const searchable = Number(json?.totals?.searchable_immediate ?? json?.totals?.searchable ?? 0);
    if (!total) return { value: '—', source: latest };
    const pct = Math.round((searchable / total) * 100);
    return { value: `${pct}%`, source: latest, raw: { total, searchable } };
  } catch {
    return { value: '—', source: `${latest} (parse error)` };
  }
}

function readLogTailLines(filePath, maxBytes = 2 * 1024 * 1024) {
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

function loadAutoCaptureHealth(windowMinutes = 60) {
  if (!fs.existsSync(gatewayLogPath)) {
    return {
      lastAutoCaptureAt: null,
      captureSuccessCountWindow: 0,
      captureWindowMinutes: windowMinutes,
      lastCaptureError: null,
    };
  }

  const lines = readLogTailLines(gatewayLogPath, 2 * 1024 * 1024);
  const successNeedle = 'foxmemory-openclaw-memory: auto-captured memory payload';
  const errorNeedle = 'foxmemory-openclaw-memory capture failed:';

  let lastAutoCaptureAt = null;
  let lastCaptureError = null;
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

function loadPluginTelemetry(windowMinutes = 60) {
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
  const out = {
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
    if (!line || !line.includes('foxmemory-openclaw-memory')) continue;
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
        out.lastEndpoint = '/v1/memories';
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

function loadPluginLogTail(limit = 120) {
  if (!fs.existsSync(gatewayLogPath)) {
    return {
      file: gatewayLogPath,
      count: 0,
      lines: [],
    };
  }

  const lines = readLogTailLines(gatewayLogPath, 2 * 1024 * 1024)
    .filter((line) => line.includes('foxmemory-openclaw-memory'));

  return {
    file: gatewayLogPath,
    count: lines.length,
    lines: lines.slice(-limit),
  };
}

function buildLastNDaysSeries(series, days = 7) {
  const map = Object.fromEntries((series || []).map((d) => [d.day, d.count]));
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    out.push({ day, count: map[day] || 0 });
  }
  return out;
}

async function probeFoxmemory() {
  const endpoints = ['/health', '/v1/health', '/'];
  let api = { ok: false, status: null, endpoint: null };

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${foxmemoryBaseUrl}${ep}`, { method: 'GET' });
      api = { ok: res.ok, status: res.status, endpoint: ep };
      if (res.ok) break;
    } catch {
      // continue next endpoint
    }
  }

  let queueDepth = null;
  let foxmemoryStats = null;
  try {
    const statsRes = await fetch(`${foxmemoryBaseUrl}/stats`, { method: 'GET' });
    if (statsRes.ok) {
      const stats = await statsRes.json();
      foxmemoryStats = stats;
      queueDepth =
        stats?.ingestionQueueDepth ??
        stats?.ingestion_queue_depth ??
        stats?.queueDepth ??
        stats?.queue_depth ??
        null;
    }
  } catch {
    // optional probe
  }

  let memories = [];
  try {
    const u = new URL(`${foxmemoryBaseUrl}/v1/memories`);
    u.searchParams.set('user_id', foxmemoryUserId);
    const memRes = await fetch(u.toString(), { method: 'GET' });
    if (memRes.ok) {
      const payload = await memRes.json();
      memories = payload?.results || [];
    }
  } catch {
    // optional probe
  }

  const byDay = memories.reduce((acc, m) => {
    const d = m?.createdAt ? new Date(m.createdAt) : null;
    if (!d || Number.isNaN(d.getTime())) return acc;
    const day = d.toISOString().slice(0, 10);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const dailySeries = Object.entries(byDay)
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

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/registry', (_req, res) => {
  const rows = loadRegistry();
  const summary = {
    total: rows.length,
    spawned: rows.filter((r) => r.status === 'spawned').length,
    running: rows.filter((r) => r.status === 'running').length,
    completed: rows.filter((r) => r.status === 'completed').length,
    failed: rows.filter((r) => r.status === 'failed').length,
    silent: rows.filter((r) => r.status === 'silent').length,
    killed: rows.filter((r) => r.status === 'killed').length
  };

  res.json({
    registryPath,
    summary,
    rows
  });
});

app.get('/api/foxmemory/overview', async (_req, res) => {
  try {
    const overview = await probeFoxmemory();
    return res.json({ ok: true, ...overview });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error.message || error) });
  }
});

app.post('/api/registry/kill', (req, res) => {
  const { runId, childSessionKey, reason } = req.body || {};
  if (!runId) return res.status(400).json({ ok: false, error: 'runId is required' });

  try {
    const killReason = reason || 'Manual kill requested from dashboard';
    let attemptedImmediateKill = false;
    let immediateKillSucceeded = false;
    let immediateKillNote = '';

    // Best-effort immediate kill path:
    // 1) Resolve child session key -> sessionId from CLI JSON.
    // 2) Send a stop/terminate directive into that session.
    // If any step fails, we fall back to queueing.
    try {
      attemptedImmediateKill = true;
      const sessionsJson = execFileSync('openclaw', ['sessions', '--all-agents', '--json'], {
        cwd: workspaceRoot,
        encoding: 'utf8'
      });
      const parsed = JSON.parse(sessionsJson);
      const match = (parsed.sessions || []).find((s) => s.key === childSessionKey);

      if (match?.sessionId) {
        execFileSync(
          'openclaw',
          [
            'agent',
            '--session-id',
            match.sessionId,
            '--message',
            'STOP NOW. Terminate this run immediately and do not continue execution.',
            '--json'
          ],
          { cwd: workspaceRoot, encoding: 'utf8' }
        );
        immediateKillSucceeded = true;
        immediateKillNote = `Immediate stop command sent to sessionId=${match.sessionId}`;
      } else {
        immediateKillNote = 'No matching sessionId found for child_session_key in CLI session list.';
      }
    } catch (e) {
      immediateKillNote = `Immediate kill attempt failed: ${String(e.message || e)}`;
    }

    // Always record audit trail in kill queue (success or fallback)
    if (!fs.existsSync(killQueuePath)) {
      fs.writeFileSync(
        killQueuePath,
        '# ACP Kill Queue\n\n| requested_at_ct | run_id | child_session_key | reason | status |\n|---|---|---|---|---|\n'
      );
    }

    const requestedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour12: false });
    const queueStatus = immediateKillSucceeded ? 'attempted_immediate' : 'queued';
    const queueReason = `${killReason}. ${immediateKillNote}`.replace(/\|/g, '\\|');
    const queueRow = `| ${requestedAt} | ${runId} | ${childSessionKey || ''} | ${queueReason} | ${queueStatus} |\n`;
    fs.appendFileSync(killQueuePath, queueRow);

    execFileSync(updateScriptPath, [
      '--run-id',
      runId,
      '--status',
      'killed',
      '--outcome',
      immediateKillSucceeded ? `${killReason} (immediate stop attempted)` : `${killReason} (queued; immediate stop unavailable)`,
      '--artifacts',
      'docs/ACP_KILL_QUEUE.md'
    ]);

    return res.json({
      ok: true,
      queued: !immediateKillSucceeded,
      attemptedImmediateKill,
      immediateKillSucceeded,
      note: immediateKillNote
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error.message || error) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`ACP dashboard API listening on http://localhost:${PORT}`);
});