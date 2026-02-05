import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("gateway/auth-defense");

const FAILED_ATTEMPTS_LIMIT = 30;
const TIME_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const BAN_DURATION_MS = 30 * 60 * 1000; // 30 minutes ban if limit reached

type AttemptData = {
  count: number;
  firstAttempt: number;
  bannedUntil?: number;
};

class BruteForceProtector {
  private attempts = new Map<string, AttemptData>();

  isBlocked(ip: string): boolean {
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

  recordFailure(ip: string) {
    const now = Date.now();
    const data = this.attempts.get(ip) ?? { count: 0, firstAttempt: now };

    if (now - data.firstAttempt > TIME_WINDOW_MS) {
      data.count = 1;
      data.firstAttempt = now;
      delete data.bannedUntil;
    } else {
      data.count++;
    }

    if (data.count >= FAILED_ATTEMPTS_LIMIT) {
      data.bannedUntil = now + BAN_DURATION_MS;
      log.warn(`IP ${ip} blocked due to too many failed auth attempts.`, {
        count: data.count,
        bannedUntil: new Date(data.bannedUntil).toISOString(),
      });
    }

    this.attempts.set(ip, data);
  }

  recordSuccess(ip: string) {
    this.attempts.delete(ip);
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
