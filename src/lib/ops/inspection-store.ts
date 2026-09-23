import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { inspections, jobs } from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { dispatchableJobStatus } from "@/lib/ops/dispatch";
import { inspectionMemory, resetInspectionMemory } from "@/lib/ops/inspection-access";
import {
  resolveInspectionAccess,
  type InspectionActor,
} from "@/lib/ops/inspection-authorization";
import {
  buildInspectionAttention,
  parseInspectionName,
  parseInspectionNote,
  parseInspectionResult,
  type Inspection,
  type InspectionAttention,
  type InspectionResult,
} from "@/lib/ops/inspection";
import { isUuid } from "@/lib/ops/job-workspace";
import { getJob, listJobs } from "@/lib/ops/store";

export function resetInspectionsForTests(): void {
  resetInspectionMemory();
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

function asResult(value: string): InspectionResult {
  if (value === "open" || value === "passed" || value === "failed") return value;
  throw new Error("Unknown inspection result.");
}

function fromRow(row: typeof inspections.$inferSelect): Inspection {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    name: row.name,
    nameKey: row.nameKey,
    result: asResult(row.result),
    note: row.note,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sortInspections(rows: Inspection[]): Inspection[] {
  const rank = { open: 0, failed: 1, passed: 2 } as const;
  return [...rows].sort(
    (left, right) =>
      rank[left.result] - rank[right.result] || left.name.localeCompare(right.name),
  );
}

async function audit(
  actor: InspectionActor,
  organizationId: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent({
    organizationId,
    actor: actor.email,
    action: "inspection.record",
    entityType: "inspection",
    entityId,
    result: "success",
    correlationId: crypto.randomUUID(),
    payload,
  });
}

export async function listJobInspections(
  organizationId: string,
  jobId: string,
): Promise<Inspection[]> {
  if (isDemoOpsStore()) {
    return sortInspections(
      inspectionMemory().rows.filter(
        (row) => row.organizationId === organizationId && row.jobId === jobId,
      ),
    );
  }
  const rows = await getDb()
    .select()
    .from(inspections)
    .where(and(eq(inspections.organizationId, organizationId), eq(inspections.jobId, jobId)));
  return sortInspections(rows.map(fromRow));
}

export async function listInspectionAttention(
  organizationId: string,
): Promise<InspectionAttention[]> {
  if (isDemoOpsStore()) {
    const jobRows = (await listJobs()).filter((job) => job.organizationId === organizationId);
    return buildInspectionAttention({
      organizationId,
      jobs: jobRows,
      inspections: inspectionMemory().rows,
    });
  }
  const rows = await getDb()
    .select({
      inspection: inspections,
      jobName: jobs.name,
      jobStatus: jobs.status,
      jobOrganizationId: jobs.organizationId,
    })
    .from(inspections)
    .innerJoin(jobs, eq(inspections.jobId, jobs.id))
    .where(
      and(
        eq(inspections.organizationId, organizationId),
        eq(jobs.organizationId, organizationId),
        inArray(inspections.result, ["open", "failed"]),
        ne(jobs.status, "closed"),
      ),
    );
  return buildInspectionAttention({
    organizationId,
    jobs: rows.map((row) => ({
      id: row.inspection.jobId,
      name: row.jobName,
      status: row.jobStatus,
      organizationId: row.jobOrganizationId,
    })),
    inspections: rows.map((row) => fromRow(row.inspection)),
  });
}

export async function recordInspection(input: {
  actor: InspectionActor;
  jobId: string;
  name?: string;
  result?: string;
  note?: string;
}): Promise<{ ok: true; inspection: Inspection } | { ok: false; error: string }> {
  const access = resolveInspectionAccess(input.actor, "inspection.edit");
  if (!access.ok) return access;
  if (!isUuid(input.jobId)) return { ok: false, error: "That job was not found." };
  const job = await getJob(input.jobId);
  if (!job || job.organizationId !== access.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!dispatchableJobStatus(job.status)) {
    return { ok: false, error: "Closed jobs cannot take an inspection." };
  }
  const parsedName = parseInspectionName(input.name);
  if (!parsedName.ok) return parsedName;
  const parsedResult = parseInspectionResult(input.result);
  if (!parsedResult.ok) return parsedResult;
  const note = parseInspectionNote(input.note);
  if (!note.ok) return note;

  const now = new Date();
  const existing = isDemoOpsStore()
    ? inspectionMemory().rows.find(
        (row) =>
          row.organizationId === access.organizationId &&
          row.jobId === job.id &&
          row.nameKey === parsedName.nameKey,
      )
    : null;

  if (isDemoOpsStore() && existing) {
    existing.name = parsedName.name;
    existing.result = parsedResult.value;
    existing.note = note.value;
    existing.updatedAt = now;
    await audit(input.actor, access.organizationId, existing.id, {
      jobId: job.id,
      name: existing.name,
      result: existing.result,
    });
    return { ok: true, inspection: existing };
  }

  if (isDemoOpsStore()) {
    const inspection: Inspection = {
      id: crypto.randomUUID(),
      organizationId: access.organizationId,
      jobId: job.id,
      name: parsedName.name,
      nameKey: parsedName.nameKey,
      result: parsedResult.value,
      note: note.value,
      createdBy: input.actor.email,
      createdAt: now,
      updatedAt: now,
    };
    inspectionMemory().rows.push(inspection);
    await audit(input.actor, access.organizationId, inspection.id, {
      jobId: job.id,
      name: inspection.name,
      result: inspection.result,
    });
    return { ok: true, inspection };
  }

  const db = getDb();
  try {
    const inserted = await db
      .insert(inspections)
      .values({
        organizationId: access.organizationId,
        jobId: job.id,
        name: parsedName.name,
        nameKey: parsedName.nameKey,
        result: parsedResult.value,
        note: note.value,
        createdBy: input.actor.email,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const inspection = fromRow(inserted[0]!);
    await audit(input.actor, access.organizationId, inspection.id, {
      jobId: job.id,
      name: inspection.name,
      result: inspection.result,
    });
    return { ok: true, inspection };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const updated = await db
      .update(inspections)
      .set({
        name: parsedName.name,
        result: parsedResult.value,
        note: note.value,
        updatedAt: now,
      })
      .where(
        and(
          eq(inspections.organizationId, access.organizationId),
          eq(inspections.jobId, job.id),
          eq(inspections.nameKey, parsedName.nameKey),
        ),
      )
      .returning();
    const inspection = updated[0] ? fromRow(updated[0]) : null;
    if (!inspection) return { ok: false, error: "That inspection was not found." };
    await audit(input.actor, access.organizationId, inspection.id, {
      jobId: job.id,
      name: inspection.name,
      result: inspection.result,
    });
    return { ok: true, inspection };
  }
}
