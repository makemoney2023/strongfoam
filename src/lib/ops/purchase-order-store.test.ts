import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_JOB_ID } from "@/lib/ops/demo-data";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  listJobPurchaseOrders,
  listPurchaseAttention,
  orderPurchaseOrder,
  resetPurchaseOrdersForTests,
} from "@/lib/ops/purchase-order-store";
import { addJobFieldNote, deleteJobFieldNote, listJobFieldNotes, listJobs } from "@/lib/ops/store";

const office = {
  email: "office@strongfoam.demo",
  role: "office" as const,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
};
const field = {
  email: "field@strongfoam.demo",
  role: "field_worker" as const,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
};

async function clearTestRequests() {
  resetPurchaseOrdersForTests();
  const notes = await listJobFieldNotes(DEMO_JOB_ID, { kind: "material_request" });
  for (const note of notes) {
    if (note.body.startsWith("PO test ")) {
      await deleteJobFieldNote({
        jobId: DEMO_JOB_ID,
        noteId: note.id,
        actor: "test",
      });
    }
  }
}

async function request(body: string, quantity: number | null = null) {
  const note = await addJobFieldNote({
    jobId: DEMO_JOB_ID,
    actor: office.email,
    input: {
      kind: "material_request",
      body,
      workAreaId: null,
      taskId: null,
      quantity,
      unit: quantity ? "bags" : null,
    },
  });
  if (!note) throw new Error("Material request was not saved.");
  return note;
}

describe("purchase order store", () => {
  beforeEach(async () => {
    await clearTestRequests();
  });

  it("drafts one order per request, orders it, and releases the request on cancel", async () => {
    const bags = await request("PO test closed-cell bags", 12);
    const tape = await request("PO test seam tape");
    const closed = (await listJobs()).find((job) => job.name === "Closeout deficiency review");
    if (!closed) throw new Error("Demo closed job is missing.");

    const denied = await createPurchaseOrder({
      actor: field,
      jobId: DEMO_JOB_ID,
      supplier: "Foam supply",
      materialRequestIds: [bags.id],
    });
    expect(denied.ok).toBe(false);

    const closedOrder = await createPurchaseOrder({
      actor: office,
      jobId: closed.id,
      supplier: "Foam supply",
      materialRequestIds: [bags.id],
    });
    expect(closedOrder).toMatchObject({
      ok: false,
      error: "Closed jobs cannot take a purchase order.",
    });

    const drafted = await createPurchaseOrder({
      actor: office,
      jobId: DEMO_JOB_ID,
      supplier: "  Foam supply  ",
      note: "Deliver to the podium",
      materialRequestIds: [bags.id, tape.id],
    });
    if (!drafted.ok) throw new Error(drafted.error);
    expect(drafted.order.status).toBe("draft");
    expect(drafted.order.supplier).toBe("Foam supply");
    expect(drafted.order.lines[0]?.quantity).toBe(12);
    expect(drafted.order.lines[0]?.unit).toBe("bags");
    expect(drafted.order.lines[1]?.quantity).toBeNull();

    const duplicate = await createPurchaseOrder({
      actor: office,
      jobId: DEMO_JOB_ID,
      supplier: "Another yard",
      materialRequestIds: [bags.id],
    });
    expect(duplicate).toMatchObject({
      ok: false,
      error: "That material request is already on a purchase order.",
    });
    expect(await deleteJobFieldNote({
      jobId: DEMO_JOB_ID,
      noteId: bags.id,
      actor: office.email,
    })).toBeNull();

    const ordered = await orderPurchaseOrder({
      actor: office,
      purchaseOrderId: drafted.order.id,
    });
    if (!ordered.ok) throw new Error(ordered.error);
    expect(ordered.order.status).toBe("ordered");
    const again = await orderPurchaseOrder({
      actor: office,
      purchaseOrderId: drafted.order.id,
    });
    expect(again.ok).toBe(false);

    const cancelled = await cancelPurchaseOrder({
      actor: office,
      purchaseOrderId: drafted.order.id,
    });
    if (!cancelled.ok) throw new Error(cancelled.error);
    expect(cancelled.order.status).toBe("cancelled");
    const kept = (await listJobPurchaseOrders(STRONG_FOAM_ORGANIZATION_ID, DEMO_JOB_ID)).find(
      (order) => order.id === drafted.order.id,
    );
    expect(kept?.lines.map((line) => line.description)).toEqual([
      "PO test closed-cell bags",
      "PO test seam tape",
    ]);
    expect(kept?.lines.every((line) => line.activeMaterialRequestId === null)).toBe(true);

    const redraft = await createPurchaseOrder({
      actor: office,
      jobId: DEMO_JOB_ID,
      supplier: "Foam supply",
      materialRequestIds: [bags.id],
    });
    expect(redraft.ok).toBe(true);

    const attention = await listPurchaseAttention(STRONG_FOAM_ORGANIZATION_ID);
    expect(attention.drafts.some((draft) => draft.supplier === "Foam supply")).toBe(true);
    expect(attention.unordered.some((row) => row.noteId === bags.id)).toBe(false);
    expect(attention.unordered.some((row) => row.noteId === tape.id)).toBe(true);

    const audits = (
      globalThis as {
        __strongfoamDemoOps?: { auditEvents: { action: string; payload: { supplier?: string } }[] };
      }
    ).__strongfoamDemoOps?.auditEvents ?? [];
    const purchaseAudits = audits.filter((event) =>
      event.action.startsWith("purchase_order."),
    );
    expect(purchaseAudits.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "purchase_order.create",
        "purchase_order.order",
        "purchase_order.cancel",
      ]),
    );
    expect(purchaseAudits.every((event) => !("price" in (event.payload ?? {})))).toBe(true);
  });
});
