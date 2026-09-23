import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { jobFieldNotes, jobs, purchaseOrderLines, purchaseOrders } from "@/db/schema";
import { recordAuditEvent } from "@/lib/ops/audit";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { dispatchableJobStatus } from "@/lib/ops/dispatch";
import {
  isFieldQuantityUnit,
  type FieldQuantityUnit,
} from "@/lib/ops/field-workspace";
import { isUuid } from "@/lib/ops/job-workspace";
import {
  materialRequestIsCited,
  purchaseOrderMemory,
  resetPurchaseOrderMemory,
} from "@/lib/ops/purchase-order-access";
import {
  resolvePurchaseAccess,
  type PurchaseActor,
} from "@/lib/ops/purchase-order-authorization";
import {
  buildPurchaseAttention,
  parseMaterialRequestIds,
  parsePurchaseNote,
  parseSupplier,
  type PurchaseDraftAttention,
  type PurchaseOrder,
  type PurchaseOrderLine,
  type PurchaseOrderStatus,
  type PurchaseOrderView,
  type UnorderedMaterialAttention,
} from "@/lib/ops/purchase-order";
import { getJob, listJobFieldNotes, listJobs } from "@/lib/ops/store";

export function resetPurchaseOrdersForTests(): void {
  resetPurchaseOrderMemory();
}

export { materialRequestIsCited };

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

function asStatus(value: string): PurchaseOrderStatus {
  if (value === "draft" || value === "ordered" || value === "cancelled") return value;
  throw new Error("Unknown purchase order status.");
}

function asUnit(value: string): "" | FieldQuantityUnit {
  return value === "" || isFieldQuantityUnit(value) ? value : "";
}

function orderFromRow(row: typeof purchaseOrders.$inferSelect): PurchaseOrder {
  return {
    id: row.id,
    organizationId: row.organizationId,
    jobId: row.jobId,
    supplier: row.supplier,
    note: row.note,
    status: asStatus(row.status),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function lineFromRow(row: typeof purchaseOrderLines.$inferSelect): PurchaseOrderLine {
  return {
    id: row.id,
    organizationId: row.organizationId,
    purchaseOrderId: row.purchaseOrderId,
    materialRequestId: row.materialRequestId,
    activeMaterialRequestId: row.activeMaterialRequestId,
    description: row.description,
    quantity: row.quantity,
    unit: asUnit(row.unit),
    position: row.position,
  };
}

function withLines(orders: PurchaseOrder[], lines: PurchaseOrderLine[]): PurchaseOrderView[] {
  return orders
    .map((order) => ({
      ...order,
      lines: lines
        .filter((line) => line.purchaseOrderId === order.id)
        .sort((left, right) => left.position - right.position),
    }))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

async function audit(
  actor: PurchaseActor,
  organizationId: string,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await recordAuditEvent({
    organizationId,
    actor: actor.email,
    action,
    entityType: "purchase_order",
    entityId,
    result: "success",
    correlationId: crypto.randomUUID(),
    payload,
  });
}

async function linesFor(
  organizationId: string,
  orderIds: string[],
): Promise<PurchaseOrderLine[]> {
  if (orderIds.length === 0) return [];
  if (isDemoOpsStore()) {
    return purchaseOrderMemory().lines.filter(
      (line) =>
        line.organizationId === organizationId &&
        orderIds.includes(line.purchaseOrderId),
    );
  }
  const rows = await getDb()
    .select()
    .from(purchaseOrderLines)
    .where(
      and(
        eq(purchaseOrderLines.organizationId, organizationId),
        inArray(purchaseOrderLines.purchaseOrderId, orderIds),
      ),
    );
  return rows.map(lineFromRow);
}

export async function listJobPurchaseOrders(
  organizationId: string,
  jobId: string,
): Promise<PurchaseOrderView[]> {
  if (isDemoOpsStore()) {
    const orders = purchaseOrderMemory().orders.filter(
      (order) => order.organizationId === organizationId && order.jobId === jobId,
    );
    const lines = await linesFor(
      organizationId,
      orders.map((order) => order.id),
    );
    return withLines(orders, lines);
  }
  const rows = await getDb()
    .select()
    .from(purchaseOrders)
    .where(
      and(eq(purchaseOrders.organizationId, organizationId), eq(purchaseOrders.jobId, jobId)),
    );
  const orders = rows.map(orderFromRow);
  const lines = await linesFor(
    organizationId,
    orders.map((order) => order.id),
  );
  return withLines(orders, lines);
}

async function findOrder(
  organizationId: string,
  purchaseOrderId: string,
): Promise<PurchaseOrder | null> {
  if (isDemoOpsStore()) {
    return (
      purchaseOrderMemory().orders.find(
        (order) => order.id === purchaseOrderId && order.organizationId === organizationId,
      ) ?? null
    );
  }
  const rows = await getDb()
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, purchaseOrderId),
        eq(purchaseOrders.organizationId, organizationId),
      ),
    )
    .limit(1);
  return rows[0] ? orderFromRow(rows[0]) : null;
}

export async function listPurchaseAttention(organizationId: string): Promise<{
  drafts: PurchaseDraftAttention[];
  unordered: UnorderedMaterialAttention[];
}> {
  if (isDemoOpsStore()) {
    const state = purchaseOrderMemory();
    const jobRows = (await listJobs()).filter(
      (job) => job.organizationId === organizationId,
    );
    const requests = (
      await Promise.all(
        jobRows.map(async (job) =>
          (await listJobFieldNotes(job.id, { kind: "material_request" })).map((note) => ({
            id: note.id,
            jobId: job.id,
            body: note.body,
          })),
        ),
      )
    ).flat();
    return buildPurchaseAttention({
      organizationId,
      jobs: jobRows,
      requests,
      orders: state.orders,
      lines: state.lines,
    });
  }
  const db = getDb();
  const [orderRows, requestRows, lineRows] = await Promise.all([
    db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.organizationId, organizationId)),
    db
      .select({
        id: jobFieldNotes.id,
        jobId: jobFieldNotes.jobId,
        body: jobFieldNotes.body,
        jobName: jobs.name,
        jobStatus: jobs.status,
        organizationId: jobs.organizationId,
      })
      .from(jobFieldNotes)
      .innerJoin(jobs, eq(jobFieldNotes.jobId, jobs.id))
      .where(
        and(
          eq(jobs.organizationId, organizationId),
          eq(jobFieldNotes.kind, "material_request"),
          ne(jobs.status, "closed"),
        ),
      ),
    db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.organizationId, organizationId)),
  ]);
  const jobMap = new Map<string, { id: string; name: string; status: string; organizationId: string }>();
  for (const row of requestRows) {
    jobMap.set(row.jobId, {
      id: row.jobId,
      name: row.jobName,
      status: row.jobStatus,
      organizationId: row.organizationId,
    });
  }
  for (const order of orderRows) {
    if (!jobMap.has(order.jobId)) {
      const job = await getJob(order.jobId);
      if (job) {
        jobMap.set(job.id, {
          id: job.id,
          name: job.name,
          status: job.status,
          organizationId: job.organizationId,
        });
      }
    }
  }
  return buildPurchaseAttention({
    organizationId,
    jobs: [...jobMap.values()],
    requests: requestRows,
    orders: orderRows.map(orderFromRow),
    lines: lineRows.map(lineFromRow),
  });
}

const ALREADY = "That material request is already on a purchase order.";

export async function createPurchaseOrder(input: {
  actor: PurchaseActor;
  jobId: string;
  supplier?: string;
  note?: string;
  materialRequestIds: string[];
}): Promise<{ ok: true; order: PurchaseOrderView } | { ok: false; error: string }> {
  const access = resolvePurchaseAccess(input.actor, "purchase_order.edit");
  if (!access.ok) return access;
  if (!isUuid(input.jobId)) return { ok: false, error: "That job was not found." };
  const job = await getJob(input.jobId);
  if (!job || job.organizationId !== access.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!dispatchableJobStatus(job.status)) {
    return { ok: false, error: "Closed jobs cannot take a purchase order." };
  }
  const supplier = parseSupplier(input.supplier);
  if (!supplier.ok) return supplier;
  const note = parsePurchaseNote(input.note);
  if (!note.ok) return note;
  const requestIds = parseMaterialRequestIds(input.materialRequestIds);
  if (!requestIds.ok) return requestIds;

  const notes = await listJobFieldNotes(job.id, { kind: "material_request" });
  const byId = new Map(notes.map((item) => [item.id, item]));
  const selected = requestIds.ids.map((id) => byId.get(id));
  if (selected.some((item) => !item || !item.body.trim())) {
    return { ok: false, error: "That material request was not found." };
  }

  const now = new Date();
  const order: PurchaseOrder = {
    id: crypto.randomUUID(),
    organizationId: access.organizationId,
    jobId: job.id,
    supplier: supplier.value,
    note: note.value,
    status: "draft",
    createdBy: input.actor.email,
    createdAt: now,
    updatedAt: now,
  };
  const lines: PurchaseOrderLine[] = selected.map((item, index) => {
    const noteRow = item!;
    const unit =
      noteRow.unit && isFieldQuantityUnit(noteRow.unit) ? noteRow.unit : "";
    const quantity =
      unit && noteRow.quantity && noteRow.quantity > 0 ? noteRow.quantity : null;
    return {
      id: crypto.randomUUID(),
      organizationId: access.organizationId,
      purchaseOrderId: order.id,
      materialRequestId: noteRow.id,
      activeMaterialRequestId: noteRow.id,
      description: noteRow.body.trim().slice(0, 4000),
      quantity,
      unit: quantity ? unit : "",
      position: index + 1,
    };
  });

  if (isDemoOpsStore()) {
    const state = purchaseOrderMemory();
    const claimed = new Set(
      state.lines
        .filter((line) => line.organizationId === access.organizationId)
        .map((line) => line.activeMaterialRequestId)
        .filter((id): id is string => Boolean(id)),
    );
    if (lines.some((line) => claimed.has(line.materialRequestId))) {
      return { ok: false, error: ALREADY };
    }
    state.orders.push(order);
    state.lines.push(...lines);
  } else {
    try {
      await getDb().transaction(async (tx) => {
        await tx.insert(purchaseOrders).values(order);
        await tx.insert(purchaseOrderLines).values(lines);
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { ok: false, error: ALREADY };
      throw error;
    }
  }

  await audit(input.actor, access.organizationId, "purchase_order.create", order.id, {
    jobId: order.jobId,
    supplier: order.supplier,
    status: order.status,
    lineCount: lines.length,
  });
  return { ok: true, order: { ...order, lines } };
}

export async function orderPurchaseOrder(input: {
  actor: PurchaseActor;
  purchaseOrderId: string;
}): Promise<{ ok: true; order: PurchaseOrder } | { ok: false; error: string }> {
  const access = resolvePurchaseAccess(input.actor, "purchase_order.edit");
  if (!access.ok) return access;
  if (!isUuid(input.purchaseOrderId)) {
    return { ok: false, error: "That purchase order was not found." };
  }
  const current = await findOrder(access.organizationId, input.purchaseOrderId);
  if (!current) return { ok: false, error: "That purchase order was not found." };
  if (current.status !== "draft") {
    return { ok: false, error: "Only a draft can be ordered." };
  }
  const job = await getJob(current.jobId);
  if (!job || job.organizationId !== access.organizationId) {
    return { ok: false, error: "That job was not found." };
  }
  if (!dispatchableJobStatus(job.status)) {
    return { ok: false, error: "Closed jobs cannot take a purchase order." };
  }
  const now = new Date();
  const next: PurchaseOrder = { ...current, status: "ordered", updatedAt: now };
  if (isDemoOpsStore()) {
    const state = purchaseOrderMemory();
    const index = state.orders.findIndex((order) => order.id === current.id);
    const row = index >= 0 ? state.orders[index] : undefined;
    if (!row || row.status !== "draft") {
      return { ok: false, error: "Only a draft can be ordered." };
    }
    state.orders[index] = next;
  } else {
    const updated = await getDb()
      .update(purchaseOrders)
      .set({ status: "ordered", updatedAt: now })
      .where(
        and(
          eq(purchaseOrders.id, current.id),
          eq(purchaseOrders.organizationId, access.organizationId),
          eq(purchaseOrders.status, "draft"),
        ),
      )
      .returning();
    if (!updated[0]) return { ok: false, error: "Only a draft can be ordered." };
  }
  const lineCount = (await linesFor(access.organizationId, [next.id])).length;
  await audit(input.actor, access.organizationId, "purchase_order.order", next.id, {
    jobId: next.jobId,
    supplier: next.supplier,
    status: next.status,
    lineCount,
  });
  return { ok: true, order: next };
}

export async function cancelPurchaseOrder(input: {
  actor: PurchaseActor;
  purchaseOrderId: string;
}): Promise<{ ok: true; order: PurchaseOrder } | { ok: false; error: string }> {
  const access = resolvePurchaseAccess(input.actor, "purchase_order.edit");
  if (!access.ok) return access;
  if (!isUuid(input.purchaseOrderId)) {
    return { ok: false, error: "That purchase order was not found." };
  }
  const current = await findOrder(access.organizationId, input.purchaseOrderId);
  if (!current) return { ok: false, error: "That purchase order was not found." };
  if (current.status === "cancelled") {
    return { ok: false, error: "That purchase order is already cancelled." };
  }
  const now = new Date();
  const next: PurchaseOrder = { ...current, status: "cancelled", updatedAt: now };
  if (isDemoOpsStore()) {
    const state = purchaseOrderMemory();
    const index = state.orders.findIndex((order) => order.id === current.id);
    const row = index >= 0 ? state.orders[index] : undefined;
    if (!row || row.status === "cancelled") {
      return { ok: false, error: "That purchase order is already cancelled." };
    }
    state.orders[index] = next;
    state.lines = state.lines.map((line) =>
      line.purchaseOrderId === next.id
        ? { ...line, activeMaterialRequestId: null }
        : line,
    );
  } else {
    const updated = await getDb().transaction(async (tx) => {
      const rows = await tx
        .update(purchaseOrders)
        .set({ status: "cancelled", updatedAt: now })
        .where(
          and(
            eq(purchaseOrders.id, current.id),
            eq(purchaseOrders.organizationId, access.organizationId),
            inArray(purchaseOrders.status, ["draft", "ordered"]),
          ),
        )
        .returning();
      if (!rows[0]) return null;
      await tx
        .update(purchaseOrderLines)
        .set({ activeMaterialRequestId: null })
        .where(eq(purchaseOrderLines.purchaseOrderId, current.id));
      return rows[0];
    });
    if (!updated) {
      return { ok: false, error: "That purchase order is already cancelled." };
    }
  }
  const lineCount = (await linesFor(access.organizationId, [next.id])).length;
  await audit(input.actor, access.organizationId, "purchase_order.cancel", next.id, {
    jobId: next.jobId,
    supplier: next.supplier,
    status: next.status,
    lineCount,
  });
  return { ok: true, order: next };
}
