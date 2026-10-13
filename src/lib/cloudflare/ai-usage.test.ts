import { describe, expect, it } from "vitest";
import { recordAiUsage, usageDataPoint, type AiUsageDataPoint } from "@/lib/cloudflare/ai-usage";

describe("AI usage ledger", () => {
  it("writes purpose, model, and counts without prompt text", () => {
    const point = usageDataPoint({
      organizationId: "org-1",
      purpose: "summary",
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      status: "ok",
      cache: "key",
      latencyMs: 120,
      attempts: 1,
      inputChars: 40,
      outputChars: 12,
    });
    expect(point.indexes).toEqual(["org-1"]);
    expect(point.blobs).toEqual([
      "summary",
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "ok",
      "key",
      "org-1",
    ]);
    expect(point.doubles).toEqual([120, 1, 40, 12]);
    expect(JSON.stringify(point)).not.toContain("secret prompt");
  });

  it("does nothing when the dataset is missing", () => {
    expect(() =>
      recordAiUsage(undefined, {
        organizationId: "org-1",
        purpose: "summary",
        model: "test",
        status: "error",
        cache: "none",
        latencyMs: 1,
        attempts: 1,
        inputChars: 1,
        outputChars: 0,
      }),
    ).not.toThrow();
  });

  it("swallows a dataset write failure", () => {
    const dataset = {
      writeDataPoint() {
        throw new Error("analytics down");
      },
    };
    expect(() =>
      recordAiUsage(dataset, {
        organizationId: "org-1",
        purpose: "summary",
        model: "test",
        status: "ok",
        cache: "skip",
        latencyMs: 1,
        attempts: 1,
        inputChars: 1,
        outputChars: 1,
      }),
    ).not.toThrow();
  });

  it("forwards the data point", () => {
    const points: AiUsageDataPoint[] = [];
    recordAiUsage(
      { writeDataPoint: (point) => points.push(point) },
      {
        organizationId: "org-1",
        purpose: "eval",
        model: "test",
        status: "ok",
        cache: "none",
        latencyMs: 5,
        attempts: 2,
        inputChars: 3,
        outputChars: 4,
      },
    );
    expect(points).toHaveLength(1);
    expect(points[0]?.blobs[0]).toBe("eval");
  });
});
