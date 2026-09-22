import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  changeOrderApprovals,
  changeOrderBudgetEffects,
  changeOrders,
} from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
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
  globalForOrders.__strongfoamChangeOrders ??= { orders: [], approvals: [], effects: [] };
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

async function saveOrder(order: ChangeOrder, previous?: ChangeOrder): Promise<void> {
  if (isDemoOpsStore()) {
    const state = memory();
    const index = state.orders.findIndex((item) => item.id === order.id);
    if (index >= 0) state.orders[index] = order;
    else state.orders.push(order);
    return;
  }
  const db = getDb();
  if (!previous) {
    await db.insert(changeOrders).values(order);
    return;
  }
  await db
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
    );
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
  const existing = await listChangeOrders(project.organizationId, project.id);
  const planned = planChangeOrderDraft({
    actor: input.actor,
    project,
    existingNumbers: existing.map((order) => order.number),
    scope: scope.scope,
    priceCents: price.cents,
    scheduleImpactDays: days.days,
    now: input.now ?? new Date(),
  });
  if (!planned.ok) return planned;
  await saveOrder(planned.order);
  await audit(input.actor, planned.order.organizationId, "change_order.create", planned.order.id, "success", {
    number: planned.order.number,
    priceCents: planned.order.priceCents,
    scheduleImpactDays: planned.order.scheduleImpactDays,
    contentHash: planned.order.contentHash,
  });
  return planned;
}

export async function updateChangeOrderDraft(input: {
  actor: Actor;
  changeOrderId: string;
  scope: string;
  price: string;
  scheduleImpactDays: string;
  now?: Date;
}): Promise<{ ok: true; order: ChangeOrder } | { ok: false; error: string }> {
  const current = await findOrder(input.changeOrderId);
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
  await saveOrder(planned.order, current);
  await audit(input.actor, planned.order.organizationId, "change_order.update", planned.order.id, "success", {
    priceCents: planned.order.priceCents,
    scheduleImpactDays: planned.order.scheduleImpactDays,
    contentHash: planned.order.contentHash,
  });
  return planned;
}

export async function submitChangeOrder(input: {
  actor: Actor;
  changeOrderId: string;
  now?: Date;
}): Promise<{ ok: true; order: ChangeOrder } | { ok: false; error: string }> {
  const current = await findOrder(input.changeOrderId);
  if (!current) return { ok: false, error: "That change order was not found." };
  const planned = planChangeOrderSubmit({
    actor: input.actor,
    order: current,
    now: input.now ?? new Date(),
  });
  if (!planned.ok) return planned;
  await saveOrder(planned.order, current);
  await audit(input.actor, planned.order.organizationId, "change_order.submit", planned.order.id, "success", {
    number: planned.order.number,
    contentHash: planned.order.contentHash,
  });
  return planned;
}

export async function voidChangeOrder(input: {
  actor: Actor;
  changeOrderId: string;
  now?: Date;
}): Promise<{ ok: true; order: ChangeOrder } | { ok: false; error: string }> {
  const current = await findOrder(input.changeOrderId);
  if (!current) return { ok: false, error: "That change order was not found." };
  const planned = planChangeOrderVoid({
    actor: input.actor,
    order: current,
    now: input.now ?? new Date(),
  });
  if (!planned.ok) return planned;
  await saveOrder(planned.order, current);
  await audit(input.actor, planned.order.organizationId, "change_order.void", planned.order.id, "success", {
    number: planned.order.number,
  });
  return planned;
}

export async function decideChangeOrder(input: {
  actor: Actor;
  changeOrderId: string;
  expectedHash: string;
  decision: "approved" | "rejected";
  comment: string;
  now?: Date;
}): Promise<{ ok: true; order: ChangeOrder } | { ok: false; error: string }> {
  const current = await findOrder(input.changeOrderId);
  if (!current) return { ok: false, error: "That change order was not found." };
  const [rules, existing] = await Promise.all([
    listCommercialApprovalRules(current.organizationId),
    approvalsFor(current.id),
  ]);
  const planned = planChangeOrderDecision({
    actor: input.actor,
    order: current,
    expectedHash: input.expectedHash,
    decision: input.decision,
    comment: input.comment,
    now: input.now ?? new Date(),
    rules,
    existing,
  });
  if (!planned.ok) return planned;
  if (!isDemoOpsStore() && !planned.replayed && !isUuid(planned.approval.ruleId)) {
    return { ok: false, error: "An approval rule is required before this decision can be saved." };
  }
  if (!planned.replayed) await persistDecision(current, planned);
  await audit(
    input.actor,
    current.organizationId,
    planned.order.status === "rejected" ? "change_order.reject" : "change_order.approve",
    current.id,
    "success",
    {
      decision: input.decision,
      status: planned.order.status,
      contentHash: current.contentHash,
      budgetEffect: Boolean(planned.budgetEffect),
    },
  );
  return { ok: true, order: planned.order };
}

async function findOrder(id: string): Promise<ChangeOrder | null> {
  if (isDemoOpsStore()) return memory().orders.find((order) => order.id === id) ?? null;
  const rows = await getDb().select().from(changeOrders).where(eq(changeOrders.id, id)).limit(1);
  return rows[0] ? orderFromRow(rows[0]) : null;
}

async function approvalsFor(changeOrderId: string): Promise<ChangeOrderApproval[]> {
  if (isDemoOpsStore()) {
    return memory().approvals.filter((approval) => approval.changeOrderId === changeOrderId);
  }
  const rows = await getDb()
    .select()
    .from(changeOrderApprovals)
    .where(eq(changeOrderApprovals.changeOrderId, changeOrderId));
  return rows.map(approvalFromRow);
}

async function persistDecision(
  previous: ChangeOrder,
  planned: {
    order: ChangeOrder;
    approval: ChangeOrderApproval;
    budgetEffect: ChangeOrderBudgetEffect | null;
  },
): Promise<void> {
  if (isDemoOpsStore()) {
    const state = memory();
    if (!state.approvals.some((item) => item.id === planned.approval.id)) {
      state.approvals.push(planned.approval);
    }
    const index = state.orders.findIndex((item) => item.id === planned.order.id);
    if (index >= 0) state.orders[index] = planned.order;
    if (
      planned.budgetEffect &&
      !state.effects.some((effect) => effect.changeOrderId === planned.order.id)
    ) {
      state.effects.push(planned.budgetEffect);
    }
    return;
  }
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.insert(changeOrderApprovals).values(planned.approval);
    if (planned.order.status !== previous.status) {
      const updated = await tx
        .update(changeOrders)
        .set({ status: planned.order.status, updatedAt: planned.order.updatedAt })
        .where(
          and(
            eq(changeOrders.id, previous.id),
            eq(changeOrders.organizationId, previous.organizationId),
            eq(changeOrders.status, previous.status),
            eq(changeOrders.contentHash, previous.contentHash),
          ),
        )
        .returning({ id: changeOrders.id });
      if (!updated.length) throw new Error("The change order changed before the decision was saved.");
    }
    if (planned.budgetEffect) {
      await tx.insert(changeOrderBudgetEffects).values(planned.budgetEffect);
    }
  });
}
