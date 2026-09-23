import { describe, expect, it } from "vitest";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import {
  buildEquipmentAttention,
  formatEquipmentConflict,
  parseEquipmentName,
  parseEquipmentNote,
  type EquipmentAssignment,
} from "@/lib/ops/equipment";
import { resolveEquipmentAccess } from "@/lib/ops/equipment-authorization";

const org = STRONG_FOAM_ORGANIZATION_ID;
const jobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherJobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

function assignment(overrides: Partial<EquipmentAssignment> = {}): EquipmentAssignment {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId: org,
    jobId,
    name: "Graco E-30",
    nameKey: "graco e-30",
    note: "",
    status: "assigned",
    createdBy: "office@strongfoam.demo",
    createdAt: new Date("2026-09-23T12:00:00.000Z"),
    updatedAt: new Date("2026-09-23T12:00:00.000Z"),
    ...overrides,
  };
}

describe("equipment assignments", () => {
  it("requires a short equipment name and an optional note", () => {
    expect(parseEquipmentName("  Graco   E-30  ")).toEqual({
      ok: true,
      name: "Graco E-30",
      nameKey: "graco e-30",
    });
    expect(parseEquipmentName("  ").ok).toBe(false);
    expect(parseEquipmentName("x".repeat(81)).ok).toBe(false);
    expect(parseEquipmentNote("  Stage at the lift  ")).toEqual({
      ok: true,
      value: "Stage at the lift",
    });
    expect(parseEquipmentNote("x".repeat(501)).ok).toBe(false);
  });

  it("lets office assign equipment and keeps field users on read", () => {
    expect(resolveEquipmentAccess({ role: "office" }, "equipment.edit").ok).toBe(true);
    expect(resolveEquipmentAccess({ role: "field_worker" }, "equipment.edit").ok).toBe(false);
    expect(resolveEquipmentAccess({ role: "field_lead" }, "equipment.read").ok).toBe(true);
    expect(resolveEquipmentAccess({ role: "estimator" }, "equipment.edit").ok).toBe(true);
  });

  it("lists a name that is assigned to two open jobs", () => {
    const conflicts = buildEquipmentAttention({
      organizationId: org,
      jobs: [
        { id: jobId, name: "North elevation", status: "in_progress", organizationId: org },
        { id: otherJobId, name: "Mechanical room", status: "in_progress", organizationId: org },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4",
          name: "Closed review",
          status: "closed",
          organizationId: org,
        },
      ],
      assignments: [
        assignment(),
        assignment({
          id: "22222222-2222-4222-8222-222222222222",
          jobId: otherJobId,
          updatedAt: new Date("2026-09-23T13:00:00.000Z"),
        }),
        assignment({
          id: "33333333-3333-4333-8333-333333333333",
          jobId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4",
          name: "Old pump",
          nameKey: "old pump",
        }),
        assignment({
          id: "44444444-4444-4444-8444-444444444444",
          name: "Released hose",
          nameKey: "released hose",
          status: "released",
        }),
      ],
    });
    expect(conflicts).toHaveLength(1);
    expect(formatEquipmentConflict(conflicts[0]!)).toBe(
      "Graco E-30 is on Mechanical room and North elevation",
    );
  });
});
