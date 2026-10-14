import { buildFieldDraft, isFieldDraftKind, type FieldDraftInput } from "@/lib/ops/field-drafts";

export function draftsFromSync(input: {
  organizationId: string;
  userId: string;
  body: unknown;
}): { accepted: Array<FieldDraftInput & { clientId: string }>; rejected: string[] } {
  const accepted: Array<FieldDraftInput & { clientId: string }> = [];
  const rejected: string[] = [];
  const items = (input.body as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return { accepted, rejected };
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; kind?: unknown; draft?: unknown; jobStatus?: unknown; verify?: unknown; sendsToCustomer?: unknown };
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) continue;
    if (row.kind !== "draft" || row.jobStatus != null || row.verify === true || row.sendsToCustomer === true) {
      rejected.push(id);
      continue;
    }
    const draft = row.draft;
    if (!draft || typeof draft !== "object") {
      rejected.push(id);
      continue;
    }
    const fields = draft as Partial<FieldDraftInput>;
    if (!fields.kind || !isFieldDraftKind(fields.kind)) {
      rejected.push(id);
      continue;
    }
    const built = buildFieldDraft({
      organizationId: input.organizationId,
      jobId: String(fields.jobId ?? ""),
      userId: input.userId,
      kind: fields.kind,
      body: String(fields.body ?? ""),
      quote: String(fields.quote ?? ""),
      quantity: typeof fields.quantity === "number" ? fields.quantity : null,
      unit: fields.unit ?? null,
      workAreaId: fields.workAreaId ?? null,
      taskId: fields.taskId ?? null,
      documentId: fields.documentId ?? null,
      voiceNoteId: fields.voiceNoteId ?? null,
      effect: fields.effect ?? null,
      source: fields.source ?? "manual",
    });
    if (!built) {
      rejected.push(id);
      continue;
    }
    accepted.push({ ...built, clientId: id });
  }
  return { accepted, rejected };
}
