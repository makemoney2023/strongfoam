import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  changeOrderApprovals,
  changeOrderBudgetEffects,
  changeOrders,
} from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { demoChangeOrderSeed, seedWhenDemo } from "@/lib/ops/demo-operations";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { saveDemoApprovalRule } from "@/lib/ops/demo-store";
import type { CommercialApprovalRule } from "@/lib/ops/estimate-approvals";
import { isUuid } from "@/lib/ops/job-workspace";
import {
  parseChangeOrderPrice,
  parseChangeOrderScope,
  parseScheduleImpactDays,
  planChangeOrderDecision,
  planChangeOrderDraft,
  planChangeOrderSubmit,
  planChangeOrderUpdate,
  planChangeOrderVoid,
  revisedProjectBudget,
  type ChangeOrder,
  type ChangeOrderApproval,
  type ChangeOrderBudgetEffect,
  type ChangeOrderStatus,
  CHANGE_ORDER_STATUSES,
} from "@/lib/ops/change-orders";
import type { CommercialActor } from "@/lib/ops/commercial-authorization";
import { organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  getProject,
  getProjectBudgetCents,
  listCommercialApprovalRules,
} from "@/lib/ops/store";

type Actor = CommercialActor & { email: string };

type MemoryState = {
  orders: ChangeOrder[];
  approvals: ChangeOrderApproval[];
  effects: ChangeOrderBudgetEffect[];
};

function memory(): MemoryState {
  const globalForOrders = globalThis as typeof globalThis & {
    __strongfoamChangeOrders?: MemoryState;
  };
  globalForOrders.__strongfoamChangeOrders ??= seedWhenDemo(
    () => demoChangeOrderSeed(),
    { orders: [], approvals: [], effects: [] },
  );
  return globalForOrders.__strongfoamChangeOrders;
}

export function resetChangeOrdersForTests(): void {
  const globalForOrders = globalThis as typeof globalThis & {
    __strongfoamChangeOrders?: MemoryState;
  };
  globalForOrders.__strongfoamChangeOrders = { orders: [], approvals: [], effects: [] };
}

function asStatus(value: string): ChangeOrderStatus {
  if (CHANGE_ORDER_STATUSES.includes(value as ChangeOrderStatus)) {
    return value as ChangeOrderStatus;
  }
  throw new Error("Unknown change order status.");
}

function asDecision(value: string): "approved" | "rejected" {
  if (value === "approved" || value === "rejected") return value;
  throw new Error("Unknown change order decision.");
}

async function audit(
  actor: Actor,
  organizationId: string,
  action: string,
  entityId: string,
  result: "success" | "denied" | "failure",
  payload: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent({
    organizationId,
    actor: actor.email,
    action,
    entityType: "change_order",
    entityId,
    result,
    correlationId: crypto.randomUUID(),
    payload,
  });
}

export async function getProjectChangeOrderView(
  organizationId: string,
  projectId: string,
): Promise<{
  orders: ChangeOrder[];
  approvals: ChangeOrderApproval[];
  effects: ChangeOrderBudgetEffect[];
  budget: ReturnType<typeof revisedProjectBudget>;
}> {
  const [orders, approvals, effects, originalCents] = await Promise.all([
    listChangeOrders(organizationId, projectId),
    listChangeOrderApprovals(organizationId, projectId),
    listChangeOrderBudgetEffects(organizationId, projectId),
    getProjectBudgetCents(organizationId, projectId),
  ]);
  return {
    orders,
    approvals,
    effects,
    budget: revisedProjectBudget({ originalCents, effects }),
  };
}

export async function listUnapprovedChangeOrders(
  organizationId: string,
): Promise<ChangeOrder[]> {
  const orders = await listChangeOrders(organizationId);
  return orders.filter((order) => order.status === "draft" || order.status === "pending");
}

async function listChangeOrders(
  organizationId: string,
  projectId?: string,
): Promise<ChangeOrder[]> {
  if (isDemoOpsStore()) {
    return memory()
      .orders.filter(
        (order) =>
          order.organizationId === organizationId &&
          (!projectId || order.projectId === projectId),
      )
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  }
  const rows = await getDb()
    .select()
    .from(changeOrders)
    .where(
      projectId
        ? and(
            eq(changeOrders.organizationId, organizationId),
            eq(changeOrders.projectId, projectId),
          )
        : eq(changeOrders.organizationId, organizationId),
    );
  return rows
    .map(orderFromRow)
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
}

async function listChangeOrderApprovals(
  organizationId: string,
  projectId: string,
): Promise<ChangeOrderApproval[]> {
  const orders = await listChangeOrders(organizationId, projectId);
  const ids = new Set(orders.map((order) => order.id));
  if (isDemoOpsStore()) {
    return memory().approvals.filter((approval) => ids.has(approval.changeOrderId));
  }
  if (!ids.size) return [];
  const rows = await getDb()
    .select()
    .from(changeOrderApprovals)
    .where(eq(changeOrderApprovals.organizationId, organizationId));
  return rows.filter((row) => ids.has(row.changeOrderId)).map(approvalFromRow);
}

async function listChangeOrderBudgetEffects(
  organizationId: string,
  projectId: string,
): Promise<ChangeOrderBudgetEffect[]> {
  if (isDemoOpsStore()) {
    return memory().effects.filter(
      (effect) => effect.organizationId === organizationId && effect.projectId === projectId,
    );
  }
  const rows = await getDb()
    .select()
    .from(changeOrderBudgetEffects)
    .where(
      and(
        eq(changeOrderBudgetEffects.organizationId, organizationId),
        eq(changeOrderBudgetEffects.projectId, projectId),
      ),
    );
  return rows.map(effectFromRow);
}

function orderFromRow(row: typeof changeOrders.$inferSelect): ChangeOrder {
  return {
    id: row.id,
    organizationId: row.organizationId,
    projectId: row.projectId,
    number: row.number,
    scope: row.scope,
    priceCents: row.priceCents,
    scheduleImpactDays: row.scheduleImpactDays,
    status: asStatus(row.status),
    contentHash: row.contentHash,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function approvalFromRow(row: typeof changeOrderApprovals.$inferSelect): ChangeOrderApproval {
  return {
    id: row.id,
    organizationId: row.organizationId,
    changeOrderId: row.changeOrderId,
    contentHash: row.contentHash,
    ruleId: row.ruleId,
    actorEmail: row.actorEmail,
    decision: asDecision(row.decision),
    comment: row.comment,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

function effectFromRow(
  row: typeof changeOrderBudgetEffects.$inferSelect,
): ChangeOrderBudgetEffect {
  return {
    id: row.id,
    organizationId: row.organizationId,
    projectId: row.projectId,
    changeOrderId: row.changeOrderId,
    approvalId: row.approvalId,
    contentHash: row.contentHash,
    priceCents: row.priceCents,
    scheduleImpactDays: row.scheduleImpactDays,
    createdAt: row.createdAt,
  };
}

type WriteResult = "saved" | "stale" | "conflict";

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

async function saveOrder(order: ChangeOrder, previous?: ChangeOrder): Promise<WriteResult> {
  if (isDemoOpsStore()) {
    const state = memory();
    if (!previous) {
      if (
        state.orders.some(
          (item) => item.projectId === order.projectId && item.number === order.number,
        )
      ) {
        return "conflict";
      }
      state.orders.push(order);
      return "saved";
    }
    const index = state.orders.findIndex((item) => item.id === order.id);
    const stored = index >= 0 ? state.orders[index] : undefined;
    if (
      !stored ||
      stored.status !== previous.status ||
      stored.contentHash !== previous.contentHash
    ) {
      return "stale";
    }
    state.orders[index] = order;
    return "saved";
  }
  try {
    const db = getDb();
    if (!previous) {
      await db.insert(changeOrders).values(order);
      return "saved";
    }
    const updated = await db
      .update(changeOrders)
      .set({
        scope: order.scope,
        priceCents: order.priceCents,
        scheduleImpactDays: order.scheduleImpactDays,
        status: order.status,
        contentHash: order.contentHash,
        updatedAt: order.updatedAt,
      })
      .where(
        and(
          eq(changeOrders.id, order.id),
          eq(changeOrders.organizationId, order.organizationId),
          eq(changeOrders.status, previous.status),
          eq(changeOrders.contentHash, previous.contentHash),
        ),
      )
      .returning({ id: changeOrders.id });
    return updated.length ? "saved" : "stale";
  } catch (error) {
    if (isUniqueViolation(error)) return "conflict";
    throw error;
  }
}

function writeError(result: WriteResult): string | null {
  if (result === "saved") return null;
  if (result === "conflict") return "Could not assign a change order number. Try again.";
  return "This change order changed. Review it again.";
}

export async function createChangeOrder(input: {
  actor: Actor;
  projectId: string;
  scope: string;
  price: string;
  scheduleImpactDays: string;
  now?: Date;
}): Promise<{ ok: true; order: ChangeOrder } | { ok: false; error: string }> {
  const project = await getProject(input.projectId);
  if (!project) return { ok: false, error: "That project was not found." };
  const scope = parseChangeOrderScope(input.scope);
  if (!scope.ok) return scope;
  const price = parseChangeOrderPrice(input.price);
  if (!price.ok) return price;
  const days = parseScheduleImpactDays(input.scheduleImpactDays);
  if (!days.ok) return days;
  const now = input.now ?? new Date();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existing = await listChangeOrders(project.organizationId, project.id);
    const planned = planChangeOrderDraft({
      actor: input.actor,
      project,
      existingNumbers: existing.map((order) => order.number),
      scope: scope.scope,
      priceCents: price.cents,
      scheduleImpactDays: days.days,
      now,
    });
    if (!planned.ok) return planned;
    const written = await saveOrder(planned.order);
    if (written === "conflict") continue;
    const error = writeError(written);
    if (error) return { ok: false, error };
    await audit(input.actor, planned.order.organizationId, "change_order.create", planned.order.id, "success", {
      number: planned.order.number,
      priceCents: planned.order.priceCents,
      scheduleImpactDays: planned.order.scheduleImpactDays,
      contentHash: planned.order.contentHash,
    });
    return planned;
  }
  return { ok: false, error: "Could not assign a change order number. Try again." };
}

export async function updateChangeOrderDraft(input: {
  actor: Actor;
  projectId: string;
  changeOrderId: string;
  scope: string;
  price: string;
  scheduleImpactDays: string;
  now?: Date;
}): Promise<{ ok: true; order: ChangeOrder } | { ok: false; error: string }> {
  const current = await findOwnOrder(input.actor, input.changeOrderId, input.projectId);
  if (!current) return { ok: false, error: "That change order was not found." };
  const scope = parseChangeOrderScope(input.scope);
  if (!scope.ok) return scope;
  const price = parseChangeOrderPrice(input.price);
  if (!price.ok) return price;
  const days = parseScheduleImpactDays(input.scheduleImpactDays);
  if (!days.ok) return days;
  const planned = planChangeOrderUpdate({
    actor: input.actor,
    order: current,
    scope: scope.scope,
    priceCents: price.cents,
    scheduleImpactDays: days.days,
    now: input.now ?? new Date(),
  });
  if (!planned.ok) return planned;
  const written = await saveOrder(planned.order, current);
  const error = writeError(written);
  if (error) return { ok: false, error };
  await audit(input.actor, planned.order.organizationId, "change_order.update", planned.order.id, "success", {
    priceCents: planned.order.priceCents,
    scheduleImpactDays: planned.order.scheduleImpactDays,
    contentHash: planned.order.contentHash,
  });
  return planned;
}

export async function submitChangeOrder(input: {
  actor: Actor;
  projectId: string;
  changeOrderId: string;
  now?: Date;
}): Promise<{ ok: true; order: ChangeOrder } | { ok: false; error: string }> {
  const current = await findOwnOrder(input.actor, input.changeOrderId, input.projectId);
  if (!current) return { ok: false, error: "That change order was not found." };
  const planned = planChangeOrderSubmit({
    actor: input.actor,
    order: current,
    now: input.now ?? new Date(),
  });
  if (!planned.ok) return planned;
  const written = await saveOrder(planned.order, current);
  const error = writeError(written);
  if (error) return { ok: false, error };
  await audit(input.actor, planned.order.organizationId, "change_order.submit", planned.order.id, "success", {
    number: planned.order.number,
    contentHash: planned.order.contentHash,
  });
  return planned;
}

export async function voidChangeOrder(input: {
  actor: Actor;
  projectId: string;
  changeOrderId: string;
  now?: Date;
}): Promise<{ ok: true; order: ChangeOrder } | { ok: false; error: string }> {
  const current = await findOwnOrder(input.actor, input.changeOrderId, input.projectId);
  if (!current) return { ok: false, error: "That change order was not found." };
  const planned = planChangeOrderVoid({
    actor: input.actor,
    order: current,
    now: input.now ?? new Date(),
  });
  if (!planned.ok) return planned;
  const written = await saveOrder(planned.order, current);
  const error = writeError(written);
  if (error) return { ok: false, error };
  await audit(input.actor, planned.order.organizationId, "change_order.void", planned.order.id, "success", {
    number: planned.order.number,
  });
  return planned;
}

export async function decideChangeOrder(input: {
  actor: Actor;
  projectId: string;
  changeOrderId: string;
  expectedHash: string;
  decision: "approved" | "rejected";
  comment: string;
  now?: Date;
}): Promise<{ ok: true; order: ChangeOrder } | { ok: false; error: string }> {
  const current = await findOwnOrder(input.actor, input.changeOrderId, input.projectId);
  if (!current) return { ok: false, error: "That change order was not found." };
  const rules = await rulesFor(current.organizationId);
  const saved = await persistFreshDecision({
    actor: input.actor,
    orderId: current.id,
    organizationId: current.organizationId,
    expectedHash: input.expectedHash,
    decision: input.decision,
    comment: input.comment,
    now: input.now ?? new Date(),
    rules,
  });
  if (!saved.ok) return saved;
  await audit(
    input.actor,
    current.organizationId,
    saved.order.status === "rejected" ? "change_order.reject" : "change_order.approve",
    current.id,
    "success",
    {
      decision: input.decision,
      status: saved.order.status,
      contentHash: saved.order.contentHash,
      budgetEffect: saved.budgetEffect,
    },
  );
  return { ok: true, order: saved.order };
}

async function findOwnOrder(
  actor: Actor,
  id: string,
  projectId: string,
): Promise<ChangeOrder | null> {
  const order = await findOrder(id);
  if (!order || order.projectId !== projectId) return null;
  if (order.organizationId !== organizationIdForOpsSession(actor)) return null;
  return order;
}

async function rulesFor(organizationId: string): Promise<CommercialApprovalRule[]> {
  const rules = await listCommercialApprovalRules(organizationId);
  if (rules.length || !isDemoOpsStore()) return rules;
  return [
    saveDemoApprovalRule({
      id: crypto.randomUUID(),
      organizationId,
      name: "Administrator approval",
      active: true,
      secondApproverTotalCents: null,
    }),
  ];
}

async function findOrder(id: string): Promise<ChangeOrder | null> {
  if (isDemoOpsStore()) return memory().orders.find((order) => order.id === id) ?? null;
  const rows = await getDb().select().from(changeOrders).where(eq(changeOrders.id, id)).limit(1);
  return rows[0] ? orderFromRow(rows[0]) : null;
}

async function persistFreshDecision(input: {
  actor: Actor;
  orderId: string;
  organizationId: string;
  expectedHash: string;
  decision: "approved" | "rejected";
  comment: string;
  now: Date;
  rules: CommercialApprovalRule[];
}): Promise<{ ok: true; order: ChangeOrder; budgetEffect: boolean } | { ok: false; error: string }> {
  if (isDemoOpsStore()) return writeDecision(input, memorySnapshot(input.orderId), applyMemoryDecision);
  const db = getDb();
  try {
  return await db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(changeOrders)
      .where(
        and(eq(changeOrders.id, input.orderId), eq(changeOrders.organizationId, input.organizationId)),
      )
      .for("update")
      .limit(1);
    const order = locked[0] ? orderFromRow(locked[0]) : null;
    if (!order) return { ok: false, error: "That change order was not found." };
    const approvalRows = await tx
      .select()
      .from(changeOrderApprovals)
      .where(eq(changeOrderApprovals.changeOrderId, order.id));
    const effectRows = await tx
      .select({ id: changeOrderBudgetEffects.id })
      .from(changeOrderBudgetEffects)
      .where(eq(changeOrderBudgetEffects.changeOrderId, order.id))
      .limit(1);
    return writeDecision(
      input,
      { order, approvals: approvalRows.map(approvalFromRow), hasEffect: effectRows.length > 0 },
      async (planned) => {
        const prior = approvalRows.find((row) => row.id === planned.approval.id);
        if (prior) {
          await tx
            .update(changeOrderApprovals)
            .set({
              contentHash: planned.approval.contentHash,
              ruleId: planned.approval.ruleId,
              actorEmail: planned.approval.actorEmail,
              decision: planned.approval.decision,
              comment: planned.approval.comment,
              expiresAt: planned.approval.expiresAt,
            })
            .where(eq(changeOrderApprovals.id, prior.id));
        } else {
          await tx.insert(changeOrderApprovals).values(planned.approval);
        }
        if (
          planned.order.status !== order.status ||
          planned.order.updatedAt.getTime() !== order.updatedAt.getTime()
        ) {
          const updated = await tx
            .update(changeOrders)
            .set({ status: planned.order.status, updatedAt: planned.order.updatedAt })
            .where(
              and(
                eq(changeOrders.id, order.id),
                eq(changeOrders.organizationId, order.organizationId),
                eq(changeOrders.status, order.status),
                eq(changeOrders.contentHash, order.contentHash),
              ),
            )
            .returning({ id: changeOrders.id });
          if (!updated.length) {
            throw new Error("The change order changed before the decision was saved.");
          }
        }
        if (planned.budgetEffect && !effectRows.length) {
          await tx.insert(changeOrderBudgetEffects).values(planned.budgetEffect);
        }
      },
    );
  });
  } catch (error) {
    if (
      isUniqueViolation(error) ||
      (error instanceof Error &&
        error.message === "The change order changed before the decision was saved.")
    ) {
      return { ok: false, error: "This change order changed. Review it again." };
    }
    throw error;
  }
}

function memorySnapshot(orderId: string): {
  order: ChangeOrder | null;
  approvals: ChangeOrderApproval[];
  hasEffect: boolean;
} {
  const state = memory();
  return {
    order: state.orders.find((item) => item.id === orderId) ?? null,
    approvals: state.approvals.filter((item) => item.changeOrderId === orderId),
    hasEffect: state.effects.some((item) => item.changeOrderId === orderId),
  };
}

function applyMemoryDecision(planned: {
  order: ChangeOrder;
  approval: ChangeOrderApproval;
  budgetEffect: ChangeOrderBudgetEffect | null;
}): void {
  const state = memory();
  const approvalIndex = state.approvals.findIndex((item) => item.id === planned.approval.id);
  if (approvalIndex >= 0) state.approvals[approvalIndex] = planned.approval;
  else state.approvals.push(planned.approval);
  const orderIndex = state.orders.findIndex((item) => item.id === planned.order.id);
  if (orderIndex >= 0) state.orders[orderIndex] = planned.order;
  if (
    planned.budgetEffect &&
    !state.effects.some((effect) => effect.changeOrderId === planned.order.id)
  ) {
    state.effects.push(planned.budgetEffect);
  }
}

async function writeDecision(
  input: {
    actor: Actor;
    expectedHash: string;
    decision: "approved" | "rejected";
    comment: string;
    now: Date;
    rules: CommercialApprovalRule[];
  },
  snapshot: {
    order: ChangeOrder | null;
    approvals: ChangeOrderApproval[];
    hasEffect: boolean;
  },
  apply: (planned: {
    order: ChangeOrder;
    approval: ChangeOrderApproval;
    budgetEffect: ChangeOrderBudgetEffect | null;
  }) => Promise<void> | void,
): Promise<{ ok: true; order: ChangeOrder; budgetEffect: boolean } | { ok: false; error: string }> {
  if (!snapshot.order) return { ok: false, error: "That change order was not found." };
  const planned = planChangeOrderDecision({
    actor: input.actor,
    order: snapshot.order,
    expectedHash: input.expectedHash,
    decision: input.decision,
    comment: input.comment,
    now: input.now,
    rules: input.rules,
    existing: snapshot.approvals,
  });
  if (!planned.ok) return planned;
  if (!planned.replayed && !isUuid(planned.approval.ruleId)) {
    return { ok: false, error: "An approval rule is required before this decision can be saved." };
  }
  if (!planned.replayed) {
    const effect =
      planned.budgetEffect && !snapshot.hasEffect ? planned.budgetEffect : null;
    await apply({ ...planned, budgetEffect: effect });
    return { ok: true, order: planned.order, budgetEffect: Boolean(effect) };
  }
  return { ok: true, order: planned.order, budgetEffect: false };
}
