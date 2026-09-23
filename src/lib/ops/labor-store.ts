import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { laborEntries } from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { dispatchableJobStatus, parseWorkDate } from "@/lib/ops/dispatch";
import { isFieldMembershipRole } from "@/lib/ops/identity";
import { isUuid } from "@/lib/ops/job-workspace";
import {
  parseLaborHours,
  parseLaborKind,
  parseLaborNote,
  parsePieceQuantity,
  type LaborEntry,
  type LaborKind,
} from "@/lib/ops/labor";
import {
  resolveLaborAccess,
  type LaborActor,
} from "@/lib/ops/labor-authorization";
import { isStatedQuantityUnit } from "@/lib/ops/quantity-pace";
import {
  canFieldUserAccessJob,
  getJob,
  listActiveFieldUsers,
} from "@/lib/ops/store";

type LaborMemory = { rows: LaborEntry[] };

function memory(): LaborMemory {
  const globalForLabor = globalThis as typeof globalThis & {
    __strongfoamLabor?: LaborMemory;
  };
  globalForLabor.__strongfoamLabor ??= { rows: [] };
  return globalForLabor.__strongfoamLabor;
}

export function resetLaborForTests(): void {
  const globalForLabor = globalThis as typeof globalThis & {
    __strongfoamLabor?: LaborMemory;
  };
  globalForLabor.__strongfoamLabor = { rows: [] };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

function asKind(value: string): LaborKind {
  if (value === "hourly" || value === "piece") return value;
  throw new Error("Unknown labor kind.");
}

function fromRow(row: typeof laborEntries.$inferSelect): LaborEntry {
  const unit = row.unit === "" || isStatedQuantityUnit(row.unit) ? row.unit : "";
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    userId: row.userId,
    workDate: row.workDate,
    kind: asKind(row.kind),
    minutes: row.minutes,
    quantity: row.quantity,
    unit,
    note: row.note,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function sameSlot(row: LaborEntry, key: Pick<LaborEntry, "organizationId" | "jobId" | "userId" | "workDate" | "kind" | "unit">): boolean {
  return (
    row.organizationId === key.organizationId &&
    row.jobId === key.jobId &&
    row.userId === key.userId &&
    row.workDate === key.workDate &&
    row.kind === key.kind &&
    row.unit === key.unit
  );
}

async function audit(
  actor: LaborActor,
  organizationId: string,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent({
    organizationId,
    actor: actor.email,
    action,
    entityType: "labor_entry",
    entityId,
    result: "success",
    correlationId: crypto.randomUUID(),
    payload,
  });
}

export async function listLabor(
  organizationId: string,
  workDate: string,
  userId?: string,
): Promise<LaborEntry[]> {
  if (isDemoOpsStore()) {
    return memory().rows.filter(
      (row) =>
        row.organizationId === organizationId &&
        row.workDate === workDate &&
        (!userId || row.userId === userId),
    );
  }
  const rows = await getDb()
    .select()
    .from(laborEntries)
    .where(
      userId
        ? and(
            eq(laborEntries.organizationId, organizationId),
            eq(laborEntries.workDate, workDate),
            eq(laborEntries.userId, userId),
          )
        : and(
            eq(laborEntries.organizationId, organizationId),
            eq(laborEntries.workDate, workDate),
          ),
    );
  return rows.map(fromRow);
}

async function saveEntry(entry: LaborEntry): Promise<LaborEntry> {
  if (isDemoOpsStore()) {
    const state = memory();
    const index = state.rows.findIndex((row) => sameSlot(row, entry));
    if (index >= 0) {
      const current = state.rows[index]!;
      const saved = {
        ...entry,
        id: current.id,
        createdBy: current.createdBy,
        createdAt: current.createdAt,
      };
      state.rows[index] = saved;
      return saved;
    }
    state.rows.push(entry);
    return entry;
  }
  const db = getDb();
  try {
    const inserted = await db.insert(laborEntries).values(entry).returning();
    const saved = inserted[0];
    if (!saved) throw new Error("The labor entry could not be saved.");
    return fromRow(saved);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const updated = await db
      .update(laborEntries)
      .set({
        minutes: entry.minutes,
        quantity: entry.quantity,
        note: entry.note,
        updatedAt: entry.updatedAt,
      })
      .where(
        and(
          eq(laborEntries.organizationId, entry.organizationId),
          eq(laborEntries.jobId, entry.jobId),
          eq(laborEntries.userId, entry.userId),
          eq(laborEntries.workDate, entry.workDate),
          eq(laborEntries.kind, entry.kind),
          eq(laborEntries.unit, entry.unit),
        ),
      )
      .returning();
    const saved = updated[0];
    if (!saved) throw error;
    return fromRow(saved);
  }
}

export async function recordLabor(input: {
  actor: LaborActor;
  jobId: string;
  userId: string;
  workDate: string;
  kind: string;
  hours?: string;
  quantity?: string;
  unit?: string;
  note?: string;
}): Promise<{ ok: true; entry: LaborEntry } | { ok: false; error: string }> {
  const access = resolveLaborAccess(input.actor, "labor.edit");
  if (!access.ok) return access;
  const workDate = parseWorkDate(input.workDate);
  if (!workDate.ok) return workDate;
  const kind = parseLaborKind(input.kind);
  if (!kind.ok) return kind;
  const note = parseLaborNote(input.note);
  if (!note.ok) return note;
  if (!isUuid(input.jobId) || !isUuid(input.userId)) {
    return { ok: false, error: "Choose a job and an active field member." };
  }
  if (isFieldMembershipRole(input.actor.role) && input.actor.userId !== input.userId) {
    return { ok: false, error: "You can record only your own labor." };
  }

  const measure =
    kind.value === "hourly"
      ? parseLaborHours(input.hours)
      : parsePieceQuantity({ quantity: input.quantity, unit: input.unit });
  if (!measure.ok) return measure;

  const job = await getJob(input.jobId);
  if (!job || job.organizationId !== access.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!dispatchableJobStatus(job.status)) {
    return { ok: false, error: "Closed jobs cannot take labor." };
  }
  if (
    isFieldMembershipRole(input.actor.role) &&
    !(await canFieldUserAccessJob(input.actor.userId ?? "", job.id))
  ) {
    return { ok: false, error: "That job was not found." };
  }
  const person = (await listActiveFieldUsers()).find(
    (user) => user.userId === input.userId && user.organizationId === access.organizationId,
  );
  if (!person) return { ok: false, error: "Choose an active field member." };

  const now = new Date();
  const entry: LaborEntry = {
    id: crypto.randomUUID(),
    organizationId: access.organizationId,
    jobId: job.id,
    userId: person.userId,
    workDate: workDate.value,
    kind: kind.value,
    minutes: "minutes" in measure ? measure.minutes : null,
    quantity: "quantity" in measure ? measure.quantity : null,
    unit: "unit" in measure ? measure.unit : "",
    note: note.value,
    createdBy: input.actor.email,
    createdAt: now,
    updatedAt: now,
  };
  const saved = await saveEntry(entry);
  await audit(input.actor, access.organizationId, "labor.record", saved.id, {
    jobId: saved.jobId,
    userId: saved.userId,
    workDate: saved.workDate,
    kind: saved.kind,
    minutes: saved.minutes,
    quantity: saved.quantity,
    unit: saved.unit,
  });
  return { ok: true, entry: saved };
}

export async function removeLabor(input: {
  actor: LaborActor;
  laborId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = resolveLaborAccess(input.actor, "labor.edit");
  if (!access.ok) return access;
  if (!isUuid(input.laborId)) {
    return { ok: false, error: "That labor entry was not found." };
  }
  const current = isDemoOpsStore()
    ? memory().rows.find(
        (row) => row.id === input.laborId && row.organizationId === access.organizationId,
      ) ?? null
    : await (async () => {
        const rows = await getDb()
          .select()
          .from(laborEntries)
          .where(
            and(
              eq(laborEntries.id, input.laborId),
              eq(laborEntries.organizationId, access.organizationId),
            ),
          )
          .limit(1);
        return rows[0] ? fromRow(rows[0]) : null;
      })();
  if (!current) return { ok: false, error: "That labor entry was not found." };
  if (isFieldMembershipRole(input.actor.role) && input.actor.userId !== current.userId) {
    return { ok: false, error: "You can remove only your own labor." };
  }
  if (isDemoOpsStore()) {
    const state = memory();
    state.rows = state.rows.filter((row) => row.id !== current.id);
  } else {
    await getDb()
      .delete(laborEntries)
      .where(
        and(
          eq(laborEntries.id, current.id),
          eq(laborEntries.organizationId, access.organizationId),
        ),
      );
  }
  await audit(input.actor, access.organizationId, "labor.remove", current.id, {
    jobId: current.jobId,
    userId: current.userId,
    workDate: current.workDate,
    kind: current.kind,
  });
  return { ok: true };
}
