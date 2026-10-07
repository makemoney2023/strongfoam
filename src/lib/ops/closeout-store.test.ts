import { beforeEach, describe, expect, it } from "vitest";
import {
  listCloseoutAttention,
  listJobCloseout,
  recordCloseout,
  resetCloseoutsForTests,
  saveCloseoutPacket,
} from "@/lib/ops/closeout-store";
import { DEMO_JOB_ID, DEMO_SECOND_JOB_ID } from "@/lib/ops/demo-data";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { resetInspectionsForTests, recordInspection } from "@/lib/ops/inspection-store";
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

describe("closeout store", () => {
  beforeEach(() => {
    resetCloseoutsForTests();
    resetInspectionsForTests();
  });

  it("keeps one closeout per job and refuses a signature while inspections are open", async () => {
    const closed = (await listJobs()).find((job) => job.name === "Closeout deficiency review");
    if (!closed) throw new Error("Demo jobs are missing.");

    const denied = await recordCloseout({
      actor: field,
      jobId: DEMO_JOB_ID,
      status: "preparing",
    });
    expect(denied.ok).toBe(false);

    const closedRecord = await recordCloseout({
      actor: office,
      jobId: closed.id,
      status: "ready",
    });
    expect(closedRecord).toMatchObject({
      ok: false,
      error: "Closed jobs cannot take a closeout.",
    });

    const hidden = await recordCloseout({
      actor: outsider,
      jobId: DEMO_JOB_ID,
      status: "preparing",
    });
    expect(hidden).toMatchObject({ ok: false, error: "That job was not found." });

    const recorded = await recordCloseout({
      actor: office,
      jobId: DEMO_JOB_ID,
      status: "preparing",
      note: "Photos still outstanding",
    });
    if (!recorded.ok) throw new Error(recorded.error);
    expect(recorded.closeout.status).toBe("preparing");

    const openInspection = await recordInspection({
      actor: office,
      jobId: DEMO_JOB_ID,
      name: "Thickness",
      result: "failed",
    });
    if (!openInspection.ok) throw new Error(openInspection.error);

    const blocked = await recordCloseout({
      actor: office,
      jobId: DEMO_JOB_ID,
      status: "signed",
    });
    expect(blocked).toMatchObject({
      ok: false,
      error: "Sign closeout after every inspection on this job has passed.",
    });

    const passed = await recordInspection({
      actor: office,
      jobId: DEMO_JOB_ID,
      name: "thickness",
      result: "passed",
    });
    if (!passed.ok) throw new Error(passed.error);

    const signed = await recordCloseout({
      actor: office,
      jobId: DEMO_JOB_ID,
      status: "signed",
      note: "Customer walk complete",
    });
    if (!signed.ok) throw new Error(signed.error);
    expect(signed.closeout.id).toBe(recorded.closeout.id);
    expect(signed.closeout.status).toBe("signed");
    expect(await listJobCloseout(STRONG_FOAM_ORGANIZATION_ID, DEMO_JOB_ID)).toMatchObject({
      id: recorded.closeout.id,
      status: "signed",
    });

    const packet = await saveCloseoutPacket({
      actor: office,
      jobId: DEMO_JOB_ID,
      narrative: "North elevation closeout packet. This draft is not sent to the customer.",
    });
    if (!packet.ok) throw new Error(packet.error);
    expect(packet.closeout.id).toBe(recorded.closeout.id);
    expect(packet.closeout.status).toBe("signed");
    expect(packet.closeout.packetText).toContain("is not sent");

    const ready = await recordCloseout({
      actor: office,
      jobId: DEMO_SECOND_JOB_ID,
      status: "ready",
    });
    if (!ready.ok) throw new Error(ready.error);
    const attention = await listCloseoutAttention(STRONG_FOAM_ORGANIZATION_ID);
    expect(attention.map((item) => item.id)).toEqual([ready.closeout.id]);
    expect(await listJobCloseout(outsider.organizationId, DEMO_JOB_ID)).toBeNull();
    expect(await listCloseoutAttention(outsider.organizationId)).toEqual([]);

    const audits = (
      globalThis as {
        __strongfoamDemoOps?: { auditEvents: { action: string; payload: Record<string, unknown> }[] };
      }
    ).__strongfoamDemoOps?.auditEvents ?? [];
    const closeoutAudits = audits.filter((event) => event.action === "closeout.record");
    expect(closeoutAudits.length).toBeGreaterThan(0);
    expect(closeoutAudits.every((event) => !("price" in event.payload))).toBe(true);
  });
});
