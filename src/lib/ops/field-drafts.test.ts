import { describe, expect, it } from "vitest";
import {
  VERIFY_PRODUCTION_LABEL,
  buildFieldDraft,
  decideFieldDraft,
  manualStatusLabel,
  quoteIsGrounded,
} from "@/lib/ops/field-drafts";

const base = {
  organizationId: "org",
  jobId: "job",
  userId: "user",
  kind: "blocker" as const,
  body: "Lift is down until noon.",
  quote: "Lift is down",
  quantity: null,
  unit: null,
  workAreaId: null,
  taskId: null,
  documentId: null,
  voiceNoteId: "voice",
  effect: null,
  source: "voice" as const,
};

describe("field drafts", () => {
  it("keeps a voice blocker only when the quote is in the body", () => {
    const draft = buildFieldDraft(base);
    expect(draft?.effect).toBe("This marks the job blocked.");
    expect(draft?.sendsToCustomer).toBe(false);
    expect(draft?.approves).toBe(false);
    expect(buildFieldDraft({ ...base, quote: "not in the note" })).toBeNull();
  });

  it("confirms and dismisses a proposed draft", () => {
    const draft = buildFieldDraft(base);
    expect(draft).not.toBeNull();
    expect(decideFieldDraft({ ...draft!, id: "1" }, "confirm")?.status).toBe("confirmed");
    expect(decideFieldDraft({ ...draft!, id: "1" }, "dismiss")?.status).toBe("dismissed");
    expect(decideFieldDraft({ ...draft!, id: "1", status: "confirmed" }, "dismiss")).toBeNull();
  });

  it("grounds a quote and spells manual effects", () => {
    expect(quoteIsGrounded("40 bags", "We sprayed 40 bags on the north wall")).toBe(true);
    expect(quoteIsGrounded("50 bags", "We sprayed 40 bags")).toBe(false);
    expect(manualStatusLabel("blocker")).toBe("Mark the job blocked");
    expect(manualStatusLabel("deficiency")).toContain("deficiency");
    expect(VERIFY_PRODUCTION_LABEL).toContain("counts on the worker's record");
  });
});
