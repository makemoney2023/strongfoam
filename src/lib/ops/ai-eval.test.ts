import { describe, expect, it } from "vitest";
import type { AiGatewayResult } from "@/lib/ops/ai-gateway";
import {
  evaluateGoldenSet,
  liveGoldenRunner,
  offlineGoldenRunner,
} from "@/lib/ops/ai-eval";

describe("golden-set evals", () => {
  it("passes the offline runner without calling a model", async () => {
    const report = await evaluateGoldenSet(offlineGoldenRunner);
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(3);
    expect(report.citationValidity).toBe(1);
    expect(process.env.AI_EVAL_LIVE).not.toBe("1");
  });

  it("fails a case that cites an unknown id or a forbidden field", async () => {
    const bad = (): AiGatewayResult => ({
      status: "ready",
      provider: "test",
      model: "test",
      paragraph: "Invented price.",
      bullets: [{ text: "Not in the pack.", citations: [{ kind: "task", id: "missing" }] }],
      sections: { completed: [], held: [], material: [], next: [] },
    });
    const priced = (): AiGatewayResult =>
      Object.assign(bad(), { price: 10 });
    const citationReport = await evaluateGoldenSet(bad);
    expect(citationReport.failures.some((failure) => failure.reason.includes("citation"))).toBe(true);
    const priceReport = await evaluateGoldenSet(priced);
    expect(priceReport.failures.some((failure) => failure.reason.includes("price"))).toBe(true);
  });

  it("refuses a live run unless AI_EVAL_LIVE is set", async () => {
    await expect(liveGoldenRunner(offlineGoldenRunner as never)).rejects.toThrow(/AI_EVAL_LIVE/);
  });
});
