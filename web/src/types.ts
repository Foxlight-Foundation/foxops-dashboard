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
  memoryId: string | null;
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

/** Response shape from GET/PUT/DELETE /v2/config/capture */
export interface CaptureConfigResponse {
  ok: boolean;
  data: {
    capture_message_limit: number;
    default: number;
    source: 'default' | 'env' | 'persisted';
    persisted: boolean;
  };
}

/**
 * Response shape from GET/PUT/DELETE /v2/config/roles
 *
 * Controls how message roles are labeled in extraction context.
 * Setting real names lets the LLM attribute memories correctly
 * (e.g. "Thomas prefers…" instead of "User prefers…").
 */
export interface RolesConfigResponse {
  ok: boolean;
  data: {
    user: string;
    assistant: string;
    source: 'default' | 'env' | 'persisted';
    persisted: boolean;
  };
}

export interface FoxmemoryDiagnostics {
  authMode?: string;
  /** Legacy compat — use apiKeyConfigured.llm instead */
  openaiApiKeyConfigured?: boolean;
  /** Legacy compat — use baseUrl.llm instead */
  openaiBaseUrl?: string | null;
  apiKeyConfigured?: { llm: boolean; embed: boolean; graphLlm: boolean };
  baseUrl?: { llm: string | null; embed: string | null; graphLlm: string | null };
  graphEnabled?: boolean;
  graphLlmModel?: string | null;
  extractionStrategy?: 'tool_calling' | 'json_prompting' | null;
  neo4jUrl?: string | null;
  neo4jConnected?: boolean;
  neo4jNodeCount?: number | null;
  neo4jRelationCount?: number | null;
  neo4jError?: string;
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
  lastError?: string | null;
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

export interface CronRunEntry {
  ts: number;
  jobId: string;
  action: string;
  status: string;
  error?: string | null;
  summary?: string | null;
  runAtMs: number;
  durationMs?: number | null;
  nextRunAtMs?: number | null;
  model?: string | null;
  provider?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } | null;
  delivered?: boolean | null;
  deliveryStatus?: string | null;
  sessionId?: string | null;
  sessionKey?: string | null;
}

export interface CronRunsResponse {
  ok: boolean;
  entries: CronRunEntry[];
  total: number;
  hasMore: boolean;
  error?: string;
}

export type ThemeMode = 'light' | 'dark';
export type Section = 'acp' | 'foxmemory' | 'cron' | 'config';

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
}

export type AuthState = 'loading' | 'unauthenticated' | 'mfa-setup' | 'mfa-verify' | 'authenticated';
export type ChartRange = '7d' | '30d' | 'all';

export type ModelRoleKey = 'llm_model' | 'graph_llm_model';

export interface CatalogModel {
  id: string;
  name: string;
  description?: string | null;
  roles: ('llm' | 'graph_llm')[];
  input_mtok?: number | null;
  cached_mtok?: number | null;
  output_mtok?: number | null;
  created_at?: number;
}

export interface EffectiveModelEntry {
  value: string;
  source: 'env' | 'persisted';
  model: CatalogModel | null;
}

export interface FoxmemoryModelsResponse {
  ok: boolean;
  data: {
    llmModel: EffectiveModelEntry;
    graphLlmModel: EffectiveModelEntry;
  };
}

export interface FoxmemoryCatalogResponse {
  ok: boolean;
  data: {
    models: CatalogModel[];
    count: number;
  };
}

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


export type SectionHealth = 'ok' | 'error';
export type HealthMap = Partial<Record<Section, SectionHealth>>;
