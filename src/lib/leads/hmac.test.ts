import { describe, expect, it } from "vitest";
import { signLeadId, verifyLeadId } from "@/lib/leads/hmac";

describe("lead thanks HMAC", () => {
  it("round-trips a lead id", () => {
    const token = signLeadId("lead-1", "test-secret-test-secret-test-secret");
    expect(verifyLeadId("lead-1", token, "test-secret-test-secret-test-secret")).toBe(
      true,
    );
  });

  it("rejects a tampered token", () => {
    const token = signLeadId("lead-1", "test-secret-test-secret-test-secret");
    expect(verifyLeadId("lead-1", token + "x", "test-secret-test-secret-test-secret")).toBe(
      false,
    );
    expect(verifyLeadId("lead-2", token, "test-secret-test-secret-test-secret")).toBe(
      false,
    );
  });
});
