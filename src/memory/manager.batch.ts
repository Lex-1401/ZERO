import { createSubsystemLogger } from "../logging/subsystem.js";
import { BATCH_FAILURE_LIMIT } from "./manager.types.js";

const log = createSubsystemLogger("memory");

export class BatchManager {
  private failureCount = 0;
  private lastError?: string;
  private lastProvider?: string;
  private lock: Promise<void> = Promise.resolve();

  constructor(private enabled: boolean) {}

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  getFailures(): number {
    return this.failureCount;
  }

  getLastError(): string | undefined {
    return this.lastError;
  }

  getLastProvider(): string | undefined {
    return this.lastProvider;
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const wait = this.lock;
    this.lock = new Promise<void>((resolve) => {
      release = resolve;
    });
    await wait;
    try {
      return await fn();
    } finally {
      release!();
    }
  }

  async resetFailureCount(): Promise<void> {
    await this.withLock(async () => {
      if (this.failureCount > 0) {
        log.debug("memory embeddings: batch recovered; resetting failure count");
      }
      this.failureCount = 0;
      this.lastError = undefined;
      this.lastProvider = undefined;
    });
  }

  async recordFailure(params: {
    provider: string;
    message: string;
    attempts?: number;
    forceDisable?: boolean;
  }): Promise<{ disabled: boolean; count: number }> {
    return await this.withLock(async () => {
      if (!this.enabled) {
        return { disabled: true, count: this.failureCount };
      }
      const increment = params.forceDisable
        ? BATCH_FAILURE_LIMIT
        : Math.max(1, params.attempts ?? 1);
      this.failureCount += increment;
      this.lastError = params.message;
      this.lastProvider = params.provider;
      const disabled = params.forceDisable || this.failureCount >= BATCH_FAILURE_LIMIT;
      if (disabled) {
        this.enabled = false;
      }
      return { disabled, count: this.failureCount };
    });
  }

  isTimeoutError(message: string): boolean {
    return /timed out|timeout/i.test(message);
  }

  async runWithTimeoutRetry<T>(params: { provider: string; run: () => Promise<T> }): Promise<T> {
    try {
      return await params.run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (this.isTimeoutError(message)) {
        log.warn(`memory embeddings: ${params.provider} batch timed out; retrying once`);
        try {
          return await params.run();
        } catch (retryErr) {
          (retryErr as { batchAttempts?: number }).batchAttempts = 2;
          throw retryErr;
        }
      }
      throw err;
    }
  }

  async runWithFallback<T>(params: {
    provider: string;
    run: () => Promise<T>;
    fallback: () => Promise<number[][]>;
  }): Promise<T | number[][]> {
    if (!this.enabled) {
      return await params.fallback();
    }
    try {
      const result = await this.runWithTimeoutRetry({
        provider: params.provider,
        run: params.run,
      });
      await this.resetFailureCount();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const attempts = (err as { batchAttempts?: number }).batchAttempts ?? 1;
      const forceDisable = /asyncBatchEmbedContent not available/i.test(message);
      const failure = await this.recordFailure({
        provider: params.provider,
        message,
        attempts,
        forceDisable,
      });
      const suffix = failure.disabled ? "disabling batch" : "keeping batch enabled";
      log.warn(
        `memory embeddings: ${params.provider} batch failed (${failure.count}/${BATCH_FAILURE_LIMIT}); ${suffix}; falling back to non-batch embeddings: ${message}`,
      );
      return await params.fallback();
    }
  }
}
