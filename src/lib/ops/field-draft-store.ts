import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { backgroundJobs } from "@/db/schema";
import {
  buildFieldDraft,
  isFieldDraftKind,
  type FieldDraft,
  type FieldDraftInput,
  type FieldDraftSource,
  type FieldDraftStatus,
} from "@/lib/ops/field-drafts";
import { fieldLanguage, languageIdempotencyKey, type FieldLanguage } from "@/lib/ops/field-language";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";

type Memory = { drafts: FieldDraft[]; languages: Record<string, FieldLanguage> };

const memory = globalThis as { __strongfoamFieldDrafts?: Memory };

function bucket(): Memory {
  memory.__strongfoamFieldDrafts ??= { drafts: [], languages: {} };
  return memory.__strongfoamFieldDrafts;
}

export function resetFieldDraftMemory(): void {
  memory.__strongfoamFieldDrafts = { drafts: [], languages: {} };
}

export function removeFieldDraftsForJob(jobId: string): void {
  const rows = bucket().drafts;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index]?.jobId === jobId) rows.splice(index, 1);
  }
}

function draftKey(draft: FieldDraft): string {
  const anchor = draft.voiceNoteId ?? draft.documentId ?? draft.userId;
  return `field.draft:${draft.jobId}:${draft.source}:${anchor}:${draft.kind}:${draft.quote.slice(0, 120)}`;
}

export function asFieldDraft(id: string, payload: unknown): FieldDraft | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Partial<FieldDraft>;
  if (!row.kind || !isFieldDraftKind(row.kind)) return null;
  if (typeof row.body !== "string" || typeof row.organizationId !== "string") return null;
  const built = buildFieldDraft({
    organizationId: row.organizationId,
    jobId: String(row.jobId ?? ""),
    userId: String(row.userId ?? ""),
    kind: row.kind,
    body: row.body,
    quote: String(row.quote ?? row.body),
    quantity: typeof row.quantity === "number" ? row.quantity : null,
    unit: row.unit ?? null,
    workAreaId: row.workAreaId ?? null,
    taskId: row.taskId ?? null,
    documentId: row.documentId ?? null,
    voiceNoteId: row.voiceNoteId ?? null,
    effect: row.effect ?? null,
    source: (row.source ?? "manual") as FieldDraftSource,
    status: row.status,
  });
  if (!built) return null;
  return { ...built, id, status: row.status === "confirmed" || row.status === "dismissed" ? row.status : "proposed" };
}

export async function saveFieldDraft(input: FieldDraftInput): Promise<FieldDraft | null> {
  const draft = buildFieldDraft(input);
  if (!draft) return null;
  const key = draftKey(draft);
  if (isDemoOpsStore()) {
    const existing = bucket().drafts.find((item) => draftKey(item) === key);
    if (existing) return existing;
    const stored = { ...draft, id: crypto.randomUUID() };
    bucket().drafts.push(stored);
    return stored;
  }
  try {
    const inserted = await getDb()
      .insert(backgroundJobs)
      .values({
        organizationId: draft.organizationId,
        kind: "field.draft",
        aggregateType: "field_draft",
        aggregateId: draft.jobId,
        idempotencyKey: key,
        status: "completed",
        attempts: 1,
        maxAttempts: 1,
        checkpoint: { proposalStatus: "proposed" },
        payload: { ...draft, status: "proposed" },
        updatedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [backgroundJobs.organizationId, backgroundJobs.idempotencyKey],
      })
      .returning({ id: backgroundJobs.id });
    const id = inserted[0]?.id;
    if (id) return { ...draft, id, status: "proposed" };
    const rows = await listFieldDrafts(draft.organizationId, draft.jobId);
    return rows.find((item) => draftKey(item) === key) ?? null;
  } catch (error) {
    console.error("Field draft was not stored.", error);
    return null;
  }
}

export async function listFieldDrafts(organizationId: string, jobId?: string): Promise<FieldDraft[]> {
  if (isDemoOpsStore()) {
    return bucket().drafts.filter(
      (draft) => draft.organizationId === organizationId && (jobId === undefined || draft.jobId === jobId),
    );
  }
  try {
    const rows = await getDb()
      .select({ id: backgroundJobs.id, payload: backgroundJobs.payload })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.organizationId, organizationId),
          eq(backgroundJobs.kind, "field.draft"),
          eq(backgroundJobs.status, "completed"),
        ),
      )
      .orderBy(desc(backgroundJobs.updatedAt))
      .limit(100);
    return rows
      .map((row) => asFieldDraft(row.id, row.payload))
      .filter((draft): draft is FieldDraft => draft !== null)
      .filter((draft) => jobId === undefined || draft.jobId === jobId);
  } catch (error) {
    console.error("Field drafts could not be listed.", error);
    return [];
  }
}

export async function updateFieldDraft(draft: FieldDraft): Promise<void> {
  if (isDemoOpsStore()) {
    const list = bucket().drafts;
    const index = list.findIndex((item) => item.id === draft.id);
    if (index >= 0) list[index] = draft;
    return;
  }
  try {
    await getDb()
      .update(backgroundJobs)
      .set({
        payload: { ...draft },
        checkpoint: { proposalStatus: draft.status },
        updatedAt: new Date(),
      })
      .where(and(eq(backgroundJobs.id, draft.id), eq(backgroundJobs.organizationId, draft.organizationId)));
  } catch (error) {
    console.error("Field draft was not updated.", error);
  }
}

export async function readFieldLanguage(userId: string): Promise<FieldLanguage> {
  if (isDemoOpsStore()) return bucket().languages[userId] ?? "en";
  try {
    const rows = await getDb()
      .select({ payload: backgroundJobs.payload })
      .from(backgroundJobs)
      .where(eq(backgroundJobs.idempotencyKey, languageIdempotencyKey(userId)))
      .limit(1);
    const payload = rows[0]?.payload as { language?: string } | undefined;
    return fieldLanguage(payload?.language);
  } catch (error) {
    console.error("Field language could not be read.", error);
    return "en";
  }
}

export async function saveFieldLanguage(input: {
  organizationId: string;
  userId: string;
  language: string;
}): Promise<FieldLanguage> {
  const language = fieldLanguage(input.language);
  if (isDemoOpsStore()) {
    bucket().languages[input.userId] = language;
    return language;
  }
  const key = languageIdempotencyKey(input.userId);
  try {
    await getDb()
      .insert(backgroundJobs)
      .values({
        organizationId: input.organizationId,
        kind: "staff.language",
        aggregateType: "user",
        aggregateId: input.userId,
        idempotencyKey: key,
        status: "completed",
        attempts: 1,
        maxAttempts: 1,
        payload: { userId: input.userId, language },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [backgroundJobs.organizationId, backgroundJobs.idempotencyKey],
        set: {
          payload: { userId: input.userId, language },
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("Field language was not stored.", error);
  }
  return language;
}

export function draftStatus(value: string | undefined): FieldDraftStatus | null {
  if (value === "proposed" || value === "confirmed" || value === "dismissed") return value;
  return null;
}
