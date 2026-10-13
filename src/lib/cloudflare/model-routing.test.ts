import { describe, expect, it } from "vitest";
import {
  DEFAULT_LARGE_MODEL,
  DEFAULT_SMALL_MODEL,
  gatewayMetadata,
  modelForTask,
} from "@/lib/cloudflare/model-routing";

describe("model routing", () => {
  it("uses the large model for summaries and allows a cache", () => {
    const route = modelForTask("summary", {});
    expect(route.model).toBe(DEFAULT_LARGE_MODEL);
    expect(route.tier).toBe("large");
    expect(route.cache).toBe(true);
    expect(route.fallbackModel).toBe(DEFAULT_SMALL_MODEL);
    expect(route.timeoutMs).toBe(45_000);
    expect(route.maxAttempts).toBeLessThanOrEqual(5);
  });

  it("keeps an explicit large model and routes triage to the small model", () => {
    const summary = modelForTask("summary", { AI_GATEWAY_MODEL: "test-model" });
    const triage = modelForTask("triage", { AI_GATEWAY_MODEL: "test-model" });
    expect(summary.model).toBe("test-model");
    expect(triage.model).toBe(DEFAULT_SMALL_MODEL);
    expect(triage.cache).toBe(false);
    expect(triage.timeoutMs).toBe(20_000);
  });

  it("turns fallback off when the env value is blank or off", () => {
    expect(modelForTask("summary", { AI_GATEWAY_FALLBACK_MODEL: "" }).fallbackModel).toBe("");
    expect(modelForTask("summary", { AI_GATEWAY_FALLBACK_MODEL: "off" }).fallbackModel).toBe("");
    expect(
      modelForTask("daily_report", { AI_GATEWAY_FALLBACK_MODEL: "workers-ai/backup" }).fallbackModel,
    ).toBe("workers-ai/backup");
  });

  it("keeps five string metadata entries and drops prompts", () => {
    const metadata = gatewayMetadata({
      org: "org-1",
      purpose: "summary",
      record: "job-1",
      user: "office",
      tier: "large",
      extra: "dropped",
      prompt: "secret prompt",
      "cf.user_id": "nope",
      message: "also dropped",
      empty: "",
    });
    expect(metadata).toEqual({
      org: "org-1",
      purpose: "summary",
      record: "job-1",
      user: "office",
      tier: "large",
    });
  });
});
