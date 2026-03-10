import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { generateSecret as totpGenerateSecret, generateURI as totpGenerateURI, verifySync as totpVerifySync } from 'otplib';
import QRCode from 'qrcode';
import {
  findUserById, findUserByEmail, findUserByGoogleId,
  createUser, linkGoogleId, setMfaSecret, verifyPassword, seedAdminUser,
} from './db.js';

// ── Session type augmentation ───────────────────────────────────────────────
declare module 'express-session' {
  interface SessionData {
    mfaVerified?: boolean;
  }
}

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string;
      picture: string;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '..');
const killQueuePath = path.join(workspaceRoot, 'docs', 'ACP_KILL_QUEUE.md');
const foxmemoryBaseUrl = process.env.FOXMEMORY_BASE_URL || 'http://localhost:8082';
const foxmemoryUserId = process.env.FOXMEMORY_USER_ID || '';
const sessionSecret = process.env.SESSION_SECRET || 'foxops-dev-secret-change-in-production';
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const allowedEmails = (process.env.ALLOWED_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);
const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5177';

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
  neo4jConnected?: boolean;
  neo4jNodeCount?: number | null;
  neo4jRelationCount?: number | null;
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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Session + Passport ──────────────────────────────────────────────────────
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ── Local (email + password) strategy ──────────────────────────────────────
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  const dbUser = findUserByEmail(email.toLowerCase().trim());
  if (!dbUser || !verifyPassword(dbUser, password)) return done(null, false, { message: 'Invalid credentials' });
  return done(null, { id: dbUser.id, email: dbUser.email, name: dbUser.email, picture: '' });
}));

// ── Google OAuth strategy ───────────────────────────────────────────────────
if (googleClientId && googleClientSecret) {
  passport.use(new GoogleStrategy(
    { clientID: googleClientId, clientSecret: googleClientSecret, callbackURL: `${appBaseUrl}/auth/google/callback` },
    (_accessToken, _refreshToken, profile, done) => {
      const email = (profile.emails?.[0]?.value || '').toLowerCase().trim();
      if (allowedEmails.length > 0 && !allowedEmails.includes(email)) return done(null, false);
      let dbUser = findUserByGoogleId(profile.id);
      if (!dbUser) {
        dbUser = findUserByEmail(email);
        if (dbUser) {
          linkGoogleId(dbUser.id, profile.id);
        } else {
          dbUser = createUser({ email, googleId: profile.id, username: profile.displayName });
        }
      }
      return done(null, { id: dbUser.id, email: dbUser.email, name: dbUser.email, picture: profile.photos?.[0]?.value || '' });
    },
  ));
}

passport.serializeUser((user, done) => done(null, (user as Express.User).id));
passport.deserializeUser((id, done) => {
  const dbUser = findUserById(id as number);
  if (!dbUser) return done(null, false);
  done(null, { id: dbUser.id, email: dbUser.email, name: dbUser.email, picture: '' });
});

// ── Seed admin user from env (only if DB is empty) ─────────────────────────
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  seedAdminUser(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
}

// ── Auth routes (public) ────────────────────────────────────────────────────
app.get('/auth/google', (req: Request, res: Response, next: NextFunction) => {
  if (!googleClientId || !googleClientSecret) {
    return res.status(503).send('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }
  return passport.authenticate('google', { scope: ['email', 'profile'] })(req, res, next);
});

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${appBaseUrl}/?auth=failed` }),
  (_req: Request, res: Response) => {
    res.redirect(`${appBaseUrl}/`);
  },
);

app.get('/auth/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ ok: false });
    req.session.destroy(() => res.redirect(`${appBaseUrl}/`));
  });
});

// ── Local login ─────────────────────────────────────────────────────────────
app.post('/api/auth/login',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', (err: unknown, user: Express.User | false, info: { message?: string } | undefined) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ ok: false, error: info?.message || 'Invalid credentials' });
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const dbUser = findUserById(user.id);
        return res.json({
          ok: true,
          user: { email: user.email, name: user.name, picture: user.picture },
          mfaEnrolled: !!dbUser?.mfa_secret,
          mfaVerified: !!req.session.mfaVerified,
        });
      });
    })(req, res, next);
  },
);

app.get('/api/auth/me', (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.status(401).json({ ok: false, error: 'Unauthenticated' });
  const user = req.user!;
  const dbUser = findUserById(user.id);
  return res.json({
    ok: true,
    user: { email: user.email, name: user.name, picture: user.picture },
    mfaEnrolled: !!dbUser?.mfa_secret,
    mfaVerified: !!req.session.mfaVerified,
  });
});

app.get('/api/auth/mfa/setup', (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.status(401).json({ ok: false, error: 'Unauthenticated' });
  const secret = totpGenerateSecret();
  const otpauth = totpGenerateURI({ label: req.user!.email, issuer: 'FoxOps', secret });
  QRCode.toDataURL(otpauth, (err, dataUrl) => {
    if (err) return res.status(500).json({ ok: false, error: 'QR generation failed' });
    return res.json({ ok: true, secret, qrDataUrl: dataUrl });
  });
});

app.post('/api/auth/mfa/enroll', (req: Request<Record<string, never>, unknown, { secret: string; token: string }>, res: Response) => {
  if (!req.isAuthenticated()) return res.status(401).json({ ok: false, error: 'Unauthenticated' });
  const { secret, token } = req.body;
  if (!totpVerifySync({ token, secret }).valid) return res.status(400).json({ ok: false, error: 'Invalid token' });
  setMfaSecret(req.user!.id, secret);
  req.session.mfaVerified = true;
  return res.json({ ok: true });
});

app.post('/api/auth/mfa/verify', (req: Request<Record<string, never>, unknown, { token: string }>, res: Response) => {
  if (!req.isAuthenticated()) return res.status(401).json({ ok: false, error: 'Unauthenticated' });
  const { token } = req.body;
  const dbUser = findUserById(req.user!.id);
  if (!dbUser?.mfa_secret) return res.status(400).json({ ok: false, error: 'MFA not enrolled' });
  if (!totpVerifySync({ token, secret: dbUser.mfa_secret }).valid) return res.status(400).json({ ok: false, error: 'Invalid token' });
  req.session.mfaVerified = true;
  return res.json({ ok: true });
});

// ── Auth guard — all /api/* routes below require authentication ─────────────
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
};

const requireMfa = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.mfaVerified) return next();
  return res.status(403).json({ ok: false, error: 'MFA verification required' });
};

app.use('/api', isAuthenticated);

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

app.get('/api/crons/:id/runs', (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = req.query.limit ? String(req.query.limit) : '20';
  try {
    const raw = execFileSync('openclaw', ['cron', 'runs', '--id', id, '--limit', limit], {
      encoding: 'utf8',
    });
    const jsonStart = raw.indexOf('{');
    const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart) : raw;
    const parsed = JSON.parse(jsonStr) as { entries?: unknown[]; total?: number; hasMore?: boolean };
    res.json({ ok: true, entries: parsed.entries || [], total: parsed.total ?? 0, hasMore: parsed.hasMore ?? false });
  } catch (e: unknown) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e), entries: [] });
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

app.post('/api/foxmemory/memories/search', async (req: Request<Record<string, never>, unknown, { query: string; top_k?: number }>, res: Response) => {
  try {
    const { query, top_k = 5 } = req.body;
    if (!query) return res.status(400).json({ ok: false, error: 'query required' });
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/memories/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, user_id: foxmemoryUserId, top_k }),
    });
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/foxmemory/graph/search', async (req: Request<Record<string, never>, unknown, { query: string }>, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ ok: false, error: 'query required' });
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/graph/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, user_id: foxmemoryUserId }),
    });
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/foxmemory/graph/node/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/graph/nodes/${encodeURIComponent(req.params.id)}`);
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ── Model config proxy ─────────────────────────────────────────────────────

app.get('/api/foxmemory/config/models', async (_req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/config/models`);
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/foxmemory/config/model', requireMfa, async (req: Request<Record<string, never>, unknown, { key: string; value: string }>, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/config/model`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/foxmemory/config/model/:key', requireMfa, async (req: Request<{ key: string }>, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/config/model/${encodeURIComponent(req.params.key)}`, {
      method: 'DELETE',
    });
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/foxmemory/config/models/catalog', async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    const url = role
      ? `${foxmemoryBaseUrl}/v2/config/models/catalog?role=${encodeURIComponent(role)}`
      : `${foxmemoryBaseUrl}/v2/config/models/catalog`;
    const upstream = await fetch(url);
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/foxmemory/config/models/catalog', async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/config/models/catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.put('/api/foxmemory/config/models/catalog/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/config/models/catalog/${encodeURIComponent(req.params.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
  } catch (error: unknown) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.delete('/api/foxmemory/config/models/catalog/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const upstream = await fetch(`${foxmemoryBaseUrl}/v2/config/models/catalog/${encodeURIComponent(req.params.id)}`, {
      method: 'DELETE',
    });
    const json = await upstream.json();
    return res.status(upstream.status).json(json);
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
