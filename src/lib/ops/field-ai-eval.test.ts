import { describe, expect, it } from "vitest";
import { evaluateFieldAiGolden } from "@/lib/ops/field-ai-eval";

describe("field AI golden set", () => {
  it("keeps grounded voice cards and rejects a certified caption", () => {
    const report = evaluateFieldAiGolden();
    expect(report.failures).toEqual([]);
    expect(report.failed).toBe(0);
  });
});
