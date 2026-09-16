export const LEAD_RATE_LIMIT = 5;
export const LEAD_RATE_WINDOW_MS = 15 * 60 * 1000;

export type RateLimiter = {
  limit(key: string): Promise<{ success: boolean }>;
};

export class MemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();

  async limit(key: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter(
      (time) => now - time < LEAD_RATE_WINDOW_MS,
    );
    if (recent.length >= LEAD_RATE_LIMIT) {
      this.hits.set(key, recent);
      return { success: false };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { success: true };
  }
}
