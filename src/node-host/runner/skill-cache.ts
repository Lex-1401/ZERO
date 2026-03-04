export class SkillBinsCache {
  private bins = new Set<string>();
  private lastRefresh = 0;
  private readonly ttlMs = 90_000;
  private readonly fetch: () => Promise<string[]>;

  constructor(fetch: () => Promise<string[]>) {
    this.fetch = fetch;
  }

  async current(force = false): Promise<Set<string>> {
    const expires = this.lastRefresh + this.ttlMs;
    if (force || Date.now() > expires || this.lastRefresh === 0) {
      await this.refresh();
    }
    return this.bins;
  }

  async refresh() {
    try {
      const bins = await this.fetch();
      const next = new Set<string>();
      if (Array.isArray(bins)) {
        for (const bin of bins) {
          if (bin && typeof bin === "string") {
            next.add(bin.trim().toLowerCase());
          }
        }
      }
      this.bins = next;
      this.lastRefresh = Date.now();
    } catch {
      // ignore
    }
  }
}
