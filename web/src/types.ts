export interface OpenclawSession {
  key: string;
  sessionId: string;
  agentId: string;
  kind?: string;
  model?: string;
  modelProvider?: string;
  updatedAt?: number;
  ageMs?: number;
  systemSent?: boolean;
  abortedLastRun?: boolean;
  verboseLevel?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  totalTokensFresh?: boolean;
  contextTokens?: number;
  [key: string]: unknown;
}

export interface SessionsResponse {
  ok: boolean;
  sessions: OpenclawSession[];
  total: number;
  error?: string;
}

export interface FoxmemoryStats {
  writesByMode?: { infer?: number; raw?: number };
  memoryEvents?: { ADD?: number; UPDATE?: number; DELETE?: number; NONE?: number };
  ingestionQueueDepth?: number;
  ingestion_queue_depth?: number;
  queueDepth?: number;
  queue_depth?: number;
}

export interface FoxmemoryResponse {
  ok: boolean;
  baseUrl: string;
  userId: string;
  api: { ok: boolean; status: number | null; endpoint: string | null };
  ingestionQueueDepth: number | null;
  memoryCount: number;
  memoriesByDay: { day: string; count: number }[];
  memoriesByDay7d: { day: string; count: number }[];
  retrievalQuality: { value: string; source: string };
  recentErrors: { count: number; samples: string[] };
  autoCapture: {
    lastAutoCaptureAt: string | null;
    captureSuccessCountWindow: number;
    captureWindowMinutes: number;
    lastCaptureError: { at: string; line: string } | null;
  };
  pluginTelemetry: {
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
    recent: { at: string; type: string; mode?: string }[];
  };
  pluginLogs: { file: string; count: number; lines: string[] };
  stats: FoxmemoryStats | null;
}

export interface CronJobSchedule {
  kind: string;
  everyMs?: number;
  anchorMs?: number;
  cron?: string;
  timezone?: string;
}

export interface CronJobState {
  nextRunAtMs?: number | null;
  lastRunAtMs?: number | null;
  lastRunStatus?: string | null;
  lastStatus?: string | null;
  lastDurationMs?: number | null;
  lastDelivered?: boolean | null;
  lastDeliveryStatus?: string | null;
  consecutiveErrors?: number;
}

export interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  createdAtMs?: number;
  updatedAtMs?: number;
  schedule?: CronJobSchedule;
  sessionTarget?: string;
  wakeMode?: string;
  payload?: { kind: string; message?: string; timeoutSeconds?: number; [key: string]: unknown };
  delivery?: { mode?: string; channel?: string; [key: string]: unknown };
  state?: CronJobState;
  [key: string]: unknown;
}

export interface CronJobsResponse {
  ok: boolean;
  jobs: CronJob[];
  total: number;
  error?: string;
}

export type ThemeMode = 'light' | 'dark';
export type Section = 'acp' | 'foxmemory' | 'cron';
export type ChartRange = '7d' | '30d' | 'all';

export interface Notice {
  severity: 'success' | 'warning' | 'error' | 'info';
  text: string;
}

export interface KillArgs {
  sessionKey: string;
  sessionId: string;
  reason?: string;
}

export interface KillResponse {
  ok: boolean;
  queued: boolean;
  immediateKillSucceeded: boolean;
  note: string;
}

export interface DeleteSessionArgs {
  sessionKey: string;
  sessionId: string;
}

export interface DeleteSessionResponse {
  ok: boolean;
  deleted?: boolean;
  transcriptPath?: string;
  error?: string;
}
