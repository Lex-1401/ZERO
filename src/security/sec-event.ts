/**
 * Security Event Logger (L8 Observability)
 *
 * Emite eventos de segurança estruturados em formato JSON Lines,
 * compatível com SIEM e ferramentas de monitoramento.
 *
 * Inspirado pelo Security Guardian v3 — Camada L8.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const LOG_DIR = path.join(os.homedir(), ".zero", "security");
const LOG_FILE = path.join(LOG_DIR, "sec-events.jsonl");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB — rotacionar após isso

export type SecurityEventType =
  | "prompt_injection"
  | "brute_force"
  | "rate_limit"
  | "exfiltration_attempt"
  | "config_tampering"
  | "ws_origin_rejected"
  | "auth_failure"
  | "auth_success"
  | "secret_exposure"
  | "suspicious_input";

export type SecurityEventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SecurityEvent {
  event_type: SecurityEventType;
  severity: SecurityEventSeverity;
  timestamp: string;
  version: string;
  source: string;
  client_ip?: string;
  details: string;
  action_taken: "log" | "warn" | "block" | "notify";
  metadata?: Record<string, unknown>;
}

/** Emitir um evento de segurança estruturado */
export function emitSecurityEvent(event: Omit<SecurityEvent, "timestamp" | "version">): void {
  const entry: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
    version: "3.3.0",
  };

  const line = JSON.stringify(entry) + "\n";

  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
    }

    // Rotação atômica: rename → create novo arquivo (SEC-002)
    try {
      const stat = fs.statSync(LOG_FILE);
      if (stat.size > MAX_LOG_SIZE) {
        const oldFile = LOG_FILE.replace(".jsonl", ".old.jsonl");
        // Escrever no arquivo antigo antes de rotacionar para não perder esta entrada
        fs.appendFileSync(LOG_FILE, line, { mode: 0o600 });
        fs.renameSync(LOG_FILE, oldFile);
        // Arquivo novo será criado no próximo appendFileSync
        return;
      }
    } catch {
      // Arquivo ainda não existe — OK
    }

    fs.appendFileSync(LOG_FILE, line, { mode: 0o600 });
  } catch {
    // Falha silenciosa — não travar o gateway por causa de logging
  }
}

/** Helper para eventos de alta frequência (rate limit, auth) */
export function logSecurityBlock(params: {
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  source: string;
  clientIp?: string;
  details: string;
}): void {
  emitSecurityEvent({
    event_type: params.type,
    severity: params.severity,
    source: params.source,
    client_ip: params.clientIp,
    details: params.details,
    action_taken: "block",
  });
}
