import { describe, expect, it } from "vitest";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import {
  buildPurchaseAttention,
  formatPurchaseLine,
  parseMaterialRequestIds,
  parseSupplier,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from "@/lib/ops/purchase-order";
import { resolvePurchaseAccess } from "@/lib/ops/purchase-order-authorization";

const org = STRONG_FOAM_ORGANIZATION_ID;
const jobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const noteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function order(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId: org,
    jobId,
    supplier: "Foam supply",
    note: "",
    status: "draft",
    createdBy: "office@strongfoam.demo",
    createdAt: new Date("2026-09-23T12:00:00.000Z"),
    updatedAt: new Date("2026-09-23T12:00:00.000Z"),
    ...overrides,
  };
}

function line(overrides: Partial<PurchaseOrderLine> = {}): PurchaseOrderLine {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    organizationId: org,
    purchaseOrderId: "11111111-1111-4111-8111-111111111111",
    materialRequestId: noteId,
    activeMaterialRequestId: noteId,
    description: "Closed-cell bags",
    quantity: 12,
    unit: "bags",
    position: 1,
    ...overrides,
  };
}

describe("purchase orders", () => {
  it("requires a supplier and at least one material request", () => {
    expect(parseSupplier("  Foam supply  ")).toEqual({ ok: true, value: "Foam supply" });
    expect(parseSupplier("  ").ok).toBe(false);
    expect(parseSupplier("x".repeat(121)).ok).toBe(false);
    const ids = parseMaterialRequestIds([noteId, noteId]);
    if (!ids.ok) throw new Error(ids.error);
    expect(ids.ids).toEqual([noteId]);
    expect(parseMaterialRequestIds([""]).ok).toBe(false);
  });

  it("lets office draft an order and keeps field users on read", () => {
    expect(resolvePurchaseAccess({ role: "office" }, "purchase_order.edit").ok).toBe(true);
    expect(resolvePurchaseAccess({ role: "field_worker" }, "purchase_order.edit").ok).toBe(
      false,
    );
    expect(resolvePurchaseAccess({ role: "field_worker" }, "purchase_order.read").ok).toBe(
      true,
    );
    expect(resolvePurchaseAccess({ role: "estimator" }, "purchase_order.edit").ok).toBe(true);
  });

  it("lists drafts and material requests that are not already claimed", () => {
    const attention = buildPurchaseAttention({
      organizationId: org,
      jobs: [
        { id: jobId, name: "North elevation", status: "in_progress", organizationId: org },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
          name: "Closed review",
          status: "closed",
          organizationId: org,
        },
      ],
      requests: [
        { id: noteId, jobId, body: "Closed-cell bags" },
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          jobId,
          body: "Seam tape",
        },
        {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          jobId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
          body: "Old bags",
        },
      ],
      orders: [order()],
      lines: [line()],
    });
    expect(attention.drafts).toEqual([
      {
        id: order().id,
        jobId,
        jobName: "North elevation",
        supplier: "Foam supply",
        lineCount: 1,
      },
    ]);
    expect(attention.unordered.map((row) => row.description)).toEqual(["Seam tape"]);
    expect(formatPurchaseLine(line())).toBe("Closed-cell bags · 12 bags");
  });
});
