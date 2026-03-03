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
 * RateLimiter Engine
 *
 * Implements a High-Performance Sliding Window rate limiting algorithm to maintain system stability
 * and mitigate excessive request volume. This module provides granular control over request density
 * per identifier (e.g., IPv4, IPv6, Session UUID, or User Principal).
 *
 * @category Gateway
 * @module RateLimiter
 */
export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Default Garbage Collection interval: 60 seconds.
   * Optimizes memory footprint by purging stale identifiers from the hash map.
   */
  private static readonly CLEANUP_INTERVAL_MS = 60_000;

  /**
   * Initializes a new instance of the RateLimiter.
   *
   * @param config - Configuration parameters defining window duration and request quotas.
   */
  constructor(private config: RateLimitConfig) {
    this.cleanupTimer = setInterval(() => this.cleanup(), RateLimiter.CLEANUP_INTERVAL_MS);
    // Ensure the event loop is not held open by the cleanup timer in CLI environments.
    if (
      this.cleanupTimer &&
      typeof this.cleanupTimer === "object" &&
      "unref" in this.cleanupTimer
    ) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Evaluates the request density for a specific identifier against the configured policy.
   *
   * @param identifier - A unique string representing the requester (IP, Session, or User).
   * @returns An object containing the evaluation results:
   *          - `allowed`: Boolean indicating if the request should proceed.
   *          - `retryAfter`: (Optional) The cooldown period in seconds remaining until the window resets.
   *
   * @example
   * const status = limiter.check("192.168.1.1");
   * if (!status.allowed) throw new Error(`Backoff required: ${status.retryAfter}s`);
   */
  check(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    // Initialization of a new sliding window or reset of an expired one
    if (!entry || now > entry.resetAt) {
      this.limits.set(identifier, {
        count: 1,
        resetAt: now + this.config.windowMs,
      });
      return { allowed: true };
    }

    // Velocity threshold breach detection
    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      log.warn(`Rate limit exceeded for [${identifier}]`, {
        count: entry.count,
        limit: this.config.maxRequests,
        retryAfter,
      });
      return { allowed: false, retryAfter };
    }

    // Atomic increment of the request counter within the current window
    entry.count++;
    return { allowed: true };
  }

  /**
   * Explicitly purges the rate-limit state for a given identifier.
   * Useful for administrative resets or privilege escalation scenarios.
   *
   * @param identifier - The unique requester identifier to reset.
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Performs routine Garbage Collection (GC) of the internal state map.
   * Iterates through the residency set and prunes nodes that have exceeded their TTL.
   *
   * @internal
   */
  cleanup(): void {
    const now = Date.now();
    for (const [id, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(id);
      }
    }
  }

  /**
   * Dismantles the RateLimiter instance, clearing timers and internal state.
   * Must be invoked during graceful shutdown sequences to prevent resource leaks.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.limits.clear();
  }
}
