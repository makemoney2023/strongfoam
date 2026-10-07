import type { RateLimiter } from "@/lib/leads/rate-limit";

export type RateLimitDb = {
  prepare: (sql: string) => {
    bind: (...values: unknown[]) => {
      first: <T>() => Promise<T | null>;
      run: () => Promise<unknown>;
    };
  };
};

type BucketRow = { count: number; window_start: number };

export class D1RateLimiter implements RateLimiter {
  constructor(
    private readonly db: RateLimitDb,
    private readonly max: number,
    private readonly windowSeconds: number,
  ) {}

  async limit(key: string): Promise<{ success: boolean }> {
    const bucket = `lead-rl:${key}`;
    const now = Date.now();
    const windowMs = this.windowSeconds * 1000;
    try {
      const row = await this.db
        .prepare("SELECT count, window_start FROM rate_limits WHERE bucket = ?")
        .bind(bucket)
        .first<BucketRow>();
      if (!row || now - row.window_start >= windowMs) {
        await this.db
          .prepare(
            `INSERT INTO rate_limits (bucket, count, window_start) VALUES (?, 1, ?)
             ON CONFLICT(bucket) DO UPDATE SET count = 1, window_start = excluded.window_start`,
          )
          .bind(bucket, now)
          .run();
        return { success: true };
      }
      const count = row.count + 1;
      await this.db
        .prepare("UPDATE rate_limits SET count = ? WHERE bucket = ?")
        .bind(count, bucket)
        .run();
      return { success: count <= this.max };
    } catch (error) {
      console.error(error);
      return { success: true };
    }
  }
}
