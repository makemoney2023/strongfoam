import {
  FIELD_QUANTITY_LABELS,
  isFieldQuantityUnit,
  type FieldQuantityUnit,
} from "@/lib/ops/field-workspace";
import { isUuid } from "@/lib/ops/job-workspace";

export const PURCHASE_ORDER_STATUSES = ["draft", "ordered", "cancelled"] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_SUPPLIER_LIMIT = 120;
export const PURCHASE_NOTE_LIMIT = 500;
export const PURCHASE_LINE_LIMIT = 40;
export const PURCHASE_DESCRIPTION_LIMIT = 4_000;

export type PurchaseOrder = {
  id: string;
  organizationId: string;
  jobId: string;
  supplier: string;
  note: string;
  status: PurchaseOrderStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseOrderLine = {
  id: string;
  organizationId: string;
  purchaseOrderId: string;
  materialRequestId: string;
  activeMaterialRequestId: string | null;
  description: string;
  quantity: number | null;
  unit: "" | FieldQuantityUnit;
  position: number;
};

export type PurchaseOrderView = PurchaseOrder & {
  lines: PurchaseOrderLine[];
};

export function purchaseOrderStatusLabel(status: PurchaseOrderStatus): string {
  if (status === "draft") return "Draft";
  if (status === "ordered") return "Ordered";
  return "Cancelled";
}

export function parseSupplier(
  value: string | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const supplier = (value ?? "").trim().replace(/\s+/g, " ");
  if (!supplier) return { ok: false, error: "Enter a supplier." };
  if (supplier.length > PURCHASE_SUPPLIER_LIMIT) {
    return {
      ok: false,
      error: `Keep the supplier under ${PURCHASE_SUPPLIER_LIMIT} characters.`,
    };
  }
  return { ok: true, value: supplier };
}

export function parsePurchaseNote(
  value: string | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const note = (value ?? "").trim().replace(/\s+/g, " ");
  if (note.length > PURCHASE_NOTE_LIMIT) {
    return {
      ok: false,
      error: `Keep the note under ${PURCHASE_NOTE_LIMIT} characters.`,
    };
  }
  return { ok: true, value: note };
}

export function parseMaterialRequestIds(
  values: string[],
): { ok: true; ids: string[] } | { ok: false; error: string } {
  const ids = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { ok: false, error: "Choose at least one material request." };
  }
  if (ids.length > PURCHASE_LINE_LIMIT) {
    return {
      ok: false,
      error: `Choose no more than ${PURCHASE_LINE_LIMIT} material requests.`,
    };
  }
  if (ids.some((id) => !isUuid(id))) {
    return { ok: false, error: "That material request was not found." };
  }
  return { ok: true, ids };
}

export function formatPurchaseLine(
  line: Pick<PurchaseOrderLine, "description" | "quantity" | "unit">,
): string {
  if (line.quantity && line.unit && isFieldQuantityUnit(line.unit)) {
    return `${line.description} · ${line.quantity} ${FIELD_QUANTITY_LABELS[line.unit].toLowerCase()}`;
  }
  return line.description;
}

export type PurchaseDraftAttention = {
  id: string;
  jobId: string;
  jobName: string;
  supplier: string;
  lineCount: number;
};

export type UnorderedMaterialAttention = {
  noteId: string;
  jobId: string;
  jobName: string;
  description: string;
};

export function buildPurchaseAttention(input: {
  organizationId: string;
  jobs: { id: string; name: string; status: string; organizationId: string }[];
  requests: { id: string; jobId: string; body: string }[];
  orders: PurchaseOrder[];
  lines: PurchaseOrderLine[];
}): {
  drafts: PurchaseDraftAttention[];
  unordered: UnorderedMaterialAttention[];
} {
  const jobs = new Map(
    input.jobs
      .filter((job) => job.organizationId === input.organizationId)
      .map((job) => [job.id, job]),
  );
  const claimed = new Set(
    input.lines
      .filter(
        (line) =>
          line.organizationId === input.organizationId &&
          line.activeMaterialRequestId,
      )
      .map((line) => line.activeMaterialRequestId as string),
  );
  const lineCount = new Map<string, number>();
  for (const line of input.lines) {
    if (line.organizationId !== input.organizationId) continue;
    lineCount.set(line.purchaseOrderId, (lineCount.get(line.purchaseOrderId) ?? 0) + 1);
  }
  const drafts = input.orders
    .filter(
      (order) =>
        order.organizationId === input.organizationId &&
        order.status === "draft" &&
        jobs.has(order.jobId),
    )
    .map((order) => ({
      id: order.id,
      jobId: order.jobId,
      jobName: jobs.get(order.jobId)?.name ?? "Unknown job",
      supplier: order.supplier,
      lineCount: lineCount.get(order.id) ?? 0,
    }))
    .sort(
      (left, right) =>
        left.jobName.localeCompare(right.jobName) ||
        left.supplier.localeCompare(right.supplier),
    );
  const unordered = input.requests
    .filter((request) => {
      const job = jobs.get(request.jobId);
      return (
        job &&
        job.status !== "closed" &&
        request.body.trim() &&
        !claimed.has(request.id)
      );
    })
    .map((request) => ({
      noteId: request.id,
      jobId: request.jobId,
      jobName: jobs.get(request.jobId)?.name ?? "Unknown job",
      description: request.body.trim(),
    }))
    .sort(
      (left, right) =>
        left.jobName.localeCompare(right.jobName) ||
        left.description.localeCompare(right.description),
    );
  return { drafts, unordered };
}
