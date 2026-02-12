import { describe, expect, it } from "vitest";

import { createDedupeCache } from "./dedupe.js";

describe("createDedupeCache", () => {
  it("marks duplicates within TTL", () => {
    const cache = createDedupeCache({ ttlMs: 1000, maxSize: 10 });
    expect(cache.check("a", 100)).toBe(true);
    expect(cache.check("a", 500)).toBe(false);
  });

  it("expires entries after TTL", () => {
    const cache = createDedupeCache({ ttlMs: 1000, maxSize: 10 });
    expect(cache.check("a", 100)).toBe(true);
    expect(cache.check("a", 1501)).toBe(true);
  });

  it("evicts oldest entries when over max size", () => {
    const cache = createDedupeCache({ ttlMs: 10_000, maxSize: 2 });
    expect(cache.check("a", 100)).toBe(true);
    expect(cache.check("b", 200)).toBe(true);
    expect(cache.check("c", 300)).toBe(true);
    expect(cache.check("a", 400)).toBe(true); // 'a' was evicted
  });

  it("prunes expired entries even when refreshed keys are older in insertion order", () => {
    const cache = createDedupeCache({ ttlMs: 100, maxSize: 10 });
    expect(cache.check("a", 0)).toBe(true);
    expect(cache.check("b", 50)).toBe(true);
    expect(cache.check("a", 120)).toBe(true); // 'a' expired
    expect(cache.check("c", 200)).toBe(true);
    expect(cache.size()).toBe(2); // 'b' expired, 'a' and 'c' remain
  });
});
