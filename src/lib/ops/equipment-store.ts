import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { equipmentAssignments, jobs } from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { dispatchableJobStatus } from "@/lib/ops/dispatch";
import { equipmentMemory, resetEquipmentMemory } from "@/lib/ops/equipment-access";
import {
  resolveEquipmentAccess,
  type EquipmentActor,
} from "@/lib/ops/equipment-authorization";
import {
  buildEquipmentAttention,
  parseEquipmentName,
  parseEquipmentNote,
  type EquipmentAssignment,
  type EquipmentConflict,
  type EquipmentStatus,
} from "@/lib/ops/equipment";
import { isUuid } from "@/lib/ops/job-workspace";
import { getJob, listJobs } from "@/lib/ops/store";

export function resetEquipmentForTests(): void {
  resetEquipmentMemory();
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

function asStatus(value: string): EquipmentStatus {
  if (value === "assigned" || value === "released") return value;
  throw new Error("Unknown equipment status.");
}

function fromRow(row: typeof equipmentAssignments.$inferSelect): EquipmentAssignment {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    name: row.name,
    nameKey: row.nameKey,
    note: row.note,
    status: asStatus(row.status),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sortAssignments(rows: EquipmentAssignment[]): EquipmentAssignment[] {
  return [...rows].sort((left, right) => {
    if (left.status !== right.status) return left.status === "assigned" ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

async function audit(
  actor: EquipmentActor,
  organizationId: string,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent({
    organizationId,
    actor: actor.email,
    action,
    entityType: "equipment_assignment",
    entityId,
    result: "success",
    correlationId: crypto.randomUUID(),
    payload,
  });
}

async function findSlot(
  organizationId: string,
  jobId: string,
  nameKey: string,
): Promise<EquipmentAssignment | null> {
  if (isDemoOpsStore()) {
    return (
      equipmentMemory().assignments.find(
        (row) =>
          row.organizationId === organizationId &&
          row.jobId === jobId &&
          row.nameKey === nameKey,
      ) ?? null
    );
  }
  const rows = await getDb()
    .select()
    .from(equipmentAssignments)
    .where(
      and(
        eq(equipmentAssignments.organizationId, organizationId),
        eq(equipmentAssignments.jobId, jobId),
        eq(equipmentAssignments.nameKey, nameKey),
      ),
    )
    .limit(1);
  return rows[0] ? fromRow(rows[0]) : null;
}

async function findAssignment(
  organizationId: string,
  assignmentId: string,
): Promise<EquipmentAssignment | null> {
  if (isDemoOpsStore()) {
    return (
      equipmentMemory().assignments.find(
        (row) => row.id === assignmentId && row.organizationId === organizationId,
      ) ?? null
    );
  }
  const rows = await getDb()
    .select()
    .from(equipmentAssignments)
    .where(
      and(
        eq(equipmentAssignments.id, assignmentId),
        eq(equipmentAssignments.organizationId, organizationId),
      ),
    )
    .limit(1);
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function listJobEquipment(
  organizationId: string,
  jobId: string,
): Promise<EquipmentAssignment[]> {
  if (isDemoOpsStore()) {
    return sortAssignments(
      equipmentMemory().assignments.filter(
        (row) => row.organizationId === organizationId && row.jobId === jobId,
      ),
    );
  }
  const rows = await getDb()
    .select()
    .from(equipmentAssignments)
    .where(
      and(
        eq(equipmentAssignments.organizationId, organizationId),
        eq(equipmentAssignments.jobId, jobId),
      ),
    );
  return sortAssignments(rows.map(fromRow));
}

export async function listEquipmentAttention(
  organizationId: string,
): Promise<EquipmentConflict[]> {
  if (isDemoOpsStore()) {
    const jobRows = (await listJobs()).filter((job) => job.organizationId === organizationId);
    return buildEquipmentAttention({
      organizationId,
      jobs: jobRows,
      assignments: equipmentMemory().assignments,
    });
  }
  const rows = await getDb()
    .select({
      assignment: equipmentAssignments,
      jobName: jobs.name,
      jobStatus: jobs.status,
      jobOrganizationId: jobs.organizationId,
    })
    .from(equipmentAssignments)
    .innerJoin(jobs, eq(equipmentAssignments.jobId, jobs.id))
    .where(
      and(
        eq(equipmentAssignments.organizationId, organizationId),
        eq(jobs.organizationId, organizationId),
        eq(equipmentAssignments.status, "assigned"),
        ne(jobs.status, "closed"),
      ),
    );
  const jobMap = new Map<string, { id: string; name: string; status: string; organizationId: string }>();
  for (const row of rows) {
    jobMap.set(row.assignment.jobId, {
      id: row.assignment.jobId,
      name: row.jobName,
      status: row.jobStatus,
      organizationId: row.jobOrganizationId,
    });
  }
  return buildEquipmentAttention({
    organizationId,
    jobs: [...jobMap.values()],
    assignments: rows.map((row) => fromRow(row.assignment)),
  });
}

const ALREADY = "That equipment is already on this job.";

export async function assignEquipment(input: {
  actor: EquipmentActor;
  jobId: string;
  name?: string;
  note?: string;
}): Promise<{ ok: true; assignment: EquipmentAssignment } | { ok: false; error: string }> {
  const access = resolveEquipmentAccess(input.actor, "equipment.edit");
  if (!access.ok) return access;
  if (!isUuid(input.jobId)) return { ok: false, error: "That job was not found." };
  const job = await getJob(input.jobId);
  if (!job || job.organizationId !== access.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!dispatchableJobStatus(job.status)) {
    return { ok: false, error: "Closed jobs cannot take equipment." };
  }
  const parsedName = parseEquipmentName(input.name);
  if (!parsedName.ok) return parsedName;
  const note = parseEquipmentNote(input.note);
  if (!note.ok) return note;

  const now = new Date();
  const existing = await findSlot(access.organizationId, job.id, parsedName.nameKey);
  if (existing?.status === "assigned") return { ok: false, error: ALREADY };

  const next: EquipmentAssignment = existing
    ? {
        ...existing,
        name: parsedName.name,
        nameKey: parsedName.nameKey,
        note: note.value,
        status: "assigned",
        updatedAt: now,
      }
    : {
        id: crypto.randomUUID(),
        organizationId: access.organizationId,
        jobId: job.id,
        name: parsedName.name,
        nameKey: parsedName.nameKey,
        note: note.value,
        status: "assigned",
        createdBy: input.actor.email,
        createdAt: now,
        updatedAt: now,
      };

  if (isDemoOpsStore()) {
    const state = equipmentMemory();
    const index = state.assignments.findIndex((row) => row.id === next.id);
    if (index >= 0) {
      if (state.assignments[index]?.status === "assigned") {
        return { ok: false, error: ALREADY };
      }
      state.assignments[index] = next;
    } else {
      state.assignments.push(next);
    }
  } else if (existing) {
    const updated = await getDb()
      .update(equipmentAssignments)
      .set({
        name: next.name,
        nameKey: next.nameKey,
        note: next.note,
        status: "assigned",
        updatedAt: now,
      })
      .where(
        and(
          eq(equipmentAssignments.id, existing.id),
          eq(equipmentAssignments.organizationId, access.organizationId),
          eq(equipmentAssignments.status, "released"),
        ),
      )
      .returning();
    if (!updated[0]) return { ok: false, error: ALREADY };
  } else {
    try {
      await getDb().insert(equipmentAssignments).values(next);
    } catch (error) {
      if (isUniqueViolation(error)) return { ok: false, error: ALREADY };
      throw error;
    }
  }

  await audit(input.actor, access.organizationId, "equipment.assign", next.id, {
    jobId: next.jobId,
    name: next.name,
    status: next.status,
  });
  return { ok: true, assignment: next };
}

export async function releaseEquipment(input: {
  actor: EquipmentActor;
  assignmentId: string;
}): Promise<{ ok: true; assignment: EquipmentAssignment } | { ok: false; error: string }> {
  const access = resolveEquipmentAccess(input.actor, "equipment.edit");
  if (!access.ok) return access;
  if (!isUuid(input.assignmentId)) {
    return { ok: false, error: "That equipment assignment was not found." };
  }
  const current = await findAssignment(access.organizationId, input.assignmentId);
  if (!current) return { ok: false, error: "That equipment assignment was not found." };
  if (current.status === "released") {
    return { ok: false, error: "That equipment is already released." };
  }
  const now = new Date();
  const next: EquipmentAssignment = { ...current, status: "released", updatedAt: now };
  if (isDemoOpsStore()) {
    const state = equipmentMemory();
    const index = state.assignments.findIndex((row) => row.id === current.id);
    const row = index >= 0 ? state.assignments[index] : undefined;
    if (!row || row.status !== "assigned") {
      return { ok: false, error: "That equipment is already released." };
    }
    state.assignments[index] = next;
  } else {
    const updated = await getDb()
      .update(equipmentAssignments)
      .set({ status: "released", updatedAt: now })
      .where(
        and(
          eq(equipmentAssignments.id, current.id),
          eq(equipmentAssignments.organizationId, access.organizationId),
          eq(equipmentAssignments.status, "assigned"),
        ),
      )
      .returning();
    if (!updated[0]) return { ok: false, error: "That equipment is already released." };
  }
  await audit(input.actor, access.organizationId, "equipment.release", next.id, {
    jobId: next.jobId,
    name: next.name,
    status: next.status,
  });
  return { ok: true, assignment: next };
}
