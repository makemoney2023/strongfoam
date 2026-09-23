import { beforeEach, describe, expect, it } from "vitest";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { DISPATCH_TIME_ZONE } from "@/lib/ops/dispatch";
import { DEMO_FIELD_USER_ID, DEMO_JOB_ID } from "@/lib/ops/demo-data";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { recordLabor, resetLaborForTests } from "@/lib/ops/labor-store";
import { getOpsNow } from "@/lib/ops/ops-now";
import { listJobs } from "@/lib/ops/store";
import {
  approveProductionTarget,
  loadWorkforceBoard,
  recordProduction,
  resetProductionForTests,
  setProductionAllocation,
  verifyProduction,
  voidProduction,
} from "@/lib/ops/production-store";

const office = {
  email: "office@strongfoam.demo",
  role: "office" as const,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
  userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};
const field = {
  email: "field@strongfoam.demo",
  role: "field_worker" as const,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
  userId: DEMO_FIELD_USER_ID,
};
const today = workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);

describe("production store", () => {
  beforeEach(() => {
    resetProductionForTests();
    resetLaborForTests();
  });

  it("verifies individual production and keeps the worker from approving their own score", async () => {
    const closed = (await listJobs()).find((job) => job.name === "Closeout deficiency review");
    if (!closed) throw new Error("Demo closed job is missing.");
    const target = await approveProductionTarget({
      actor: office,
      trade: "Spray foam",
      workType: "Wall",
      unit: "bags",
      basis: "person_hour",
      rate: "5",
      effectiveFrom: "2026-01-01",
    });
    expect(target.ok).toBe(true);
    const hours = await recordLabor({
      actor: field,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
      kind: "hourly",
      hours: "8",
    });
    expect(hours.ok).toBe(true);
    const recorded = await recordProduction({
      actor: field,
      jobId: DEMO_JOB_ID,
      workDate: today,
      trade: "spray foam",
      workType: "wall",
      unit: "bags",
      quantity: "40",
      attributionMode: "individual",
      participantUserIds: [DEMO_FIELD_USER_ID],
    });
    if (!recorded.ok) throw new Error(recorded.error);
    expect(await verifyProduction({ actor: field, productionId: recorded.entry.id })).toMatchObject({
      ok: false,
      error: "You do not have access to that workforce action.",
    });
    expect(await verifyProduction({ actor: { ...field, role: "office" }, productionId: recorded.entry.id })).toMatchObject({
      ok: false,
      error: "You cannot verify production that includes you.",
    });
    expect(await verifyProduction({ actor: office, productionId: recorded.entry.id })).toEqual({ ok: true });
    const denied = await recordProduction({
      actor: field,
      jobId: DEMO_JOB_ID,
      workDate: today,
      trade: "spray foam",
      workType: "wall",
      unit: "bags",
      quantity: "1",
      attributionMode: "individual",
      participantUserIds: ["99999999-9999-4999-8999-999999999999"],
    });
    expect(denied).toMatchObject({ ok: false, error: "You can record only your own production." });
    expect(
      await recordProduction({
        actor: office,
        jobId: closed.id,
        workDate: today,
        trade: "spray foam",
        workType: "wall",
        unit: "bags",
        quantity: "1",
        attributionMode: "individual",
        participantUserIds: [DEMO_FIELD_USER_ID],
      }),
    ).toMatchObject({ ok: false, error: "Closed jobs cannot take production." });
    expect(
      await setProductionAllocation({
        actor: office,
        productionId: recorded.entry.id,
        userId: DEMO_FIELD_USER_ID,
        quantity: "41",
      }),
    ).toMatchObject({ ok: false, error: "Allocations cannot exceed the installed quantity." });

    const board = await loadWorkforceBoard(STRONG_FOAM_ORGANIZATION_ID, today);
    const worker = board.workers.find((row) => row.userId === DEMO_FIELD_USER_ID);
    expect(worker?.today.efficiency).toBeCloseTo(100, 5);
    expect(worker?.ranked).toBe(false);
    expect(board.ranked).toBe(false);
    expect(worker?.nextAction).toBe("Today's verified production is on the target.");
    expect(
      await recordProduction({
        actor: office,
        jobId: DEMO_JOB_ID,
        workDate: today,
        trade: "spray foam",
        workType: "wall",
        unit: "bags",
        quantity: "10",
        attributionMode: "individual",
        participantUserIds: [DEMO_FIELD_USER_ID, "23232323-2323-4232-8232-232323232323"],
      }),
    ).toMatchObject({
      ok: false,
      error: "Individual production is for one person. Choose crew when several people share the quantity.",
    });
    expect(
      await voidProduction({
        actor: { ...field, role: "office" },
        productionId: recorded.entry.id,
      }),
    ).toMatchObject({ ok: false, error: "You cannot void production that includes you." });
    expect(await voidProduction({ actor: office, productionId: recorded.entry.id })).toEqual({ ok: true });
  });
});
