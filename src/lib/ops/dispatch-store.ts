import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dispatches } from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import {
  dispatchMemory,
  resetDispatchMemory,
} from "@/lib/ops/dispatch-access";
import {
  resolveDispatchAccess,
  type DispatchActor,
} from "@/lib/ops/dispatch-authorization";
import {
  dispatchableJobStatus,
  parseDispatchNote,
  parseWorkDate,
  type Dispatch,
  type DispatchStatus,
} from "@/lib/ops/dispatch";
import { isUuid } from "@/lib/ops/job-workspace";
import { getJob, listActiveFieldUsers } from "@/lib/ops/store";

export function resetDispatchesForTests(): void {
  resetDispatchMemory();
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

function asStatus(value: string): DispatchStatus {
  if (value === "scheduled" || value === "cancelled") return value;
  throw new Error("Unknown dispatch status.");
}

function fromRow(row: typeof dispatches.$inferSelect): Dispatch {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    userId: row.userId,
    workDate: row.workDate,
    status: asStatus(row.status),
    note: row.note,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function slot(
  row: Pick<Dispatch, "organizationId" | "jobId" | "userId" | "workDate">,
  other: Pick<Dispatch, "organizationId" | "jobId" | "userId" | "workDate">,
): boolean {
  return (
    row.organizationId === other.organizationId &&
    row.jobId === other.jobId &&
    row.userId === other.userId &&
    row.workDate === other.workDate
  );
}

async function findSlot(
  organizationId: string,
  jobId: string,
  userId: string,
  workDate: string,
): Promise<Dispatch | null> {
  if (isDemoOpsStore()) {
    return (
      dispatchMemory().rows.find((row) =>
        slot(row, { organizationId, jobId, userId, workDate }),
      ) ?? null
    );
  }
  const rows = await getDb()
    .select()
    .from(dispatches)
    .where(
      and(
        eq(dispatches.organizationId, organizationId),
        eq(dispatches.jobId, jobId),
        eq(dispatches.userId, userId),
        eq(dispatches.workDate, workDate),
      ),
    )
    .limit(1);
  return rows[0] ? fromRow(rows[0]) : null;
}

async function insertDispatch(row: Dispatch): Promise<Dispatch | "conflict"> {
  if (isDemoOpsStore()) {
    const state = dispatchMemory();
    if (state.rows.some((existing) => slot(existing, row))) return "conflict";
    state.rows.push(row);
    return row;
  }
  try {
    const inserted = await getDb().insert(dispatches).values(row).returning();
    const saved = inserted[0];
    if (!saved) throw new Error("The dispatch could not be saved.");
    return fromRow(saved);
  } catch (error) {
    if (isUniqueViolation(error)) return "conflict";
    throw error;
  }
}

async function reviveDispatch(row: Dispatch): Promise<Dispatch | "conflict"> {
  if (isDemoOpsStore()) {
    const state = dispatchMemory();
    const index = state.rows.findIndex((existing) => existing.id === row.id);
    const current = index >= 0 ? state.rows[index] : undefined;
    if (!current || current.status !== "cancelled" || !slot(current, row)) {
      return "conflict";
    }
    state.rows[index] = row;
    return row;
  }
  const updated = await getDb()
    .update(dispatches)
    .set({
      status: "scheduled",
      note: row.note,
      updatedAt: row.updatedAt,
    })
    .where(
      and(
        eq(dispatches.id, row.id),
        eq(dispatches.organizationId, row.organizationId),
        eq(dispatches.status, "cancelled"),
      ),
    )
    .returning();
  return updated[0] ? fromRow(updated[0]) : "conflict";
}

async function cancelRow(row: Dispatch): Promise<Dispatch | "missing"> {
  if (isDemoOpsStore()) {
    const state = dispatchMemory();
    const index = state.rows.findIndex(
      (existing) =>
        existing.id === row.id && existing.organizationId === row.organizationId,
    );
    const current = index >= 0 ? state.rows[index] : undefined;
    if (!current || current.status !== "scheduled") return "missing";
    state.rows[index] = row;
    return row;
  }
  const updated = await getDb()
    .update(dispatches)
    .set({ status: "cancelled", updatedAt: row.updatedAt })
    .where(
      and(
        eq(dispatches.id, row.id),
        eq(dispatches.organizationId, row.organizationId),
        eq(dispatches.status, "scheduled"),
      ),
    )
    .returning();
  return updated[0] ? fromRow(updated[0]) : "missing";
}

async function audit(
  actor: DispatchActor,
  organizationId: string,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent({
    organizationId,
    actor: actor.email,
    action,
    entityType: "dispatch",
    entityId,
    result: "success",
    correlationId: crypto.randomUUID(),
    payload,
  });
}

export async function listDispatches(
  organizationId: string,
  workDate: string,
  userId?: string,
): Promise<Dispatch[]> {
  if (isDemoOpsStore()) {
    return dispatchMemory().rows.filter(
      (row) =>
        row.organizationId === organizationId &&
        row.workDate === workDate &&
        (!userId || row.userId === userId),
    );
  }
  const rows = await getDb()
    .select()
    .from(dispatches)
    .where(
      userId
        ? and(
            eq(dispatches.organizationId, organizationId),
            eq(dispatches.workDate, workDate),
            eq(dispatches.userId, userId),
          )
        : and(
            eq(dispatches.organizationId, organizationId),
            eq(dispatches.workDate, workDate),
          ),
    );
  return rows.map(fromRow);
}

const ALREADY =
  "That person is already dispatched to this job on that day.";

export async function scheduleDispatch(input: {
  actor: DispatchActor;
  jobId: string;
  userId: string;
  workDate: string;
  note?: string;
}): Promise<{ ok: true; dispatch: Dispatch } | { ok: false; error: string }> {
  const access = resolveDispatchAccess(input.actor, "dispatch.edit");
  if (!access.ok) return access;
  const workDate = parseWorkDate(input.workDate);
  if (!workDate.ok) return workDate;
  const note = parseDispatchNote(input.note);
  if (!note.ok) return note;
  if (!isUuid(input.jobId) || !isUuid(input.userId)) {
    return { ok: false, error: "Choose a job and an active field member." };
  }

  const job = await getJob(input.jobId);
  if (!job || job.organizationId !== access.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!dispatchableJobStatus(job.status)) {
    return { ok: false, error: "Closed jobs cannot be dispatched." };
  }
  const fieldUsers = await listActiveFieldUsers();
  const person = fieldUsers.find(
    (user) =>
      user.userId === input.userId &&
      user.organizationId === access.organizationId,
  );
  if (!person) {
    return { ok: false, error: "Choose an active field member." };
  }

  const existing = await findSlot(
    access.organizationId,
    job.id,
    person.userId,
    workDate.value,
  );
  if (existing?.status === "scheduled") {
    return { ok: false, error: ALREADY };
  }

  const now = new Date();
  const next: Dispatch = existing
    ? {
        ...existing,
        status: "scheduled",
        note: note.value,
        updatedAt: now,
      }
    : {
        id: crypto.randomUUID(),
        organizationId: access.organizationId,
        jobId: job.id,
        userId: person.userId,
        workDate: workDate.value,
        status: "scheduled",
        note: note.value,
        createdBy: input.actor.email,
        createdAt: now,
        updatedAt: now,
      };
  const saved = existing ? await reviveDispatch(next) : await insertDispatch(next);
  if (saved === "conflict") {
    const raced = await findSlot(
      access.organizationId,
      job.id,
      person.userId,
      workDate.value,
    );
    if (raced?.status === "cancelled") {
      const revived = await reviveDispatch({
        ...raced,
        status: "scheduled",
        note: note.value,
        updatedAt: now,
      });
      if (revived === "conflict") return { ok: false, error: ALREADY };
      await audit(input.actor, access.organizationId, "dispatch.schedule", revived.id, {
        jobId: revived.jobId,
        userId: revived.userId,
        workDate: revived.workDate,
        revived: true,
      });
      return { ok: true, dispatch: revived };
    }
    return { ok: false, error: ALREADY };
  }

  await audit(input.actor, access.organizationId, "dispatch.schedule", saved.id, {
    jobId: saved.jobId,
    userId: saved.userId,
    workDate: saved.workDate,
    revived: Boolean(existing),
  });
  return { ok: true, dispatch: saved };
}

export async function cancelDispatch(input: {
  actor: DispatchActor;
  dispatchId: string;
}): Promise<{ ok: true; dispatch: Dispatch } | { ok: false; error: string }> {
  const access = resolveDispatchAccess(input.actor, "dispatch.edit");
  if (!access.ok) return access;
  if (!isUuid(input.dispatchId)) {
    return { ok: false, error: "That dispatch was not found." };
  }
  const current = isDemoOpsStore()
    ? dispatchMemory().rows.find(
        (row) =>
          row.id === input.dispatchId &&
          row.organizationId === access.organizationId,
      ) ?? null
    : await (async () => {
        const rows = await getDb()
          .select()
          .from(dispatches)
          .where(
            and(
              eq(dispatches.id, input.dispatchId),
              eq(dispatches.organizationId, access.organizationId),
            ),
          )
          .limit(1);
        return rows[0] ? fromRow(rows[0]) : null;
      })();
  if (!current) return { ok: false, error: "That dispatch was not found." };
  if (current.status === "cancelled") {
    return { ok: false, error: "That dispatch is already cancelled." };
  }
  const cancelled = await cancelRow({
    ...current,
    status: "cancelled",
    updatedAt: new Date(),
  });
  if (cancelled === "missing") {
    return { ok: false, error: "That dispatch changed. Review the day again." };
  }
  await audit(input.actor, access.organizationId, "dispatch.cancel", cancelled.id, {
    jobId: cancelled.jobId,
    userId: cancelled.userId,
    workDate: cancelled.workDate,
  });
  return { ok: true, dispatch: cancelled };
}
