import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_JOB_ID } from "@/lib/ops/demo-data";
import {
  assignEquipment,
  listEquipmentAttention,
  listJobEquipment,
  releaseEquipment,
  resetEquipmentForTests,
} from "@/lib/ops/equipment-store";
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

describe("equipment store", () => {
  beforeEach(() => {
    resetEquipmentForTests();
  });

  it("assigns one name per job, releases it, and revives the same row", async () => {
    const closed = (await listJobs()).find((job) => job.name === "Closeout deficiency review");
    const other = (await listJobs()).find((job) => job.name === "Mechanical room fireproofing");
    if (!closed || !other) throw new Error("Demo jobs are missing.");

    const denied = await assignEquipment({
      actor: field,
      jobId: DEMO_JOB_ID,
      name: "Graco E-30",
    });
    expect(denied.ok).toBe(false);

    const closedAssign = await assignEquipment({
      actor: office,
      jobId: closed.id,
      name: "Graco E-30",
    });
    expect(closedAssign).toMatchObject({
      ok: false,
      error: "Closed jobs cannot take equipment.",
    });

    const hidden = await assignEquipment({
      actor: outsider,
      jobId: DEMO_JOB_ID,
      name: "Graco E-30",
    });
    expect(hidden).toMatchObject({ ok: false, error: "That job was not found." });

    const assigned = await assignEquipment({
      actor: office,
      jobId: DEMO_JOB_ID,
      name: "  Graco   E-30  ",
      note: "Stage at the lift",
    });
    if (!assigned.ok) throw new Error(assigned.error);
    expect(assigned.assignment.name).toBe("Graco E-30");
    expect(assigned.assignment.status).toBe("assigned");

    const duplicate = await assignEquipment({
      actor: office,
      jobId: DEMO_JOB_ID,
      name: "graco e-30",
    });
    expect(duplicate).toMatchObject({
      ok: false,
      error: "That equipment is already on this job.",
    });

    const second = await assignEquipment({
      actor: office,
      jobId: other.id,
      name: "Graco E-30",
    });
    if (!second.ok) throw new Error(second.error);
    const attention = await listEquipmentAttention(STRONG_FOAM_ORGANIZATION_ID);
    expect(attention.some((row) => row.nameKey === "graco e-30")).toBe(true);
    expect(await listJobEquipment(outsider.organizationId, DEMO_JOB_ID)).toEqual([]);
    expect(
      (await listEquipmentAttention(outsider.organizationId)).some(
        (row) => row.nameKey === "graco e-30",
      ),
    ).toBe(false);

    const released = await releaseEquipment({
      actor: office,
      assignmentId: assigned.assignment.id,
    });
    if (!released.ok) throw new Error(released.error);
    expect(released.assignment.status).toBe("released");
    const kept = await listJobEquipment(STRONG_FOAM_ORGANIZATION_ID, DEMO_JOB_ID);
    expect(kept.map((row) => row.id)).toEqual([assigned.assignment.id]);
    expect((await listEquipmentAttention(STRONG_FOAM_ORGANIZATION_ID)).some(
      (row) => row.nameKey === "graco e-30",
    )).toBe(false);

    const revived = await assignEquipment({
      actor: office,
      jobId: DEMO_JOB_ID,
      name: "Graco E-30",
    });
    if (!revived.ok) throw new Error(revived.error);
    expect(revived.assignment.id).toBe(assigned.assignment.id);
    expect(revived.assignment.status).toBe("assigned");

    const audits = (
      globalThis as {
        __strongfoamDemoOps?: { auditEvents: { action: string; payload: Record<string, unknown> }[] };
      }
    ).__strongfoamDemoOps?.auditEvents ?? [];
    const equipmentAudits = audits.filter((event) => event.action.startsWith("equipment."));
    expect(equipmentAudits.map((event) => event.action)).toEqual(
      expect.arrayContaining(["equipment.assign", "equipment.release"]),
    );
    expect(
      equipmentAudits.every(
        (event) => !("price" in event.payload) && !("rate" in event.payload),
      ),
    ).toBe(true);
  });
});