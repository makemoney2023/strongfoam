import { describe, expect, it } from "vitest";
import { parseSurveyDraft, serializeSurveyDraft } from "@/lib/leads/draft";

describe("survey draft", () => {
  it("round-trips version 1 and rejects other versions", () => {
    const draft = {
      version: 1 as const,
      startedAt: 1000,
      draftId: "11111111-1111-4111-8111-111111111111",
      step: "fit" as const,
      answers: { projectType: "commercial_ici" },
    };
    const raw = serializeSurveyDraft(draft);
    expect(parseSurveyDraft(raw)).toEqual(draft);
    expect(parseSurveyDraft('{"version":2}')).toBeNull();
    expect(parseSurveyDraft(null)).toBeNull();
  });
});
