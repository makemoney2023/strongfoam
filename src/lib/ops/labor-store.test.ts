import { beforeEach, describe, expect, it } from "vitest";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { DISPATCH_TIME_ZONE } from "@/lib/ops/dispatch";
import { formatLaborEntry } from "@/lib/ops/labor";
import {
  listLabor,
  recordLabor,
  removeLabor,
  resetLaborForTests,
} from "@/lib/ops/labor-store";
import { DEMO_FIELD_USER_ID, DEMO_JOB_ID } from "@/lib/ops/demo-data";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { getOpsNow } from "@/lib/ops/ops-now";
import { listJobs } from "@/lib/ops/store";

const office = {
  email: "office@strongfoam.demo",
  role: "office" as const,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
};
const field = {
  email: "field@strongfoam.demo",
  role: "field_worker" as const,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
  userId: DEMO_FIELD_USER_ID,
};
const today = workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);

describe("labor store", () => {
  beforeEach(() => {
    resetLaborForTests();
  });

  it("keeps piece work and hours on the same job and updates a repeated count", async () => {
    const closed = (await listJobs()).find((job) => job.name === "Closeout deficiency review");
    if (!closed) throw new Error("Demo closed job is missing.");

    const bags = await recordLabor({
      actor: office,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
      kind: "piece",
      quantity: "40",
      unit: "bags",
      note: "North wall",
    });
    if (!bags.ok) throw new Error(bags.error);
    const hours = await recordLabor({
      actor: field,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
      kind: "hourly",
      hours: "7.5",
    });
    expect(hours.ok).toBe(true);
    const updated = await recordLabor({
      actor: office,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
      kind: "piece",
      quantity: "42",
      unit: "bags",
    });
    if (!updated.ok) throw new Error(updated.error);
    expect(updated.entry.id).toBe(bags.entry.id);
    expect(updated.entry.quantity).toBe(42);

    const area = await recordLabor({
      actor: field,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
      kind: "piece",
      quantity: "120",
      unit: "sq_ft",
    });
    expect(area.ok).toBe(true);
    const denied = await recordLabor({
      actor: field,
      jobId: DEMO_JOB_ID,
      userId: "99999999-9999-4999-8999-999999999999",
      workDate: today,
      kind: "piece",
      quantity: "1",
      unit: "bags",
    });
    expect(denied).toMatchObject({ ok: false, error: "You can record only your own labor." });
    const closedResult = await recordLabor({
      actor: office,
      jobId: closed.id,
      userId: DEMO_FIELD_USER_ID,
      workDate: today,
      kind: "piece",
      quantity: "1",
      unit: "bags",
    });
    expect(closedResult).toMatchObject({ ok: false, error: "Closed jobs cannot take labor." });

    const rows = await listLabor(STRONG_FOAM_ORGANIZATION_ID, today, DEMO_FIELD_USER_ID);
    expect(rows.map((row) => formatLaborEntry(row)).sort()).toEqual([
      "120 sq ft",
      "42 bags",
      "7 hours 30 minutes",
    ]);
    const hidden = await listLabor(
      STRONG_FOAM_ORGANIZATION_ID,
      today,
      "99999999-9999-4999-8999-999999999999",
    );
    expect(hidden).toEqual([]);

    const removed = await removeLabor({ actor: field, laborId: updated.entry.id });
    expect(removed.ok).toBe(true);
    expect(
      (await listLabor(STRONG_FOAM_ORGANIZATION_ID, today)).some((row) => row.kind === "piece" && row.unit === "bags"),
    ).toBe(false);
  });
});