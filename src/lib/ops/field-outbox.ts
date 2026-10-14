import { FIELD_DRAFT_KINDS, type FieldDraftKind, type FieldDraftSource } from "@/lib/ops/field-drafts";

export type FieldOutboxDraft = {
  jobId: string;
  kind: FieldDraftKind;
  body: string;
  quote: string;
  source: FieldDraftSource;
  workAreaId: string | null;
  taskId: string | null;
  documentId: string | null;
  voiceNoteId: string | null;
  quantity: number | null;
  unit: string | null;
  effect: string | null;
};

export type FieldOutboxItem = {
  id: string;
  kind: "draft";
  draft: FieldOutboxDraft;
};

export function enqueueOutbox(items: FieldOutboxItem[], item: FieldOutboxItem): FieldOutboxItem[] {
  if (item.kind !== "draft") return items;
  if (!item.id.trim() || !item.draft.jobId.trim() || !item.draft.body.trim()) return items;
  if (!(FIELD_DRAFT_KINDS as readonly string[]).includes(item.draft.kind)) return items;
  if (items.some((existing) => existing.id === item.id)) return items;
  return [...items, item];
}

export function listOutbox(items: FieldOutboxItem[]): FieldOutboxItem[] {
  return items.filter((item) => item.kind === "draft");
}

export function dropAcked(items: FieldOutboxItem[], ids: string[]): FieldOutboxItem[] {
  const gone = new Set(ids);
  return items.filter((item) => !gone.has(item.id));
}
