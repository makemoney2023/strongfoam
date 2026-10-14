export const FIELD_DRAFT_KINDS = [
  "task",
  "daily_report",
  "quantity",
  "blocker",
  "material_request",
  "deficiency",
  "caption",
  "area_tag",
  "gauge_reading",
  "lot_reading",
  "coverage_flag",
  "safety_flag",
  "labor",
  "inspection_note",
] as const;

export type FieldDraftKind = (typeof FIELD_DRAFT_KINDS)[number];
export type FieldDraftStatus = "proposed" | "confirmed" | "dismissed";
export type FieldDraftSource = "voice" | "photo" | "schedule" | "arrival" | "manual";

export type FieldDraft = {
  id: string;
  organizationId: string;
  jobId: string;
  userId: string;
  kind: FieldDraftKind;
  status: FieldDraftStatus;
  body: string;
  quote: string;
  quantity: number | null;
  unit: string | null;
  workAreaId: string | null;
  taskId: string | null;
  documentId: string | null;
  voiceNoteId: string | null;
  effect: string | null;
  source: FieldDraftSource;
  requiresConfirmation: true;
  sendsToCustomer: false;
  setsPrice: false;
  approves: false;
};

export type FieldDraftInput = Omit<FieldDraft, "id" | "status" | "requiresConfirmation" | "sendsToCustomer" | "setsPrice" | "approves"> & {
  status?: FieldDraftStatus;
};

const EFFECTS: Partial<Record<FieldDraftKind, string>> = {
  blocker: "This marks the job blocked.",
  quantity: "This records a quantity. It does not verify production.",
  labor: "This records today's labor for you. It does not verify production.",
  deficiency: "This records a deficiency. It does not sign the inspection.",
  safety_flag: "This records a safety note for review. It does not sign the inspection.",
  gauge_reading: "This records a gauge reading. It does not verify production.",
  lot_reading: "This records a drum or lot label for review.",
  caption: "This saves the caption on the photo.",
  daily_report: "This saves the daily report.",
};

export function isFieldDraftKind(value: string): value is FieldDraftKind {
  return (FIELD_DRAFT_KINDS as readonly string[]).includes(value);
}

export function draftEffect(kind: FieldDraftKind): string | null {
  return EFFECTS[kind] ?? null;
}

export function quoteIsGrounded(quote: string, source: string): boolean {
  const text = quote.trim();
  return text.length > 0 && source.includes(text);
}

export function buildFieldDraft(input: FieldDraftInput): FieldDraft | null {
  const body = input.body.trim();
  const quote = input.quote.trim();
  if (!body || !input.organizationId || !input.jobId || !input.userId) return null;
  if (!isFieldDraftKind(input.kind)) return null;
  if (input.source === "voice" && !quoteIsGrounded(quote, body)) return null;
  return {
    id: "",
    organizationId: input.organizationId,
    jobId: input.jobId,
    userId: input.userId,
    kind: input.kind,
    status: input.status ?? "proposed",
    body,
    quote,
    quantity: input.quantity,
    unit: input.unit,
    workAreaId: input.workAreaId,
    taskId: input.taskId,
    documentId: input.documentId,
    voiceNoteId: input.voiceNoteId,
    effect: input.effect ?? draftEffect(input.kind),
    source: input.source,
    requiresConfirmation: true,
    sendsToCustomer: false,
    setsPrice: false,
    approves: false,
  };
}

export function decideFieldDraft(
  draft: FieldDraft,
  decision: "confirm" | "dismiss",
): FieldDraft | null {
  if (draft.status !== "proposed") return null;
  if (draft.sendsToCustomer || draft.setsPrice || draft.approves) return null;
  return {
    ...draft,
    status: decision === "confirm" ? "confirmed" : "dismissed",
  };
}

export function manualStatusLabel(kind: string): string | null {
  if (kind === "blocker" || kind === "blocked") return "Mark the job blocked";
  if (kind === "deficiency") return "Record a deficiency on this mark";
  return null;
}

export const VERIFY_PRODUCTION_LABEL =
  "Verify this production. It counts on the worker's record.";

export function captionsForNote(input: {
  workAreaId: string | null;
  drafts: Array<Pick<FieldDraft, "status" | "kind" | "body" | "documentId" | "workAreaId">>;
}): string[] {
  if (!input.workAreaId) return [];
  const tagged = new Set(
    input.drafts
      .filter(
        (draft) =>
          draft.status === "confirmed" &&
          draft.kind === "area_tag" &&
          draft.workAreaId === input.workAreaId &&
          draft.documentId,
      )
      .map((draft) => draft.documentId as string),
  );
  return input.drafts
    .filter(
      (draft) =>
        draft.status === "confirmed" &&
        draft.kind === "caption" &&
        draft.body.trim() &&
        (draft.workAreaId === input.workAreaId ||
          (draft.documentId != null && tagged.has(draft.documentId))),
    )
    .map((draft) => draft.body.trim());
}
