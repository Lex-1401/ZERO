export type PresenceEntry = {
  instanceId?: string | null;
  host?: string | null;
  ip?: string | null;
  version?: string | null;
  platform?: string | null;
  deviceFamily?: string | null;
  modelIdentifier?: string | null;
  mode?: string | null;
  lastInputSeconds?: number | null;
  reason?: string | null;
  text?: string | null;
  ts?: number | null;
  roles?: string[] | null;
  scopes?: string[] | null;
};

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type LogEntry = {
  raw: string;
  time?: string | null;
  level?: LogLevel | null;
  subsystem?: string | null;
  message?: string | null;
  meta?: Record<string, unknown> | null;
};

export type ModelMetric = { model: string; count: number };

export type TelemetrySummary = {
  totalTokens: number;
  modelBreakdown: ModelMetric[];
  avgLatencyMs: number;
};

export type UpdateGitStatus = {
  root: string;
  sha: string | null;
  tag: string | null;
  branch: string | null;
  upstream: string | null;
  dirty: boolean | null;
  ahead: number | null;
  behind: number | null;
  fetchOk: boolean | null;
  error?: string;
};

export type UpdateDepsStatus = {
  manager: string;
  status: "ok" | "missing" | "stale" | "unknown";
  lockfilePath: string | null;
  markerPath: string | null;
  reason?: string;
};

export type UpdateRegistryStatus = { latestVersion: string | null; error?: string };

export type UpdateCheckResult = {
  root: string | null;
  installKind: "git" | "package" | "unknown";
  packageManager: string;
  git?: UpdateGitStatus;
  deps?: UpdateDepsStatus;
  registry?: UpdateRegistryStatus;
};

export type GatewayModel = { id: string; provider: string; name: string; contextWindow?: number };

export type HealthSnapshot = {
  ok: boolean;
  status: string;
  checks: Record<string, { ok: boolean; message?: string }>;
};

export type StatusSummary = {
  presenceCount: number;
  tokensTotal: number;
};
