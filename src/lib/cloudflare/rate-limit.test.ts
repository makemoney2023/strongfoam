import { describe, expect, it } from "vitest";
import { D1RateLimiter, type RateLimitDb } from "@/lib/cloudflare/rate-limit";

function memoryDb(): RateLimitDb {
  const rows = new Map<string, { count: number; window_start: number }>();
  return {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async first<T>() {
              if (!sql.startsWith("SELECT")) return null;
              const bucket = String(values[0]);
              return (rows.get(bucket) as T | undefined) ?? null;
            },
            async run() {
              if (sql.startsWith("INSERT")) {
                rows.set(String(values[0]), { count: 1, window_start: Number(values[1]) });
                return;
              }
              rows.set(String(values[1]), {
                count: Number(values[0]),
                window_start: rows.get(String(values[1]))?.window_start ?? Date.now(),
              });
            },
          };
        },
      };
    },
  };
}

describe("D1 rate limiter", () => {
  it("allows requests inside the window and blocks the next one", async () => {
    const limiter = new D1RateLimiter(memoryDb(), 2, 60);
    expect(await limiter.limit("1.1.1.1")).toEqual({ success: true });
    expect(await limiter.limit("1.1.1.1")).toEqual({ success: true });
    expect(await limiter.limit("1.1.1.1")).toEqual({ success: false });
  });

  it("fails open when D1 throws", async () => {
    const limiter = new D1RateLimiter(
      {
        prepare() {
          return {
            bind() {
              return {
                first: async () => {
                  throw new Error("d1 down");
                },
                run: async () => undefined,
              };
            },
          };
        },
      },
      1,
      60,
    );
    expect(await limiter.limit("1.1.1.1")).toEqual({ success: true });
  });
});
