import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "@/lib/leads/rate-limit";

describe("MemoryRateLimiter", () => {
  it("allows five calls and denies the sixth in the window", async () => {
    const limiter = new MemoryRateLimiter();
    for (let i = 0; i < 5; i += 1) {
      expect((await limiter.limit("1.1.1.1")).success).toBe(true);
    }
    expect((await limiter.limit("1.1.1.1")).success).toBe(false);
    expect((await limiter.limit("2.2.2.2")).success).toBe(true);
  });
});
