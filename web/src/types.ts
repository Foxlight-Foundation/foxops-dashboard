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

export interface MemoryDayEntry {
  date: string;
  ADD: number;
  UPDATE: number;
  DELETE: number;
  NONE: number;
  avgLatencyMs?: number;
}

export interface MemoryActivityEntry {
  ts: string;
  event: string;
  memoryId: string;
  userId?: string;
  runId?: string;
  preview?: string;
  memoryText?: string;
  reason?: string | null;
  extractedFacts?: string[] | null;
  callId?: string | null;
  latencyMs?: number;
  inferMode?: boolean;
}

export interface MemorySummary {
  total: number;
  byEvent: { ADD: number; UPDATE: number; DELETE: number; NONE: number };
  noneRatePct?: number;
  writeLatency?: { avgMs: number; minMs: number; maxMs: number };
  model?: { llm: string; embed: string };
}

export interface MemorySearchStats {
  total: number;
  avgResults?: number;
  avgTopScore?: number;
  avgLatencyMs?: number;
}

export interface FoxmemoryPromptConfig {
  prompt: string | null;
  effective_prompt: string | null;
  source: string;
  persisted: boolean;
}

export interface FoxmemoryPromptsResponse {
  ok: boolean;
  extractionPrompt: FoxmemoryPromptConfig;
  updatePrompt: FoxmemoryPromptConfig;
  graphPrompt: FoxmemoryPromptConfig;
}

export interface FoxmemoryDiagnostics {
  graphEnabled?: boolean;
  graphLlmModel?: string | null;
  neo4jUrl?: string | null;
  neo4jConnected?: boolean;
  neo4jNodeCount?: number | null;
  neo4jRelationCount?: number | null;
}

export interface FoxmemoryGraphStats {
  nodeCount: number;
  edgeCount: number;
  byLabel: Record<string, number>;
  byRelationType: Record<string, number>;
  mostConnected: Array<{ id: string; name: string; degree: number }>;
}

export interface FoxmemoryGraphNode {
  id: string;
  name: string;
  degree: number;
}

export interface FoxmemoryGraphLink {
  source: string;
  target: string;
  label: string;
}

export interface FoxmemoryGraphData {
  nodes: FoxmemoryGraphNode[];
  links: FoxmemoryGraphLink[];
}

export interface FoxmemoryRichGraphNode {
  id: string;
  labels: string[];
  name: string;
  properties: {
    user_id?: string;
    created?: { low: number; high: number };
    [key: string]: unknown;
  };
}

export interface FoxmemoryRichGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  created?: { low: number; high: number };
  properties: Record<string, unknown>;
}

export interface FoxmemoryGraphSearchResult {
  nodes: FoxmemoryRichGraphNode[];
  edges: FoxmemoryRichGraphEdge[];
  matchCount: number;
}

export interface FoxmemoryMemoryResult {
  id: string;
  memory: string;
  createdAt: string;
  updatedAt?: string;
  score: number;
  runId?: string;
  metadata: Record<string, unknown>;
}

export interface FoxmemoryMemorySearchResult {
  results: FoxmemoryMemoryResult[];
}

export interface FoxmemoryResponse {
  ok: boolean;
  baseUrl: string;
  userId: string;
  api: { ok: boolean; status: number | null; endpoint: string | null };
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
