import { createSubsystemLogger } from "../logging/subsystem.js";
import { logSecurityBlock } from "../security/sec-event.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const log = createSubsystemLogger("gateway/auth-defense");

const FAILED_ATTEMPTS_LIMIT = 5; // Limite rigoroso de tentativas
const TIME_WINDOW_MS = 30 * 60 * 1000; // Janela de 30 minutos
const BAN_DURATION_MS = 24 * 60 * 60 * 1000; // Bloqueio de 24 horas para ataques detectados
const AUTH_FAILURE_DELAY_MS = 1500; // Atraso base para mitigar timing attacks
const PERSIST_PATH = path.join(os.homedir(), ".zero", "security", "brute-force-state.json");
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Limpar entradas expiradas a cada 10 min

function isLoopbackAddress(ip: string | undefined): boolean {
  if (!ip) return false;
  if (ip === "127.0.0.1") return true;
  if (ip.startsWith("127.")) return true;
  if (ip === "::1") return true;
  if (ip.startsWith("::ffff:127.")) return true;
  return false;
}

type AttemptData = {
  count: number;
  firstAttempt: number;
  bannedUntil?: number;
};

class BruteForceProtector {
  private attempts = new Map<string, AttemptData>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadFromDisk();
    // SECURITY: Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  /** SECURITY: Load persisted state from disk */
  private loadFromDisk() {
    try {
      if (fs.existsSync(PERSIST_PATH)) {
        const raw = fs.readFileSync(PERSIST_PATH, "utf-8");
        const entries: Record<string, AttemptData> = JSON.parse(raw);
        const now = Date.now();
        for (const [ip, data] of Object.entries(entries)) {
          // Só carregar bans ativos (não expirados)
          if (data.bannedUntil && data.bannedUntil > now) {
            this.attempts.set(ip, data);
          }
        }
        if (this.attempts.size > 0) {
          log.info(`Loaded ${this.attempts.size} active bans from disk.`);
        }
      }
    } catch {
      // Arquivo corrompido ou inexistente — começar limpo
    }
  }

  /** SECURITY: Persist active bans to disk (async, debounced) */
  private schedulePersist() {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      try {
        const dir = path.dirname(PERSIST_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        const data: Record<string, AttemptData> = {};
        const now = Date.now();
        for (const [ip, entry] of this.attempts) {
          if (entry.bannedUntil && entry.bannedUntil > now) {
            data[ip] = entry;
          }
        }
        fs.writeFileSync(PERSIST_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
      } catch (err) {
        log.error("Failed to persist brute-force state", { error: String(err) });
      }
    }, 2000); // Debounce 2s
  }

  /** Limpar entradas expiradas */
  private cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.attempts) {
      if (data.bannedUntil && now >= data.bannedUntil) {
        this.attempts.delete(ip);
      } else if (!data.bannedUntil && now - data.firstAttempt > TIME_WINDOW_MS) {
        this.attempts.delete(ip);
      }
    }
  }

  isBlocked(ip: string): boolean {
    if (isLoopbackAddress(ip)) return false; // [PT] Nunca bloquear o desenvolvedor local
    const data = this.attempts.get(ip);
    if (!data) return false;

    const now = Date.now();

    if (data.bannedUntil && now < data.bannedUntil) {
      return true;
    }

    if (now - data.firstAttempt > TIME_WINDOW_MS) {
      if (!data.bannedUntil) {
        this.attempts.delete(ip);
      }
      return false;
    }

    return data.count >= FAILED_ATTEMPTS_LIMIT;
  }

  async recordFailure(ip: string) {
    if (isLoopbackAddress(ip)) return; // [PT] Ignorar falhas locais na defesa
    const now = Date.now();
    const data = this.attempts.get(ip) ?? { count: 0, firstAttempt: now };

    // Adicionar jitter para confundir ferramentas de ataque de tempo
    const jitter = Math.floor(Math.random() * 500);
    await new Promise((resolve) => setTimeout(resolve, AUTH_FAILURE_DELAY_MS + jitter));

    if (now - data.firstAttempt > TIME_WINDOW_MS) {
      data.count = 1;
      data.firstAttempt = now;
      delete data.bannedUntil;
    } else {
      data.count++;
    }

    if (data.count >= FAILED_ATTEMPTS_LIMIT) {
      data.bannedUntil = now + BAN_DURATION_MS;
      log.error(
        `[CRITICAL] IP ${ip} permanently blocked due to high-frequency auth failures. Malicious activity suspected.`,
        {
          count: data.count,
          bannedUntil: new Date(data.bannedUntil).toISOString(),
        },
      );
      logSecurityBlock({
        type: "brute_force",
        severity: "CRITICAL",
        source: "gateway/auth-defense",
        clientIp: ip,
        details: `IP banned for ${BAN_DURATION_MS / 3600000}h after ${data.count} failed auth attempts`,
      });
      this.schedulePersist(); // Persistir bans para sobreviver restart
    }

    this.attempts.set(ip, data);
  }

  recordSuccess(ip: string) {
    const data = this.attempts.get(ip);
    if (!data) return;

    // Decaimento gradual em vez de reset completo
    // Previne que atacante alterne entre tentativas válidas/inválidas
    if (data.bannedUntil) {
      // Se banido, não desbloquear com um único sucesso
      log.info(
        `Auth success for banned IP ${ip}. Ban remains until ${new Date(data.bannedUntil).toISOString()}.`,
      );
      return;
    }

    data.count = Math.max(0, data.count - 2);
    if (data.count === 0) {
      this.attempts.delete(ip);
      log.info(`Auth success for IP ${ip}. Defense history cleared.`);
    } else {
      log.info(`Auth success for IP ${ip}. Counter decayed to ${data.count}.`);
    }
  }

  getReason(ip: string): string | undefined {
    const data = this.attempts.get(ip);
    if (data?.bannedUntil && Date.now() < data.bannedUntil) {
      return `Too many failed attempts. Try again after ${new Date(data.bannedUntil).toLocaleTimeString()}.`;
    }
    return undefined;
  }
}

export const authProtector = new BruteForceProtector();
