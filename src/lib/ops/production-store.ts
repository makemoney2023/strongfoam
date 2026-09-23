import { and, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  productionAllocations,
  productionEntries,
  productionParticipants,
  productionTargets,
} from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { demoProductionSeed, seedWhenDemo } from "@/lib/ops/demo-operations";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { dispatchableJobStatus, parseWorkDate } from "@/lib/ops/dispatch";
import { listDispatches } from "@/lib/ops/dispatch-store";
import { listLaborRange } from "@/lib/ops/labor-store";
import { isFieldMembershipRole } from "@/lib/ops/identity";
import { isUuid } from "@/lib/ops/job-workspace";
import { parsePieceQuantity } from "@/lib/ops/labor";
import { isStatedQuantityUnit, type StatedQuantityUnit } from "@/lib/ops/quantity-pace";
import {
  canFieldUserAccessJob,
  getJob,
  listActiveFieldUsers,
  listJobs,
  listUsers,
} from "@/lib/ops/store";
import {
  resolveWorkforceAccess,
  type WorkforceActor,
} from "@/lib/ops/workforce-authorization";
import {
  parseAttributionMode,
  parseTargetBasis,
  parseTargetRate,
  parseWorkClassLabel,
  shiftWorkDate,
  WORKFORCE_WINDOWS,
  buildWorkforcePerformance,
  type AttributionMode,
  type ProductionAllocation,
  type ProductionEntry,
  type ProductionParticipant,
  type ProductionStatus,
  type ProductionTarget,
  type TargetBasis,
} from "@/lib/ops/workforce-performance";

type ProductionMemory = {
  entries: ProductionEntry[];
  participants: ProductionParticipant[];
  allocations: ProductionAllocation[];
  targets: ProductionTarget[];
};

function memory(): ProductionMemory {
  const globalForProduction = globalThis as typeof globalThis & {
    __strongfoamProduction?: ProductionMemory;
  };
  globalForProduction.__strongfoamProduction ??= seedWhenDemo(
    () => demoProductionSeed(),
    { entries: [], participants: [], allocations: [], targets: [] },
  );
  return globalForProduction.__strongfoamProduction;
}

export function resetProductionForTests(): void {
  const globalForProduction = globalThis as typeof globalThis & {
    __strongfoamProduction?: ProductionMemory;
  };
  globalForProduction.__strongfoamProduction = {
    entries: [],
    participants: [],
    allocations: [],
    targets: [],
  };
}

async function audit(
  actor: WorkforceActor,
  organizationId: string,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent({
    organizationId,
    actor: actor.email,
    action,
    entityType: "production_entry",
    entityId,
    result: "success",
    correlationId: crypto.randomUUID(),
    payload,
  });
}

class ProductionRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionRuleError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

function asStatus(value: string): ProductionStatus {
  if (value === "draft" || value === "verified" || value === "void") return value;
  throw new Error("Unknown production status.");
}

function asMode(value: string): AttributionMode {
  if (value === "crew" || value === "individual") return value;
  throw new Error("Unknown production attribution.");
}

function asUnit(value: string): StatedQuantityUnit {
  if (isStatedQuantityUnit(value)) return value;
  throw new Error("Unknown production unit.");
}

function asBasis(value: string): TargetBasis {
  if (value === "crew_hour" || value === "person_hour") return value;
  throw new Error("Unknown production target basis.");
}

function entryFromRow(row: typeof productionEntries.$inferSelect): ProductionEntry {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    workDate: row.workDate,
    taskId: row.taskId,
    workAreaId: row.workAreaId,
    trade: row.trade,
    workType: row.workType,
    unit: asUnit(row.unit),
    quantity: row.quantity,
    attributionMode: asMode(row.attributionMode),
    status: asStatus(row.status),
    recordedBy: row.recordedBy,
    verifiedBy: row.verifiedBy,
    verifiedAt: row.verifiedAt,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listProductionFacts(
  organizationId: string,
  from: string,
  to: string,
): Promise<{
  entries: ProductionEntry[];
  participants: ProductionParticipant[];
  allocations: ProductionAllocation[];
  targets: ProductionTarget[];
}> {
  if (isDemoOpsStore()) {
    const state = memory();
    const entries = state.entries.filter(
      (entry) =>
        entry.organizationId === organizationId &&
        entry.workDate >= from &&
        entry.workDate <= to,
    );
    const ids = new Set(entries.map((entry) => entry.id));
    return {
      entries,
      participants: state.participants.filter((row) => ids.has(row.productionEntryId)),
      allocations: state.allocations.filter((row) => ids.has(row.productionEntryId)),
      targets: state.targets.filter((target) => target.organizationId === organizationId),
    };
  }
  const db = getDb();
  const entryRows = await db
    .select()
    .from(productionEntries)
    .where(
      and(
        eq(productionEntries.organizationId, organizationId),
        gte(productionEntries.workDate, from),
        lte(productionEntries.workDate, to),
      ),
    );
  const entries = entryRows.map(entryFromRow);
  const ids = entries.map((entry) => entry.id);
  const [participantRows, allocationRows, targetRows] = await Promise.all([
    ids.length
      ? db.select().from(productionParticipants).where(inArray(productionParticipants.productionEntryId, ids))
      : Promise.resolve([]),
    ids.length
      ? db.select().from(productionAllocations).where(inArray(productionAllocations.productionEntryId, ids))
      : Promise.resolve([]),
    db.select().from(productionTargets).where(eq(productionTargets.organizationId, organizationId)),
  ]);
  return {
    entries,
    participants: participantRows.map((row) => ({
      id: row.id,
      productionEntryId: row.productionEntryId,
      userId: row.userId,
      laborEntryId: row.laborEntryId,
    })),
    allocations: allocationRows.map((row) => ({
      id: row.id,
      productionEntryId: row.productionEntryId,
      userId: row.userId,
      quantity: row.quantity,
    })),
    targets: targetRows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      trade: row.trade,
      workType: row.workType,
      unit: asUnit(row.unit),
      basis: asBasis(row.basis),
      rateMilli: row.rateMilli,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
    })),
  };
}

async function entryById(organizationId: string, productionId: string): Promise<ProductionEntry | null> {
  if (isDemoOpsStore()) {
    return (
      memory().entries.find((entry) => entry.id === productionId && entry.organizationId === organizationId) ??
      null
    );
  }
  const rows = await getDb()
    .select()
    .from(productionEntries)
    .where(and(eq(productionEntries.id, productionId), eq(productionEntries.organizationId, organizationId)))
    .limit(1);
  return rows[0] ? entryFromRow(rows[0]) : null;
}

async function participantsFor(productionId: string): Promise<ProductionParticipant[]> {
  if (isDemoOpsStore()) {
    return memory().participants.filter((row) => row.productionEntryId === productionId);
  }
  const rows = await getDb()
    .select()
    .from(productionParticipants)
    .where(eq(productionParticipants.productionEntryId, productionId));
  return rows.map((row) => ({
    id: row.id,
    productionEntryId: row.productionEntryId,
    userId: row.userId,
    laborEntryId: row.laborEntryId,
  }));
}

function includesActor(actor: WorkforceActor, participants: ProductionParticipant[]): boolean {
  return Boolean(actor.userId && participants.some((row) => row.userId === actor.userId));
}

export async function recordProduction(input: {
  actor: WorkforceActor;
  jobId: string;
  workDate: string;
  trade: string;
  workType: string;
  unit: string;
  quantity: string;
  attributionMode: string;
  participantUserIds: string[];
}): Promise<{ ok: true; entry: ProductionEntry } | { ok: false; error: string }> {
  const access = resolveWorkforceAccess(input.actor, "workforce.record");
  if (!access.ok) return access;
  const workDate = parseWorkDate(input.workDate);
  if (!workDate.ok) return workDate;
  const trade = parseWorkClassLabel(input.trade, "trade");
  if (!trade.ok) return trade;
  const workType = parseWorkClassLabel(input.workType, "work type");
  if (!workType.ok) return workType;
  const mode = parseAttributionMode(input.attributionMode);
  if (!mode.ok) return mode;
  const measure = parsePieceQuantity({ quantity: input.quantity, unit: input.unit });
  if (!measure.ok) return measure;
  const participantUserIds = [...new Set(input.participantUserIds.map((id) => id.trim()).filter(Boolean))];
  if (participantUserIds.length === 0 || participantUserIds.some((id) => !isUuid(id)) || !isUuid(input.jobId)) {
    return { ok: false, error: "Choose a job and an active field member." };
  }
  if (isFieldMembershipRole(input.actor.role)) {
    if (
      mode.value !== "individual" ||
      participantUserIds.length !== 1 ||
      participantUserIds[0] !== input.actor.userId
    ) {
      return { ok: false, error: "You can record only your own production." };
    }
  }
  if (mode.value === "individual" && participantUserIds.length !== 1) {
    return {
      ok: false,
      error: "Individual production is for one person. Choose crew when several people share the quantity.",
    };
  }
  const job = await getJob(input.jobId);
  if (!job || job.organizationId !== access.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!dispatchableJobStatus(job.status)) {
    return { ok: false, error: "Closed jobs cannot take production." };
  }
  if (
    isFieldMembershipRole(input.actor.role) &&
    !(await canFieldUserAccessJob(input.actor.userId ?? "", job.id))
  ) {
    return { ok: false, error: "That job was not found." };
  }
  const people = await listActiveFieldUsers();
  if (
    participantUserIds.some(
      (userId) => !people.some((person) => person.userId === userId && person.organizationId === access.organizationId),
    )
  ) {
    return { ok: false, error: "Choose an active field member." };
  }

  const now = new Date();
  const entry: ProductionEntry = {
    id: crypto.randomUUID(),
    organizationId: access.organizationId,
    jobId: job.id,
    workDate: workDate.value,
    taskId: null,
    workAreaId: null,
    trade: trade.value,
    workType: workType.value,
    unit: measure.unit,
    quantity: measure.quantity,
    attributionMode: mode.value,
    status: "draft",
    recordedBy: input.actor.email,
    verifiedBy: null,
    verifiedAt: null,
    sourceType: null,
    sourceId: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  const participants = participantUserIds.map((userId) => ({
    id: crypto.randomUUID(),
    productionEntryId: entry.id,
    userId,
    laborEntryId: null,
  }));
  const allocations =
    mode.value === "individual" && participants.length === 1
      ? [
          {
            id: crypto.randomUUID(),
            productionEntryId: entry.id,
            userId: participants[0]!.userId,
            quantity: entry.quantity,
          },
        ]
      : [];
  if (isDemoOpsStore()) {
    const state = memory();
    state.entries.push(entry);
    state.participants.push(...participants);
    state.allocations.push(...allocations);
  } else {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(productionEntries).values(entry);
      await tx.insert(productionParticipants).values(participants);
      if (allocations.length) await tx.insert(productionAllocations).values(allocations);
    });
  }
  await audit(input.actor, access.organizationId, "production.record", entry.id, {
    jobId: entry.jobId,
    workDate: entry.workDate,
    quantity: entry.quantity,
    unit: entry.unit,
    attributionMode: entry.attributionMode,
  });
  return { ok: true, entry };
}

export async function verifyProduction(input: {
  actor: WorkforceActor;
  productionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = resolveWorkforceAccess(input.actor, "workforce.verify");
  if (!access.ok) return access;
  if (!isUuid(input.productionId)) return { ok: false, error: "That production entry was not found." };
  const current = await entryById(access.organizationId, input.productionId);
  if (!current || current.status !== "draft") {
    return { ok: false, error: "That production entry was not found." };
  }
  const participants = await participantsFor(current.id);
  if (includesActor(input.actor, participants)) {
    return { ok: false, error: "You cannot verify production that includes you." };
  }
  const now = new Date();
  if (isDemoOpsStore()) {
    const row = memory().entries.find((entry) => entry.id === current.id);
    if (!row || row.status !== "draft") return { ok: false, error: "That production entry was not found." };
    row.status = "verified";
    row.verifiedBy = input.actor.email;
    row.verifiedAt = now;
    row.updatedAt = now;
    row.version += 1;
  } else {
    const updated = await getDb()
      .update(productionEntries)
      .set({
        status: "verified",
        verifiedBy: input.actor.email,
        verifiedAt: now,
        updatedAt: now,
        version: current.version + 1,
      })
      .where(and(eq(productionEntries.id, current.id), eq(productionEntries.status, "draft")))
      .returning({ id: productionEntries.id });
    if (!updated[0]) return { ok: false, error: "That production entry was not found." };
  }
  await audit(input.actor, access.organizationId, "production.verify", current.id, {
    jobId: current.jobId,
    quantity: current.quantity,
    unit: current.unit,
  });
  return { ok: true };
}

export async function voidProduction(input: {
  actor: WorkforceActor;
  productionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = resolveWorkforceAccess(input.actor, "workforce.verify");
  if (!access.ok) return access;
  if (!isUuid(input.productionId)) return { ok: false, error: "That production entry was not found." };
  const current = await entryById(access.organizationId, input.productionId);
  if (!current || current.status === "void") {
    return { ok: false, error: "That production entry was not found." };
  }
  const participants = await participantsFor(current.id);
  if (includesActor(input.actor, participants)) {
    return { ok: false, error: "You cannot void production that includes you." };
  }
  const now = new Date();
  if (isDemoOpsStore()) {
    const row = memory().entries.find((entry) => entry.id === current.id);
    if (!row || row.status === "void") return { ok: false, error: "That production entry was not found." };
    row.status = "void";
    row.updatedAt = now;
    row.version += 1;
  } else {
    const updated = await getDb()
      .update(productionEntries)
      .set({ status: "void", updatedAt: now, version: current.version + 1 })
      .where(and(eq(productionEntries.id, current.id), ne(productionEntries.status, "void")))
      .returning({ id: productionEntries.id });
    if (!updated[0]) return { ok: false, error: "That production entry was not found." };
  }
  await audit(input.actor, access.organizationId, "production.void", current.id, {
    jobId: current.jobId,
    status: current.status,
    quantity: current.quantity,
    unit: current.unit,
  });
  return { ok: true };
}

export async function setProductionAllocation(input: {
  actor: WorkforceActor;
  productionId: string;
  userId: string;
  quantity: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = resolveWorkforceAccess(input.actor, "workforce.verify");
  if (!access.ok) return access;
  if (!isUuid(input.productionId) || !isUuid(input.userId)) {
    return { ok: false, error: "That production entry was not found." };
  }
  const current = await entryById(access.organizationId, input.productionId);
  if (!current || current.status === "void" || current.attributionMode !== "individual") {
    return { ok: false, error: "That production entry was not found." };
  }
  const participants = await participantsFor(current.id);
  if (!participants.some((row) => row.userId === input.userId)) {
    return { ok: false, error: "Choose a person on that production entry." };
  }
  if (includesActor(input.actor, participants)) {
    return { ok: false, error: "You cannot allocate production that includes you." };
  }
  const measure = parsePieceQuantity({ quantity: input.quantity, unit: current.unit });
  if (!measure.ok) return { ok: false, error: measure.error };
  const existing = isDemoOpsStore()
    ? memory().allocations.filter((row) => row.productionEntryId === current.id)
    : (
        await getDb()
          .select()
          .from(productionAllocations)
          .where(eq(productionAllocations.productionEntryId, current.id))
      ).map((row) => ({ userId: row.userId, quantity: row.quantity }));
  const nextTotal =
    existing
      .filter((row) => row.userId !== input.userId)
      .reduce((sum, row) => sum + row.quantity, 0) + measure.quantity;
  if (nextTotal > current.quantity) {
    return { ok: false, error: "Allocations cannot exceed the installed quantity." };
  }
  if (isDemoOpsStore()) {
    const state = memory();
    const index = state.allocations.findIndex(
      (row) => row.productionEntryId === current.id && row.userId === input.userId,
    );
    const allocation = {
      id: index >= 0 ? state.allocations[index]!.id : crypto.randomUUID(),
      productionEntryId: current.id,
      userId: input.userId,
      quantity: measure.quantity,
    };
    if (index >= 0) state.allocations[index] = allocation;
    else state.allocations.push(allocation);
  } else {
    const db = getDb();
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select id from production_entries where id = ${current.id} for update`);
        const existing = await tx
          .select({ userId: productionAllocations.userId, quantity: productionAllocations.quantity })
          .from(productionAllocations)
          .where(eq(productionAllocations.productionEntryId, current.id));
        const nextTotal =
          existing
            .filter((row) => row.userId !== input.userId)
            .reduce((sum, row) => sum + row.quantity, 0) + measure.quantity;
        if (nextTotal > current.quantity) {
          throw new ProductionRuleError("Allocations cannot exceed the installed quantity.");
        }
        await tx
          .insert(productionAllocations)
          .values({
            productionEntryId: current.id,
            userId: input.userId,
            quantity: measure.quantity,
          })
          .onConflictDoUpdate({
            target: [productionAllocations.productionEntryId, productionAllocations.userId],
            set: { quantity: measure.quantity },
          });
      });
    } catch (error) {
      if (error instanceof ProductionRuleError) return { ok: false, error: error.message };
      throw error;
    }
  }
  await audit(input.actor, access.organizationId, "production.allocate", current.id, {
    userId: input.userId,
    quantity: measure.quantity,
    unit: current.unit,
  });
  return { ok: true };
}

export async function approveProductionTarget(input: {
  actor: WorkforceActor;
  trade: string;
  workType: string;
  unit: string;
  basis: string;
  rate: string;
  effectiveFrom: string;
}): Promise<{ ok: true; target: ProductionTarget } | { ok: false; error: string }> {
  const access = resolveWorkforceAccess(input.actor, "workforce.verify");
  if (!access.ok) return access;
  const trade = parseWorkClassLabel(input.trade, "trade");
  if (!trade.ok) return trade;
  const workType = parseWorkClassLabel(input.workType, "work type");
  if (!workType.ok) return workType;
  const basis = parseTargetBasis(input.basis);
  if (!basis.ok) return basis;
  const rate = parseTargetRate(input.rate);
  if (!rate.ok) return rate;
  const effectiveFrom = parseWorkDate(input.effectiveFrom);
  if (!effectiveFrom.ok) return effectiveFrom;
  if (!isStatedQuantityUnit(input.unit)) {
    return { ok: false, error: "Choose bags or square feet." };
  }
  const now = new Date();
  const target: ProductionTarget = {
    id: crypto.randomUUID(),
    organizationId: access.organizationId,
    trade: trade.value,
    workType: workType.value,
    unit: input.unit,
    basis: basis.value,
    rateMilli: rate.rateMilli,
    effectiveFrom: effectiveFrom.value,
    effectiveTo: null,
    approvedBy: input.actor.email,
    approvedAt: now,
  };
  const sameClass = (row: ProductionTarget) =>
    row.organizationId === target.organizationId &&
    row.trade === target.trade &&
    row.workType === target.workType &&
    row.unit === target.unit &&
    row.basis === target.basis;
  if (isDemoOpsStore()) {
    const current = memory().targets.find((row) => sameClass(row) && row.effectiveTo == null);
    if (current && current.effectiveFrom >= target.effectiveFrom) {
      return { ok: false, error: "Choose an effective date after the current target." };
    }
    if (current) current.effectiveTo = target.effectiveFrom;
    memory().targets.push(target);
  } else {
    const db = getDb();
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`
          select id from production_targets
          where organization_id = ${target.organizationId}
            and trade = ${target.trade}
            and work_type = ${target.workType}
            and unit = ${target.unit}
            and basis = ${target.basis}
            and effective_to is null
          for update
        `);
        const currentRows = await tx
          .select()
          .from(productionTargets)
          .where(
            and(
              eq(productionTargets.organizationId, target.organizationId),
              eq(productionTargets.trade, target.trade),
              eq(productionTargets.workType, target.workType),
              eq(productionTargets.unit, target.unit),
              eq(productionTargets.basis, target.basis),
            ),
          );
        const current = currentRows.find((row) => row.effectiveTo == null);
        if (current && current.effectiveFrom >= target.effectiveFrom) {
          throw new ProductionRuleError("Choose an effective date after the current target.");
        }
        if (current) {
          await tx
            .update(productionTargets)
            .set({ effectiveTo: target.effectiveFrom })
            .where(eq(productionTargets.id, current.id));
        }
        await tx.insert(productionTargets).values(target);
      });
    } catch (error) {
      if (error instanceof ProductionRuleError) return { ok: false, error: error.message };
      if (isUniqueViolation(error)) {
        return { ok: false, error: "Choose an effective date after the current target." };
      }
      throw error;
    }
  }
  await audit(input.actor, access.organizationId, "production.target", target.id, {
    trade: target.trade,
    workType: target.workType,
    unit: target.unit,
    basis: target.basis,
    rateMilli: target.rateMilli,
    effectiveFrom: target.effectiveFrom,
  });
  return { ok: true, target };
}

export async function loadWorkforceBoard(organizationId: string, asOf: string) {
  const from = shiftWorkDate(asOf, -(WORKFORCE_WINDOWS.twentyEight - 1));
  const [facts, labor, jobs, people, dispatches] = await Promise.all([
    listProductionFacts(organizationId, from, asOf),
    listLaborRange(organizationId, from, asOf),
    listJobs(),
    listUsers(),
    listDispatches(organizationId, asOf),
  ]);
  return buildWorkforcePerformance({
    asOf,
    ...facts,
    labor,
    people: people.map((person) => ({
      userId: person.userId,
      displayName: person.displayName,
      role: person.role,
    })),
    jobs: jobs.map((job) => ({ id: job.id, name: job.name })),
    dispatches: dispatches.map((dispatch) => ({
      userId: dispatch.userId,
      jobId: dispatch.jobId,
      workDate: dispatch.workDate,
      status: dispatch.status,
    })),
  });
}
