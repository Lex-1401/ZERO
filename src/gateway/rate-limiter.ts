import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("gateway/rate-limiter");

export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * Rate Limiter para prevenir abuso de recursos (CWE-770).
 * Implementa janela deslizante por identificador (IP, sessão, usuário).
 */
export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();

  constructor(private config: RateLimitConfig) {}

  /**
   * Verifica se o identificador está dentro do rate limit.
   * @param identifier - IP, session ID, ou user ID
   * @returns allowed: true se permitido, retryAfter: segundos até reset
   */
  check(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    // Primeira request ou janela expirada
    if (!entry || now > entry.resetAt) {
      this.limits.set(identifier, {
        count: 1,
        resetAt: now + this.config.windowMs,
      });
      return { allowed: true };
    }

    // Limite excedido
    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      log.warn(`Rate limit exceeded for ${identifier}`, {
        count: entry.count,
        limit: this.config.maxRequests,
        retryAfter,
      });
      return { allowed: false, retryAfter };
    }

    // Incrementar contador
    entry.count++;
    return { allowed: true };
  }

  /**
   * Reseta o rate limit para um identificador específico.
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Limpa entradas expiradas (garbage collection).
   */
  cleanup(): void {
    const now = Date.now();
    for (const [id, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(id);
      }
    }
  }
}
