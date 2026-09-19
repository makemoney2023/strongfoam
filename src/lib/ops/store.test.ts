import { describe, expect, it } from "vitest";
import { signLeadId } from "@/lib/leads/hmac";
import { parseEstimateRequestUpdate, staffFileHref } from "@/lib/ops/store";

describe("parseEstimateRequestUpdate", () => {
  it("accepts a complete reviewing update", () => {
    const parsed = parseEstimateRequestUpdate({
      workflowStatus: "reviewing",
      assignedTo: "Alex Rivera",
      nextAction: "Call the GC",
      nextActionDueAt: "2026-09-19T14:00",
      note: "Asked for latest drawings",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.workflowStatus).toBe("reviewing");
    expect(parsed.value.assignedTo).toBe("Alex Rivera");
    expect(parsed.value.nextAction).toBe("Call the GC");
    expect(parsed.value.lostReason).toBeNull();
  });

  it("rejects invalid status and missing lost reasons", () => {
    expect(parseEstimateRequestUpdate({ workflowStatus: "quoted" }).ok).toBe(
      false,
    );
    expect(
      parseEstimateRequestUpdate({
        workflowStatus: "lost",
        lostReason: "",
      }),
    ).toEqual({
      ok: false,
      error: "A lost reason is required when a request is marked lost.",
      field: "lostReason",
    });
  });
});

describe("staffFileHref", () => {
  it("returns a signed staff download path", () => {
    const secret = "file-secret";
    const leadId = "11111111-1111-4111-8111-111111111111";
    const href = staffFileHref(leadId, 0, secret);
    expect(href).toBe(
      `/api/files/${leadId}/0?token=${signLeadId(`${leadId}:0`, secret)}`,
    );
  });
});
