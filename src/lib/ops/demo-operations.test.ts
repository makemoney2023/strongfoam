import { afterEach, describe, expect, it } from "vitest";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { changeOrderContentHash } from "@/lib/ops/change-orders";
import { resetChangeOrdersForTests } from "@/lib/ops/change-order-store";
import {
  DEMO_FIELD_USER_ID,
  DEMO_JOB_ID,
  DEMO_MATERIAL_REQUEST_OPEN_ID,
  DEMO_ORGANIZATION_ID,
  DEMO_SCHEDULE_NOW,
  demoJobFieldNotes,
} from "@/lib/ops/demo-data";
import {
  demoChangeOrderSeed,
  demoDispatchSeed,
  demoEquipmentSeed,
  demoInspectionSeed,
  demoLaborSeed,
  demoOperationsAsOf,
  demoProductionSeed,
  demoPurchaseSeed,
} from "@/lib/ops/demo-operations";
import { DISPATCH_TIME_ZONE } from "@/lib/ops/dispatch";
import { resetDispatchMemory } from "@/lib/ops/dispatch-access";
import { buildEquipmentAttention } from "@/lib/ops/equipment";
import { equipmentMemory, resetEquipmentMemory } from "@/lib/ops/equipment-access";
import { buildInspectionAttention } from "@/lib/ops/inspection";
import { inspectionMemory, resetInspectionMemory } from "@/lib/ops/inspection-access";
import { isUuid } from "@/lib/ops/job-workspace";
import { resetLaborForTests } from "@/lib/ops/labor-store";
import { resetProductionForTests } from "@/lib/ops/production-store";
import { buildPurchaseAttention } from "@/lib/ops/purchase-order";
import { purchaseOrderMemory, resetPurchaseOrderMemory } from "@/lib/ops/purchase-order-access";
import { listJobs } from "@/lib/ops/store";
import { buildWorkforcePerformance } from "@/lib/ops/workforce-performance";

afterEach(() => {
  resetEquipmentMemory();
  resetPurchaseOrderMemory();
  resetDispatchMemory();
  resetLaborForTests();
  resetProductionForTests();
  resetChangeOrdersForTests();
  resetInspectionMemory();
});

describe("demo operations sample", () => {
  it("fills purchasing, equipment, labor, dispatch, production, and change orders", async () => {
    const asOf = workingDayLabel(new Date(DEMO_SCHEDULE_NOW), DISPATCH_TIME_ZONE);
    expect(demoOperationsAsOf()).toBe(asOf);

    const purchase = demoPurchaseSeed();
    const notes = demoJobFieldNotes();
    const jobs = (await listJobs()).map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      organizationId: job.organizationId,
    }));
    const attention = buildPurchaseAttention({
      organizationId: DEMO_ORGANIZATION_ID,
      jobs,
      requests: notes
        .filter((note) => note.kind === "material_request")
        .map((note) => ({ id: note.id, jobId: note.jobId, body: note.body })),
      orders: purchase.orders,
      lines: purchase.lines,
    });
    expect(attention.drafts.map((draft) => draft.supplier)).toEqual(["Spray Foam Distributors"]);
    expect(attention.unordered.map((row) => row.noteId)).toEqual([DEMO_MATERIAL_REQUEST_OPEN_ID]);

    const conflicts = buildEquipmentAttention({
      organizationId: DEMO_ORGANIZATION_ID,
      jobs,
      assignments: demoEquipmentSeed(),
    });
    expect(conflicts.map((conflict) => conflict.name)).toEqual(["Graco E-30"]);
    expect(conflicts[0]?.jobs.map((job) => job.name).sort()).toEqual([
      "Mechanical room fireproofing",
      "North elevation spray foam",
    ]);

    expect(demoDispatchSeed().map((row) => row.workDate)).toEqual([asOf]);
    expect(demoLaborSeed().some((row) => row.workDate === asOf && row.kind === "hourly")).toBe(true);

    const production = demoProductionSeed();
    const board = buildWorkforcePerformance({
      asOf,
      ...production,
      labor: demoLaborSeed(),
      people: [{ userId: DEMO_FIELD_USER_ID, displayName: "Jordan Field", role: "field_worker" }],
      jobs: jobs.map((job) => ({ id: job.id, name: job.name })),
      dispatches: demoDispatchSeed(),
    });
    const jordan = board.workers.find((worker) => worker.userId === DEMO_FIELD_USER_ID);
    expect(jordan?.twentyEightDay.shifts).toBe(3);
    expect(jordan?.twentyEightDay.efficiency).toBe(100);
    expect(board.crews).toHaveLength(1);
    expect(board.crews[0]?.efficiency).toBeCloseTo((40 / 6 / 8) * 100);
    expect(board.drafts.map((draft) => draft.quantity)).toEqual([36]);
    expect(board.exceptions.some((row) => row.kind === "awaiting_review")).toBe(true);
    expect(board.exceptions.some((row) => row.kind === "missing_production")).toBe(false);

    const orders = demoChangeOrderSeed();
    expect(orders.orders.map((order) => order.status)).toEqual(["draft", "pending", "approved"]);
    for (const order of orders.orders) {
      expect(order.contentHash).toBe(
        changeOrderContentHash({
          scope: order.scope,
          priceCents: order.priceCents,
          scheduleImpactDays: order.scheduleImpactDays,
        }),
      );
    }
    expect(orders.effects).toHaveLength(1);

    const inspectionAttention = buildInspectionAttention({
      organizationId: DEMO_ORGANIZATION_ID,
      jobs,
      inspections: demoInspectionSeed(),
    });
    expect(inspectionAttention.map((item) => `${item.result}:${item.name}:${item.jobName}`)).toEqual([
      "failed:Podium deck thickness:North elevation spray foam",
      "open:Concrete cure:Loading dock air barrier",
      "open:Fireproofing adhesion:Mechanical room fireproofing",
      "open:Lift inspection:North elevation spray foam",
    ]);

    const ids = [
      ...purchase.orders.map((row) => row.id),
      ...purchase.lines.map((row) => row.id),
      ...demoEquipmentSeed().map((row) => row.id),
      ...demoDispatchSeed().map((row) => row.id),
      ...demoLaborSeed().map((row) => row.id),
      ...production.entries.map((row) => row.id),
      ...orders.orders.map((row) => row.id),
      ...demoInspectionSeed().map((row) => row.id),
    ];
    expect(ids.every((id) => isUuid(id))).toBe(true);

    delete (globalThis as { __strongfoamEquipment?: unknown }).__strongfoamEquipment;
    delete (globalThis as { __strongfoamPurchaseOrders?: unknown }).__strongfoamPurchaseOrders;
    delete (globalThis as { __strongfoamInspections?: unknown }).__strongfoamInspections;
    expect(equipmentMemory().assignments.some((row) => row.jobId === DEMO_JOB_ID)).toBe(true);
    expect(purchaseOrderMemory().orders).toHaveLength(2);
    expect(inspectionMemory().rows.some((row) => row.jobId === DEMO_JOB_ID)).toBe(true);
  });
});
