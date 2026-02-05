import { RatchetDedupe as NativeDedupe } from "../../rust-core/index.js";

export type DedupeCache = {
  check: (key: string | undefined | null, now?: number) => boolean;
  clear: () => void;
  size: () => number;
};

type DedupeCacheOptions = {
  ttlMs: number;
  maxSize: number;
};

export function createDedupeCache(options: DedupeCacheOptions): DedupeCache {
  const ttlMs = Math.max(0, options.ttlMs);
  const maxSize = Math.max(0, Math.floor(options.maxSize));

  try {
    if (process.env.NODE_ENV === "test") {
      return createJsDedupeCache(options);
    }
    const native = new NativeDedupe(ttlMs, maxSize);
    return {
      check: (key, now) => {
        if (!key) return false;
        return native.check(key, now);
      },
      clear: () => native.clear(),
      size: () => native.size(),
    };
  } catch (err) {
    console.warn("[infra] Failed to load native dedupe, falling back to JS implementation:", err);
    return createJsDedupeCache(options);
  }
}

function createJsDedupeCache(options: DedupeCacheOptions): DedupeCache {
  const ttlMs = Math.max(0, options.ttlMs);
  const maxSize = Math.max(0, Math.floor(options.maxSize));
  const cache = new Map<string, number>();

  const touch = (key: string, now: number) => {
    cache.delete(key);
    cache.set(key, now);
  };

  const prune = (now: number) => {
    const cutoff = ttlMs > 0 ? now - ttlMs : undefined;
    if (cutoff !== undefined) {
      for (const [entryKey, entryTs] of cache) {
        if (entryTs < cutoff) {
          cache.delete(entryKey);
        }
      }
    }
    if (maxSize <= 0) {
      cache.clear();
      return;
    }
    while (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
  };

  return {
    check: (key, now = Date.now()) => {
      if (!key) return false;
      const existing = cache.get(key);
      if (existing !== undefined && (ttlMs <= 0 || now - existing < ttlMs)) {
        touch(key, now);
        return true;
      }
      touch(key, now);
      prune(now);
      return false;
    },
    clear: () => {
      cache.clear();
    },
    size: () => cache.size,
  };
}
