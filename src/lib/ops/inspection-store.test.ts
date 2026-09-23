import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_JOB_ID } from "@/lib/ops/demo-data";
import {
  listInspectionAttention,
  listJobInspections,
  recordInspection,
  resetInspectionsForTests,
} from "@/lib/ops/inspection-store";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
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
};
const outsider = {
  email: "other@example.com",
  role: "office" as const,
  organizationId: "00000000-0000-4000-8000-000000000099",
};

describe("inspection store", () => {
  beforeEach(() => {
    resetInspectionsForTests();
  });

  it("records one name per job and updates that row", async () => {
    const closed = (await listJobs()).find((job) => job.name === "Closeout deficiency review");
    const other = (await listJobs()).find((job) => job.name === "Mechanical room fireproofing");
    if (!closed || !other) throw new Error("Demo jobs are missing.");

    const denied = await recordInspection({
      actor: field,
      jobId: DEMO_JOB_ID,
      name: "Thickness",
      result: "failed",
    });
    expect(denied.ok).toBe(false);

    const closedRecord = await recordInspection({
      actor: office,
      jobId: closed.id,
      name: "Walk",
      result: "passed",
    });
    expect(closedRecord).toMatchObject({
      ok: false,
      error: "Closed jobs cannot take an inspection.",
    });

    const hidden = await recordInspection({
      actor: outsider,
      jobId: DEMO_JOB_ID,
      name: "Thickness",
      result: "open",
    });
    expect(hidden).toMatchObject({ ok: false, error: "That job was not found." });

    const recorded = await recordInspection({
      actor: office,
      jobId: DEMO_JOB_ID,
      name: "  Podium   thickness ",
      result: "failed",
      note: "Thin along the column line",
    });
    if (!recorded.ok) throw new Error(recorded.error);
    expect(recorded.inspection.name).toBe("Podium thickness");
    expect(recorded.inspection.result).toBe("failed");

    const again = await recordInspection({
      actor: office,
      jobId: DEMO_JOB_ID,
      name: "podium thickness",
      result: "passed",
      note: "Second pass accepted",
    });
    if (!again.ok) throw new Error(again.error);
    expect(again.inspection.id).toBe(recorded.inspection.id);
    expect(again.inspection.result).toBe("passed");
    expect(await listJobInspections(STRONG_FOAM_ORGANIZATION_ID, DEMO_JOB_ID)).toHaveLength(1);

    const open = await recordInspection({
      actor: office,
      jobId: other.id,
      name: "Adhesion",
      result: "open",
    });
    if (!open.ok) throw new Error(open.error);
    const attention = await listInspectionAttention(STRONG_FOAM_ORGANIZATION_ID);
    expect(attention.map((item) => item.id)).toEqual([open.inspection.id]);
    expect(await listJobInspections(outsider.organizationId, DEMO_JOB_ID)).toEqual([]);
    expect(await listInspectionAttention(outsider.organizationId)).toEqual([]);

    const audits = (
      globalThis as {
        __strongfoamDemoOps?: { auditEvents: { action: string; payload: Record<string, unknown> }[] };
      }
    ).__strongfoamDemoOps?.auditEvents ?? [];
    const inspectionAudits = audits.filter((event) => event.action === "inspection.record");
    expect(inspectionAudits.length).toBeGreaterThan(0);
    expect(
      inspectionAudits.every(
        (event) => !("price" in event.payload) && !("rate" in event.payload),
      ),
    ).toBe(true);
  });
});
