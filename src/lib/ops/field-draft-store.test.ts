import { beforeEach, describe, expect, it } from "vitest";
import { resetFieldDraftMemory, saveFieldDraft, listFieldDrafts, updateFieldDraft, saveFieldLanguage, readFieldLanguage } from "@/lib/ops/field-draft-store";
import { decideFieldDraft } from "@/lib/ops/field-drafts";

describe("field draft store", () => {
  beforeEach(() => resetFieldDraftMemory());

  it("stores a proposed draft once and updates it on confirm", async () => {
    const input = {
      organizationId: "org",
      jobId: "job",
      userId: "user",
      kind: "material_request" as const,
      body: "Need 10 bags of closed cell.",
      quote: "Need 10 bags",
      quantity: 10,
      unit: "bags",
      workAreaId: null,
      taskId: null,
      documentId: null,
      voiceNoteId: "voice-1",
      effect: null,
      source: "voice" as const,
    };
    const first = await saveFieldDraft(input);
    const second = await saveFieldDraft(input);
    expect(first?.id).toBeTruthy();
    expect(second?.id).toBe(first?.id);
    const confirmed = decideFieldDraft(first!, "confirm");
    await updateFieldDraft(confirmed!);
    const listed = await listFieldDrafts("org", "job");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.status).toBe("confirmed");
  });

  it("stores a language preference", async () => {
    expect(await saveFieldLanguage({ organizationId: "org", userId: "user", language: "fr-CA" })).toBe("fr");
    expect(await readFieldLanguage("user")).toBe("fr");
  });
});
