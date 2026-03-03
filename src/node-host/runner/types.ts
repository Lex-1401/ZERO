import type { ExecApprovalsFile } from "../../infra/exec-approvals.js";

export interface NodeHostRunOptions {
  gatewayHost: string;
  gatewayPort: number;
  gatewayTls?: boolean;
  gatewayTlsFingerprint?: string;
  nodeId?: string;
  displayName?: string;
}

export interface SystemRunParams {
  command: string[];
  rawCommand?: string | null;
  cwd?: string | null;
  env?: Record<string, string>;
  timeoutMs?: number | null;
  needsScreenRecording?: boolean | null;
  agentId?: string | null;
  sessionKey?: string | null;
  approved?: boolean | null;
  approvalDecision?: string | null;
  runId?: string | null;
}

export interface SystemWhichParams {
  bins: string[];
}

export interface BrowserProxyParams {
  method?: string;
  path?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  timeoutMs?: number;
  profile?: string;
}

export interface BrowserProxyFile {
  path: string;
  base64: string;
  mimeType?: string;
}

export interface BrowserProxyResult {
  result: unknown;
  files?: BrowserProxyFile[];
}

export interface SystemExecApprovalsSetParams {
  file: ExecApprovalsFile;
  baseHash?: string | null;
}

export interface RunResult {
  exitCode?: number;
  timedOut: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string | null;
  truncated: boolean;
}

export interface ExecEventPayload {
  sessionKey: string;
  runId: string;
  host: string;
  command?: string;
  exitCode?: number;
  timedOut?: boolean;
  success?: boolean;
  output?: string;
  reason?: string;
}

export interface NodeInvokeRequestPayload {
  id: string;
  nodeId: string;
  command: string;
  paramsJSON?: string | null;
  timeoutMs?: number | null;
  idempotencyKey?: string | null;
}
