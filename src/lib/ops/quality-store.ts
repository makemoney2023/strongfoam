import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { jobs, qualityRecords } from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { dispatchableJobStatus } from "@/lib/ops/dispatch";
import { isUuid } from "@/lib/ops/job-workspace";
import { qualityMemory, resetQualityMemory } from "@/lib/ops/quality-access";
import {
  resolveQualityAccess,
  type QualityActor,
} from "@/lib/ops/quality-authorization";
import {
  buildQualityAttention,
  parseQualityKind,
  parseQualityName,
  parseQualityNote,
  parseQualityStatus,
  type QualityAttention,
  type QualityKind,
  type QualityRecord,
  type QualityStatus,
} from "@/lib/ops/quality";
import { getJob, listJobs } from "@/lib/ops/store";

export function resetQualityForTests(): void {
  resetQualityMemory();
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = candidate.code ?? candidate.cause?.code;
  const message = `${candidate.message ?? ""} ${candidate.cause?.message ?? ""}`;
  return code === "23505" || code === "SQLITE_CONSTRAINT" || message.includes("UNIQUE");
}

function asKind(value: string): QualityKind {
  if (value === "deficiency" || value === "rework") return value;
  throw new Error("Unknown quality kind.");
}

function asStatus(value: string): QualityStatus {
  if (value === "open" || value === "corrected" || value === "reopened") return value;
  throw new Error("Unknown quality status.");
}

function fromRow(row: typeof qualityRecords.$inferSelect): QualityRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    kind: asKind(row.kind),
    name: row.name,
    nameKey: row.nameKey,
    status: asStatus(row.status),
    note: row.note,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sortRecords(rows: QualityRecord[]): QualityRecord[] {
  const statusRank = { reopened: 0, open: 1, corrected: 2 } as const;
  const kindRank = { deficiency: 0, rework: 1 } as const;
  return [...rows].sort(
    (left, right) =>
      statusRank[left.status] - statusRank[right.status] ||
      kindRank[left.kind] - kindRank[right.kind] ||
      left.name.localeCompare(right.name),
  );
}

async function audit(
  actor: QualityActor,
  organizationId: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent({
    organizationId,
    actor: actor.email,
    action: "quality.record",
    entityType: "quality_record",
    entityId,
    result: "success",
    correlationId: crypto.randomUUID(),
    payload,
  });
}

export async function listJobQualityRecords(
  organizationId: string,
  jobId: string,
): Promise<QualityRecord[]> {
  if (isDemoOpsStore()) {
    return sortRecords(
      qualityMemory().rows.filter(
        (row) => row.organizationId === organizationId && row.jobId === jobId,
      ),
    );
  }
  const rows = await getDb()
    .select()
    .from(qualityRecords)
    .where(and(eq(qualityRecords.organizationId, organizationId), eq(qualityRecords.jobId, jobId)));
  return sortRecords(rows.map(fromRow));
}

export async function listQualityRecords(organizationId: string): Promise<QualityRecord[]> {
  if (isDemoOpsStore()) {
    return qualityMemory().rows.filter((row) => row.organizationId === organizationId);
  }
  const rows = await getDb()
    .select()
    .from(qualityRecords)
    .where(eq(qualityRecords.organizationId, organizationId));
  return rows.map(fromRow);
}

export async function listQualityAttention(
  organizationId: string,
): Promise<QualityAttention[]> {
  if (isDemoOpsStore()) {
    const jobRows = (await listJobs()).filter((job) => job.organizationId === organizationId);
    return buildQualityAttention({
      organizationId,
      jobs: jobRows,
      records: qualityMemory().rows,
    });
  }
  const rows = await getDb()
    .select({
      record: qualityRecords,
      jobName: jobs.name,
      jobStatus: jobs.status,
      jobOrganizationId: jobs.organizationId,
    })
    .from(qualityRecords)
    .innerJoin(jobs, eq(qualityRecords.jobId, jobs.id))
    .where(
      and(
        eq(qualityRecords.organizationId, organizationId),
        eq(jobs.organizationId, organizationId),
        inArray(qualityRecords.status, ["open", "reopened"]),
        ne(jobs.status, "closed"),
      ),
    );
  return buildQualityAttention({
    organizationId,
    jobs: rows.map((row) => ({
      id: row.record.jobId,
      name: row.jobName,
      status: row.jobStatus,
      organizationId: row.jobOrganizationId,
    })),
    records: rows.map((row) => fromRow(row.record)),
  });
}

export async function recordQuality(input: {
  actor: QualityActor;
  jobId: string;
  kind?: string;
  name?: string;
  status?: string;
  note?: string;
}): Promise<{ ok: true; record: QualityRecord } | { ok: false; error: string }> {
  const access = resolveQualityAccess(input.actor, "quality.edit");
  if (!access.ok) return access;
  if (!isUuid(input.jobId)) return { ok: false, error: "That job was not found." };
  const job = await getJob(input.jobId);
  if (!job || job.organizationId !== access.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!dispatchableJobStatus(job.status)) {
    return { ok: false, error: "Closed jobs cannot take a quality record." };
  }
  const parsedKind = parseQualityKind(input.kind);
  if (!parsedKind.ok) return parsedKind;
  const parsedName = parseQualityName(input.name);
  if (!parsedName.ok) return parsedName;
  const parsedStatus = parseQualityStatus(input.status);
  if (!parsedStatus.ok) return parsedStatus;
  const note = parseQualityNote(input.note);
  if (!note.ok) return note;

  const now = new Date();
  const existing = isDemoOpsStore()
    ? qualityMemory().rows.find(
        (row) =>
          row.organizationId === access.organizationId &&
          row.jobId === job.id &&
          row.kind === parsedKind.value &&
          row.nameKey === parsedName.nameKey,
      )
    : null;

  if (isDemoOpsStore() && existing) {
    existing.name = parsedName.name;
    existing.status = parsedStatus.value;
    existing.note = note.value;
    existing.updatedAt = now;
    await audit(input.actor, access.organizationId, existing.id, {
      jobId: job.id,
      kind: existing.kind,
      name: existing.name,
      status: existing.status,
    });
    return { ok: true, record: existing };
  }

  if (isDemoOpsStore()) {
    const record: QualityRecord = {
      id: crypto.randomUUID(),
      organizationId: access.organizationId,
      jobId: job.id,
      kind: parsedKind.value,
      name: parsedName.name,
      nameKey: parsedName.nameKey,
      status: parsedStatus.value,
      note: note.value,
      createdBy: input.actor.email,
      createdAt: now,
      updatedAt: now,
    };
    qualityMemory().rows.push(record);
    await audit(input.actor, access.organizationId, record.id, {
      jobId: job.id,
      kind: record.kind,
      name: record.name,
      status: record.status,
    });
    return { ok: true, record };
  }

  const db = getDb();
  try {
    const inserted = await db
      .insert(qualityRecords)
      .values({
        organizationId: access.organizationId,
        jobId: job.id,
        kind: parsedKind.value,
        name: parsedName.name,
        nameKey: parsedName.nameKey,
        status: parsedStatus.value,
        note: note.value,
        createdBy: input.actor.email,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const record = fromRow(inserted[0]!);
    await audit(input.actor, access.organizationId, record.id, {
      jobId: job.id,
      kind: record.kind,
      name: record.name,
      status: record.status,
    });
    return { ok: true, record };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const updated = await db
      .update(qualityRecords)
      .set({
        name: parsedName.name,
        status: parsedStatus.value,
        note: note.value,
        updatedAt: now,
      })
      .where(
        and(
          eq(qualityRecords.organizationId, access.organizationId),
          eq(qualityRecords.jobId, job.id),
          eq(qualityRecords.kind, parsedKind.value),
          eq(qualityRecords.nameKey, parsedName.nameKey),
        ),
      )
      .returning();
    const record = updated[0] ? fromRow(updated[0]) : null;
    if (!record) return { ok: false, error: "That quality record was not found." };
    await audit(input.actor, access.organizationId, record.id, {
      jobId: job.id,
      kind: record.kind,
      name: record.name,
      status: record.status,
    });
    return { ok: true, record };
  }
}
