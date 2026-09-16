import { DRAFT_VERSION } from "@/content/survey";
import type { SurveyStep } from "@/lib/leads/graph";

export type SurveyDraft = {
  version: 1;
  startedAt: number;
  draftId: string;
  step: SurveyStep;
  answers: Record<string, unknown>;
};

const STEPS: SurveyStep[] = [
  "fit",
  "location",
  "notes",
  "scope",
  "project",
  "files",
  "contact",
];

export function parseSurveyDraft(raw: string | null): SurveyDraft | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const draft = parsed as Partial<SurveyDraft>;
    if (draft.version !== DRAFT_VERSION) return null;
    if (typeof draft.startedAt !== "number" || !Number.isFinite(draft.startedAt)) {
      return null;
    }
    if (typeof draft.draftId !== "string" || draft.draftId.length === 0) {
      return null;
    }
    if (typeof draft.step !== "string" || !STEPS.includes(draft.step as SurveyStep)) {
      return null;
    }
    if (!draft.answers || typeof draft.answers !== "object" || Array.isArray(draft.answers)) {
      return null;
    }
    return {
      version: 1,
      startedAt: draft.startedAt,
      draftId: draft.draftId,
      step: draft.step as SurveyStep,
      answers: draft.answers as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

export function serializeSurveyDraft(draft: SurveyDraft): string {
  return JSON.stringify(draft);
}
