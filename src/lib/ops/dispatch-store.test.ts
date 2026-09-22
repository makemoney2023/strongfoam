import { beforeEach, describe, expect, it } from "vitest";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { DISPATCH_TIME_ZONE } from "@/lib/ops/dispatch";
import {
  cancelDispatch,
  listDispatches,
  resetDispatchesForTests,
  scheduleDispatch,
} from "@/lib/ops/dispatch-store";
import {
  DEMO_FIELD_USER_ID,
  DEMO_JOB_ID,
} from "@/lib/ops/demo-data";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { getOpsNow } from "@/lib/ops/ops-now";
import { canFieldUserAccessJob, listJobs } from "@/lib/ops/store";

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
const today = workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);

describe("dispatch store", () => {
  beforeEach(() => {
    resetDispatchesForTests();
  });

  it("revives a cancelled slot, flags a second job, and keeps the row", async () => {
    const second = (await listJobs()).find((job) => job.name === "Mechanical room fireproofing");
    const closed = (await listJobs()).find((job) => job.name === "Closeout deficiency review");
    if (!second || !closed) throw new Error("Demo jobs are missing.");

    const created = await scheduleDispatch({
      actor: office,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
      note: "Start at the podium",
    });
    if (!created.ok) throw new Error(created.error);
    const again = await scheduleDispatch({
      actor: office,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
    });
    expect(again.ok).toBe(false);

    const cancelled = await cancelDispatch({
      actor: office,
      dispatchId: created.dispatch.id,
    });
    if (!cancelled.ok) throw new Error(cancelled.error);
    expect(cancelled.dispatch.status).toBe("cancelled");
    const revived = await scheduleDispatch({
      actor: office,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
      note: "Back on the podium",
    });
    if (!revived.ok) throw new Error(revived.error);
    expect(revived.dispatch.id).toBe(created.dispatch.id);
    expect(revived.dispatch.status).toBe("scheduled");

    const otherSite = await scheduleDispatch({
      actor: office,
      jobId: second.id,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
    });
    expect(otherSite.ok).toBe(true);
    expect(await canFieldUserAccessJob(DEMO_FIELD_USER_ID, second.id)).toBe(true);

    const closedResult = await scheduleDispatch({
      actor: office,
      jobId: closed.id,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
    });
    expect(closedResult).toMatchObject({
      ok: false,
      error: "Closed jobs cannot be dispatched.",
    });
    const denied = await scheduleDispatch({
      actor: field,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
    });
    expect(denied.ok).toBe(false);

    const visible = await listDispatches(
      STRONG_FOAM_ORGANIZATION_ID,
      today,
      DEMO_FIELD_USER_ID,
    );
    const hidden = await listDispatches(
      STRONG_FOAM_ORGANIZATION_ID,
      today,
      "99999999-9999-4999-8999-999999999999",
    );
    expect(visible.map((row) => row.jobId).sort()).toEqual([DEMO_JOB_ID, second.id].sort());
    expect(hidden).toEqual([]);
    expect(
      (await listDispatches(STRONG_FOAM_ORGANIZATION_ID, today)).some(
        (row) => row.id === created.dispatch.id && row.status === "cancelled",
      ),
    ).toBe(false);

    const removed = await cancelDispatch({
      actor: office,
      dispatchId: otherSite.ok ? otherSite.dispatch.id : "",
    });
    expect(removed.ok).toBe(true);
    expect(await canFieldUserAccessJob(DEMO_FIELD_USER_ID, second.id)).toBe(false);
    const evidence = (await listDispatches(STRONG_FOAM_ORGANIZATION_ID, today)).find(
      (row) => row.jobId === second.id,
    );
    expect(evidence?.status).toBe("cancelled");

    const audits = (
      globalThis as {
        __strongfoamDemoOps?: { auditEvents: { action: string; entityId: string }[] };
      }
    ).__strongfoamDemoOps?.auditEvents ?? [];
    expect(audits.some((event) => event.action === "dispatch.schedule")).toBe(true);
    expect(audits.some((event) => event.action === "dispatch.cancel")).toBe(true);
  });
});