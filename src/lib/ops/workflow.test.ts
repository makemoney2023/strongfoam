import { describe, expect, it } from "vitest";
import {
  formatRelativeAge,
  formatRequestNumber,
  formatServices,
  isWorkflowStatus,
  requireLostReason,
} from "@/lib/ops/workflow";

describe("workflow rules", () => {
  it("accepts only documented workflow statuses", () => {
    expect(isWorkflowStatus("reviewing")).toBe(true);
    expect(isWorkflowStatus("quoted")).toBe(false);
  });

  it("requires a lost reason only for lost requests", () => {
    expect(requireLostReason("lost", "  ")).toBe(
      "A lost reason is required when a request is marked lost.",
    );
    expect(requireLostReason("lost", "Budget")).toBeNull();
    expect(requireLostReason("won", "")).toBeNull();
  });

  it("formats request identifiers, ages, and services", () => {
    expect(formatRequestNumber("abcdefgh-1234-4000-8000-1234567890ab")).toBe(
      "SF-ABCDEFGH",
    );
    expect(
      formatRelativeAge(new Date("2026-09-18T10:00:00.000Z"), new Date("2026-09-18T11:30:00.000Z")),
    ).toBe("1h");
    expect(formatServices(["spray-foam", "avb"])).toBe("Spray foam, AVB");
    expect(formatServices([])).toBe("Unspecified");
  });
});
