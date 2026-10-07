import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_JOB_ID } from "@/lib/ops/demo-data";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import {
  listJobQualityRecords,
  listQualityAttention,
  recordQuality,
  resetQualityForTests,
} from "@/lib/ops/quality-store";
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

describe("quality store", () => {
  beforeEach(() => {
    resetQualityForTests();
  });

  it("records one name per kind and job, and updates that row", async () => {
    const closed = (await listJobs()).find((job) => job.name === "Closeout deficiency review");
    const other = (await listJobs()).find((job) => job.name === "Mechanical room fireproofing");
    if (!closed || !other) throw new Error("Demo jobs are missing.");

    const denied = await recordQuality({
      actor: field,
      jobId: DEMO_JOB_ID,
      kind: "deficiency",
      name: "Podium edge",
      status: "open",
    });
    expect(denied.ok).toBe(false);

    const closedRecord = await recordQuality({
      actor: office,
      jobId: closed.id,
      kind: "deficiency",
      name: "Walk",
      status: "open",
    });
    expect(closedRecord).toMatchObject({
      ok: false,
      error: "Closed jobs cannot take a quality record.",
    });

    const hidden = await recordQuality({
      actor: outsider,
      jobId: DEMO_JOB_ID,
      kind: "deficiency",
      name: "Podium edge",
      status: "open",
    });
    expect(hidden).toMatchObject({ ok: false, error: "That job was not found." });

    const recorded = await recordQuality({
      actor: office,
      jobId: DEMO_JOB_ID,
      kind: "deficiency",
      name: "  Podium   edge ",
      status: "open",
      note: "Thin along the column line",
    });
    if (!recorded.ok) throw new Error(recorded.error);
    expect(recorded.record.name).toBe("Podium edge");
    expect(recorded.record.kind).toBe("deficiency");
    expect(recorded.record.status).toBe("open");

    const rework = await recordQuality({
      actor: office,
      jobId: DEMO_JOB_ID,
      kind: "rework",
      name: "Podium edge",
      status: "open",
    });
    if (!rework.ok) throw new Error(rework.error);
    expect(rework.record.id).not.toBe(recorded.record.id);

    const again = await recordQuality({
      actor: office,
      jobId: DEMO_JOB_ID,
      kind: "deficiency",
      name: "podium edge",
      status: "corrected",
      note: "Second pass accepted",
    });
    if (!again.ok) throw new Error(again.error);
    expect(again.record.id).toBe(recorded.record.id);
    expect(again.record.status).toBe("corrected");
    expect(await listJobQualityRecords(STRONG_FOAM_ORGANIZATION_ID, DEMO_JOB_ID)).toHaveLength(2);

    const open = await recordQuality({
      actor: office,
      jobId: other.id,
      kind: "deficiency",
      name: "Rim gap",
      status: "reopened",
    });
    if (!open.ok) throw new Error(open.error);
    const attention = await listQualityAttention(STRONG_FOAM_ORGANIZATION_ID);
    expect(attention.map((item) => item.id)).toEqual([open.record.id, rework.record.id]);
    expect(await listJobQualityRecords(outsider.organizationId, DEMO_JOB_ID)).toEqual([]);
    expect(await listQualityAttention(outsider.organizationId)).toEqual([]);

    const audits = (
      globalThis as {
        __strongfoamDemoOps?: { auditEvents: { action: string; payload: Record<string, unknown> }[] };
      }
    ).__strongfoamDemoOps?.auditEvents ?? [];
    const qualityAudits = audits.filter((event) => event.action === "quality.record");
    expect(qualityAudits.length).toBeGreaterThan(0);
    expect(
      qualityAudits.every(
        (event) => !("price" in event.payload) && !("rate" in event.payload),
      ),
    ).toBe(true);
  });
});
