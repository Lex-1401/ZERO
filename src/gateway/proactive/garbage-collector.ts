/**
 * ContextGarbageCollector
 * "Esquecimento Inteligente" - Prunes old, irrelevant memories from short-term vector context.
 */
export class ContextGarbageCollector {
  /**
   * Runs a semantic cleanup pass.
   * Instead of just FIFO, it ranks memories by 'importance' signals (re-access count, emotional weight).
   */
  static async prune(memoryStore: any[], limit: number = 50) {
    if (memoryStore.length <= limit) return memoryStore;

    // 1. Calculate Importance Score for each memory
    const scored = memoryStore.map((mem) => ({
      ...mem,
      score: this.calculateScore(mem),
    }));

    // 2. Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // 3. Keep top N
    const kept = scored.slice(0, limit);

    console.log(
      `[Memory] Pruned ${memoryStore.length - kept.length} items. Kept ${kept.length} high-value contexts.`,
    );

    return kept.map(({ score: _score, ...original }) => original);
  }

  private static calculateScore(mem: any): number {
    let score = 0;
    const now = Date.now();
    const ageHours = (now - (mem.timestamp || now)) / (1000 * 60 * 60);

    // Decay: older memories lose score exponentially
    // 1 hour old = 1.0, 24 hours old = ~0.3
    const timeDecay = Math.exp(-0.05 * ageHours);

    score += (mem.relevance || 1.0) * 10; // Base relevance
    score *= timeDecay;

    // Boost recent access
    if (mem.lastAccess && now - mem.lastAccess < 1000 * 60 * 5) {
      score += 50; // Boost heavily if accessed in last 5 min
    }

    return score;
  }
}
