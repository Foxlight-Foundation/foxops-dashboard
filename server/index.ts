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
const qdrantBaseUrl = process.env.QDRANT_BASE_URL || (() => {
  try {
    const u = new URL(foxmemoryBaseUrl);
    return `${u.protocol}//${u.hostname}:6333`;
  } catch {
    return 'http://127.0.0.1:6333';
  }
})();

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

interface ApiResult {
  ok: boolean;
  status: number | null;
  endpoint: string | null;
}

interface FoxmemoryStats {
  writesByMode?: { infer?: number; raw?: number };
  memoryEvents?: { ADD?: number; UPDATE?: number; DELETE?: number; NONE?: number };
}

interface MemoryDayEntry {
  date: string;
  ADD: number;
  UPDATE: number;
  DELETE: number;
  NONE: number;
  avgLatencyMs?: number;
}

interface MemoryActivityEntry {
  ts: string;
  event: string;
  memoryId: string;
  userId?: string;
  runId?: string;
  preview?: string;
  latencyMs?: number;
  inferMode?: boolean;
}

interface MemorySummary {
  total: number;
  byEvent: { ADD: number; UPDATE: number; DELETE: number; NONE: number };
  noneRatePct?: number;
  writeLatency?: { avgMs: number; minMs: number; maxMs: number };
  model?: { llm: string; embed: string };
}

interface MemorySearchStats {
  total: number;
  avgResults?: number;
  avgTopScore?: number;
  avgLatencyMs?: number;
}

interface FoxmemoryDiagnostics {
  graphEnabled?: boolean;
  graphLlmModel?: string | null;
  neo4jUrl?: string | null;
}

interface FoxmemoryOverview {
  baseUrl: string;
  userId: string;
  api: ApiResult;
  llmModel: string | null;
  embedModel: string | null;
  ingestionQueueDepth: number | null;
  memoryCount: number;
  memoriesByDay: MemoryDayEntry[];
  memorySummary: MemorySummary | null;
  recentActivity: MemoryActivityEntry[];
  searches: MemorySearchStats | null;
  stats: FoxmemoryStats | null;
  diagnostics: FoxmemoryDiagnostics | null;
}

interface KillRequestBody {
  sessionKey: string;
  sessionId: string;
  reason?: string;
}

// ── Data loading ───────────────────────────────────────────────────────────────

const probeFoxmemory = async (): Promise<FoxmemoryOverview> => {
  // Health probe via v2
  let api: ApiResult = { ok: false, status: null, endpoint: null };
  let llmModel: string | null = null;
  let embedModel: string | null = null;
  let diagnostics: FoxmemoryDiagnostics | null = null;
  try {
    const res = await fetch(`${foxmemoryBaseUrl}/v2/health`, { method: 'GET' });
    api = { ok: res.ok, status: res.status, endpoint: '/v2/health' };
    if (res.ok) {
      const json = (await res.json()) as { data?: { llmModel?: string; embedModel?: string; diagnostics?: { graphEnabled?: boolean; graphLlmModel?: string; neo4jUrl?: string; neo4jConnected?: boolean; neo4jNodeCount?: number; neo4jRelationCount?: number } } };
      llmModel = json?.data?.llmModel ?? null;
      embedModel = json?.data?.embedModel ?? null;
      const d = json?.data?.diagnostics;
      if (d) diagnostics = { graphEnabled: d.graphEnabled, graphLlmModel: d.graphLlmModel ?? null, neo4jUrl: d.neo4jUrl ?? null, neo4jConnected: d.neo4jConnected, neo4jNodeCount: d.neo4jNodeCount ?? null, neo4jRelationCount: d.neo4jRelationCount ?? null };
    }
  } catch {
    // fallback to /health
    try {
      const res = await fetch(`${foxmemoryBaseUrl}/health`, { method: 'GET' });
      api = { ok: res.ok, status: res.status, endpoint: '/health' };
    } catch {
      // service unreachable
    }
  }

  // Runtime stats (/v2/stats) for writesByMode + memoryEvents counters
  let foxmemoryStats: FoxmemoryStats | null = null;
  try {
    const statsRes = await fetch(`${foxmemoryBaseUrl}/v2/stats`, { method: 'GET' });
    if (statsRes.ok) {
      const json = (await statsRes.json()) as { ok?: boolean; data?: { writesByMode?: FoxmemoryStats['writesByMode']; memoryEvents?: FoxmemoryStats['memoryEvents'] } } & FoxmemoryStats;
      const data = json?.data ?? json;
      foxmemoryStats = {
        writesByMode: data?.writesByMode,
        memoryEvents: data?.memoryEvents,
      };
    }
  } catch {
    // optional
  }

  // Analytics from /v2/stats/memories?days=30 + /v2/write-events (richer recent activity)
  let memoriesByDay: MemoryDayEntry[] = [];
  let memorySummary: MemorySummary | null = null;
  let recentActivity: MemoryActivityEntry[] = [];
  let searches: MemorySearchStats | null = null;
  let analyticsCount = 0;
  try {
    const [memStatsRes, writeEventsRes] = await Promise.all([
      fetch(`${foxmemoryBaseUrl}/v2/stats/memories?days=30`, { method: 'GET' }),
      fetch(`${foxmemoryBaseUrl}/v2/write-events?limit=20`, { method: 'GET' }),
    ]);
    if (memStatsRes.ok) {
      const json = (await memStatsRes.json()) as {
        ok?: boolean;
        data?: {
          summary?: MemorySummary;
          byDay?: MemoryDayEntry[];
          searches?: MemorySearchStats;
        };
      };
      const data = json?.data;
      memorySummary = data?.summary ?? null;
      memoriesByDay = data?.byDay ?? [];
      searches = data?.searches ?? null;
      analyticsCount = data?.summary?.total ?? 0;
    }
    if (writeEventsRes.ok) {
      const json = (await writeEventsRes.json()) as {
        ok?: boolean;
        data?: {
          events?: Array<{
            id: string;
            ts: string;
            event_type: string;
            memory_id: string;
            user_id: string | null;
            run_id: string | null;
            memory_text: string;
            reason: string | null;
            extracted_facts: string[] | null;
            call_id: string | null;
            latency_ms: number;
            infer_mode: boolean;
          }>;
        };
      };
      recentActivity = (json?.data?.events ?? []).map((e) => ({
        ts: e.ts,
        event: e.event_type,
        memoryId: e.memory_id,
        userId: e.user_id ?? undefined,
        runId: e.run_id ?? undefined,
        preview: e.memory_text,
        memoryText: e.memory_text,
        reason: e.reason,
        extractedFacts: e.extracted_facts,
        callId: e.call_id,
        latencyMs: e.latency_ms,
        inferMode: e.infer_mode,
      }));
    }
  } catch {
    // optional
  }

  // Canonical total from Qdrant exact count (inventory truth lane)
  let memoryCount = analyticsCount;
  try {
    const qRes = await fetch(`${qdrantBaseUrl}/collections/foxmemory/points/count`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ exact: true }),
    });
    if (qRes.ok) {
      const qJson = (await qRes.json()) as { result?: { count?: number } };
      const c = Number(qJson?.result?.count ?? NaN);
      if (Number.isFinite(c)) memoryCount = c;
    }
  } catch {
    // fall back to analytics count if qdrant endpoint unreachable
  }

  return {
    baseUrl: foxmemoryBaseUrl,
    userId: foxmemoryUserId,
    api,
    llmModel,
    embedModel,
    ingestionQueueDepth: null,
    memoryCount,
    memoriesByDay,
    memorySummary,
    recentActivity,
    searches,
    stats: foxmemoryStats,
    diagnostics,
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

app.get('/api/crons', (_req: Request, res: Response) => {
  try {
    const raw = execFileSync('openclaw', ['cron', 'list', '--json'], {
      encoding: 'utf8',
    });
    // openclaw cron writes config warnings to stdout before the JSON — extract just the JSON object
    const jsonStart = raw.indexOf('{');
    const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart) : raw;
    const parsed = JSON.parse(jsonStr) as { jobs?: unknown[]; total?: number };
    res.json({ ok: true, jobs: parsed.jobs || [], total: parsed.total ?? (parsed.jobs || []).length });
  } catch (e: unknown) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e), jobs: [] });
  }
});

app.get('/api/foxmemory/prompts', async (_req: Request, res: Response) => {
  try {
    type PromptData = { data?: { prompt: string | null; effective_prompt: string | null; source: string; persisted: boolean } };
    const [p1, p2, p3] = await Promise.all([
      fetch(`${foxmemoryBaseUrl}/v2/config/prompt`).then((r) => r.json()),
      fetch(`${foxmemoryBaseUrl}/v2/config/update-prompt`).then((r) => r.json()),
      fetch(`${foxmemoryBaseUrl}/v2/config/graph-prompt`).then((r) => r.json()),
    ]) as [PromptData, PromptData, PromptData];
    const fallback = { prompt: null, effective_prompt: null, source: 'unknown', persisted: false };
    return res.json({
      ok: true,
      extractionPrompt: p1?.data ?? fallback,
      updatePrompt: p2?.data ?? fallback,
      graphPrompt: p3?.data ?? fallback,
    });
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/foxmemory/config/prompt', async (req: Request<Record<string, never>, unknown, { prompt: string | null }>, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/config/prompt`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: req.body.prompt ?? null }),
    });
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/foxmemory/config/update-prompt', async (req: Request<Record<string, never>, unknown, { prompt: string | null }>, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/config/update-prompt`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: req.body.prompt ?? null }),
    });
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/foxmemory/config/graph-prompt', async (req: Request<Record<string, never>, unknown, { prompt: string | null }>, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/config/graph-prompt`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: req.body.prompt ?? null }),
    });
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/foxmemory/graph-stats', async (_req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/graph/stats`);
    if (!upstream.ok) return res.status(upstream.status).json({ ok: false, error: 'upstream error' });
    const json = await upstream.json();
    return res.json({ ok: true, data: json?.data ?? json });
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/foxmemory/graph-data', async (_req: Request, res: Response) => {
  try {
    const upstream = await fetch(
      `${foxmemoryBaseUrl}/v2/graph/relations?user_id=${encodeURIComponent(foxmemoryUserId)}&limit=500`
    );
    if (!upstream.ok) return res.status(upstream.status).json({ ok: false, error: 'upstream error' });
    const json = (await upstream.json()) as {
      data?: { relations?: Array<{ source: string; relationship: string; target: string }> };
    };
    const relations = json?.data?.relations ?? [];

    // Derive nodes + degree from unique source/target values
    const degreeMap = new Map<string, number>();
    for (const r of relations) {
      degreeMap.set(r.source, (degreeMap.get(r.source) ?? 0) + 1);
      degreeMap.set(r.target, (degreeMap.get(r.target) ?? 0) + 1);
    }

    const nodes = Array.from(degreeMap.entries()).map(([id, degree]) => ({ id, name: id, degree }));
    const links = relations.map((r) => ({ source: r.source, target: r.target, label: r.relationship }));

    return res.json({ ok: true, data: { nodes, links } });
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
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
