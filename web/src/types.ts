export interface RegistryRow {
  run_id: string;
  child_session_key: string;
  purpose: string;
  status: string;
  created_at_ct: string;
  done_at_ct: string;
  outcome_summary: string;
}

export interface RegistrySummary {
  total: number;
  spawned: number;
  running: number;
  completed: number;
  failed: number;
  silent: number;
  killed: number;
}

export interface RegistryResponse {
  registryPath: string;
  summary: RegistrySummary;
  rows: RegistryRow[];
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

export type ThemeMode = 'light' | 'dark';
export type Section = 'acp' | 'foxmemory';
export type ChartRange = '7d' | '30d' | 'all';

export interface Notice {
  severity: 'success' | 'warning' | 'error' | 'info';
  text: string;
}

export interface KillArgs {
  runId: string;
  childSessionKey?: string;
  reason?: string;
}

export interface KillResponse {
  ok: boolean;
  queued: boolean;
  attemptedImmediateKill: boolean;
  immediateKillSucceeded: boolean;
  note: string;
}
