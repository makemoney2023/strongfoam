import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { closeouts, jobs } from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { closeoutMemory, resetCloseoutMemory } from "@/lib/ops/closeout-access";
import {
  resolveCloseoutAccess,
  type CloseoutActor,
} from "@/lib/ops/closeout-authorization";
import {
  buildCloseoutAttention,
  closeoutCanBeSigned,
  parseCloseoutNote,
  parseCloseoutStatus,
  type Closeout,
  type CloseoutAttention,
  type CloseoutStatus,
} from "@/lib/ops/closeout";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { dispatchableJobStatus } from "@/lib/ops/dispatch";
import { draftCloseoutPacket, type CloseoutPacketDraft } from "@/lib/ops/closeout-packet";
import { listJobAssembly } from "@/lib/ops/assembly-store";
import { listJobInspections } from "@/lib/ops/inspection-store";
import { isUuid } from "@/lib/ops/job-workspace";
import { statedQuantityUnitLabel } from "@/lib/ops/quantity-pace";
import {
  getJob,
  listJobDocuments,
  listJobPlanAnnotations,
  listJobTasks,
  listJobs,
} from "@/lib/ops/store";

export function resetCloseoutsForTests(): void {
  resetCloseoutMemory();
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = candidate.code ?? candidate.cause?.code;
  const message = `${candidate.message ?? ""} ${candidate.cause?.message ?? ""}`;
  return code === "23505" || code === "SQLITE_CONSTRAINT" || message.includes("UNIQUE");
}

function asStatus(value: string): CloseoutStatus {
  if (value === "preparing" || value === "ready" || value === "signed") return value;
  throw new Error("Unknown closeout status.");
}

function fromRow(row: typeof closeouts.$inferSelect): Closeout {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    status: asStatus(row.status),
    note: row.note,
    packetText: row.packetText,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function audit(
  actor: CloseoutActor,
  organizationId: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent({
    organizationId,
    actor: actor.email,
    action: "closeout.record",
    entityType: "closeout",
    entityId,
    result: "success",
    correlationId: crypto.randomUUID(),
    payload,
  });
}

export async function listJobCloseout(
  organizationId: string,
  jobId: string,
): Promise<Closeout | null> {
  if (isDemoOpsStore()) {
    return (
      closeoutMemory().rows.find(
        (row) => row.organizationId === organizationId && row.jobId === jobId,
      ) ?? null
    );
  }
  const rows = await getDb()
    .select()
    .from(closeouts)
    .where(and(eq(closeouts.organizationId, organizationId), eq(closeouts.jobId, jobId)))
    .limit(1);
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function listCloseoutAttention(
  organizationId: string,
): Promise<CloseoutAttention[]> {
  if (isDemoOpsStore()) {
    const jobRows = (await listJobs()).filter((job) => job.organizationId === organizationId);
    return buildCloseoutAttention({
      organizationId,
      jobs: jobRows,
      closeouts: closeoutMemory().rows,
    });
  }
  const rows = await getDb()
    .select({
      closeout: closeouts,
      jobName: jobs.name,
      jobStatus: jobs.status,
      jobOrganizationId: jobs.organizationId,
    })
    .from(closeouts)
    .innerJoin(jobs, eq(closeouts.jobId, jobs.id))
    .where(
      and(
        eq(closeouts.organizationId, organizationId),
        inArray(closeouts.status, ["preparing", "ready"]),
        ne(jobs.status, "closed"),
      ),
    );
  return buildCloseoutAttention({
    organizationId,
    jobs: rows.map((row) => ({
      id: row.closeout.jobId,
      name: row.jobName,
      status: row.jobStatus,
      organizationId: row.jobOrganizationId,
    })),
    closeouts: rows.map((row) => fromRow(row.closeout)),
  });
}

export async function previewCloseoutPacket(
  organizationId: string,
  jobId: string,
): Promise<{ ok: true; draft: CloseoutPacketDraft } | { ok: false; error: string }> {
  const job = await getJob(jobId);
  if (!job || job.organizationId !== organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  const [assembly, documents, tasks, marks] = await Promise.all([
    listJobAssembly(organizationId, jobId),
    listJobDocuments(jobId),
    listJobTasks(jobId),
    listJobPlanAnnotations(jobId),
  ]);
  const quantityLines = tasks
    .filter((task) => task.statedQuantity != null && task.statedUnit)
    .map((task) => {
      const unit = task.statedUnit === "bags" || task.statedUnit === "sq_ft" ? task.statedUnit : null;
      return unit
        ? `${task.title}: ${task.statedQuantity} ${statedQuantityUnitLabel(unit)}`
        : `${task.title}: ${task.statedQuantity}`;
    });
  return draftCloseoutPacket({
    jobName: job.name,
    assembly,
    photoCount: documents.filter((document) => document.kind === "photo").length,
    quantityLines,
    planRows: marks.map((mark) => mark.title),
  });
}

export async function saveCloseoutPacket(input: {
  actor: CloseoutActor;
  jobId: string;
  narrative: string;
}): Promise<{ ok: true; closeout: Closeout } | { ok: false; error: string }> {
  const access = resolveCloseoutAccess(input.actor, "closeout.edit");
  if (!access.ok) return access;
  if (!isUuid(input.jobId)) return { ok: false, error: "That job was not found." };
  const narrative = input.narrative.trim().replace(/\s+/g, " ");
  if (!narrative) return { ok: false, error: "The closeout packet is empty." };
  if (narrative.length > 4000) {
    return { ok: false, error: "Keep the closeout packet under 4000 characters." };
  }
  const existing = await listJobCloseout(access.organizationId, input.jobId);
  if (!existing) return { ok: false, error: "Record closeout before saving the packet." };
  const now = new Date();
  if (isDemoOpsStore()) {
    const row = closeoutMemory().rows.find((item) => item.id === existing.id);
    if (!row) return { ok: false, error: "Record closeout before saving the packet." };
    row.packetText = narrative;
    row.updatedAt = now;
    await audit(input.actor, access.organizationId, row.id, {
      jobId: row.jobId,
      status: row.status,
      packet: true,
    });
    return { ok: true, closeout: row };
  }
  const updated = await getDb()
    .update(closeouts)
    .set({ packetText: narrative, updatedAt: now })
    .where(
      and(eq(closeouts.organizationId, access.organizationId), eq(closeouts.jobId, input.jobId)),
    )
    .returning();
  const closeout = updated[0] ? fromRow(updated[0]) : null;
  if (!closeout) return { ok: false, error: "Record closeout before saving the packet." };
  await audit(input.actor, access.organizationId, closeout.id, {
    jobId: closeout.jobId,
    status: closeout.status,
    packet: true,
  });
  return { ok: true, closeout };
}

export async function recordCloseout(input: {
  actor: CloseoutActor;
  jobId: string;
  status?: string;
  note?: string;
}): Promise<{ ok: true; closeout: Closeout } | { ok: false; error: string }> {
  const access = resolveCloseoutAccess(input.actor, "closeout.edit");
  if (!access.ok) return access;
  if (!isUuid(input.jobId)) return { ok: false, error: "That job was not found." };
  const job = await getJob(input.jobId);
  if (!job || job.organizationId !== access.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!dispatchableJobStatus(job.status)) {
    return { ok: false, error: "Closed jobs cannot take a closeout." };
  }
  const parsedStatus = parseCloseoutStatus(input.status);
  if (!parsedStatus.ok) return parsedStatus;
  const note = parseCloseoutNote(input.note);
  if (!note.ok) return note;
  if (parsedStatus.value === "signed") {
    const inspections = await listJobInspections(access.organizationId, job.id);
    if (!closeoutCanBeSigned(inspections)) {
      return {
        ok: false,
        error: "Sign closeout after every inspection on this job has passed.",
      };
    }
  }

  const now = new Date();
  const existing = isDemoOpsStore()
    ? closeoutMemory().rows.find(
        (row) => row.organizationId === access.organizationId && row.jobId === job.id,
      )
    : null;

  if (isDemoOpsStore() && existing) {
    existing.status = parsedStatus.value;
    existing.note = note.value;
    existing.updatedAt = now;
    await audit(input.actor, access.organizationId, existing.id, {
      jobId: job.id,
      status: existing.status,
    });
    return { ok: true, closeout: existing };
  }

  if (isDemoOpsStore()) {
    const closeout: Closeout = {
      id: crypto.randomUUID(),
      organizationId: access.organizationId,
      jobId: job.id,
      status: parsedStatus.value,
      note: note.value,
      packetText: "",
      createdBy: input.actor.email,
      createdAt: now,
      updatedAt: now,
    };
    closeoutMemory().rows.push(closeout);
    await audit(input.actor, access.organizationId, closeout.id, {
      jobId: job.id,
      status: closeout.status,
    });
    return { ok: true, closeout };
  }

  const db = getDb();
  try {
    const inserted = await db
      .insert(closeouts)
      .values({
        organizationId: access.organizationId,
        jobId: job.id,
        status: parsedStatus.value,
        note: note.value,
        packetText: "",
        createdBy: input.actor.email,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const closeout = fromRow(inserted[0]!);
    await audit(input.actor, access.organizationId, closeout.id, {
      jobId: job.id,
      status: closeout.status,
    });
    return { ok: true, closeout };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const updated = await db
      .update(closeouts)
      .set({
        status: parsedStatus.value,
        note: note.value,
        updatedAt: now,
      })
      .where(
        and(eq(closeouts.organizationId, access.organizationId), eq(closeouts.jobId, job.id)),
      )
      .returning();
    const closeout = updated[0] ? fromRow(updated[0]) : null;
    if (!closeout) return { ok: false, error: "That closeout was not found." };
    await audit(input.actor, access.organizationId, closeout.id, {
      jobId: job.id,
      status: closeout.status,
    });
    return { ok: true, closeout };
  }
}
