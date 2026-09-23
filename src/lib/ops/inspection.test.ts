import { describe, expect, it } from "vitest";
import { resolveInspectionAccess } from "@/lib/ops/inspection-authorization";
import {
  buildInspectionAttention,
  parseInspectionName,
  parseInspectionNote,
  parseInspectionResult,
  type Inspection,
} from "@/lib/ops/inspection";

const org = "00000000-0000-4000-8000-000000000001";

function row(overrides: Partial<Inspection> & Pick<Inspection, "id" | "jobId" | "name" | "result">): Inspection {
  const name = overrides.name;
  return {
    organizationId: org,
    nameKey: name.toLowerCase(),
    note: "",
    createdBy: "office@strongfoam.demo",
    createdAt: new Date("2026-09-19T12:00:00.000Z"),
    updatedAt: new Date("2026-09-19T12:00:00.000Z"),
    ...overrides,
  };
}

describe("inspections", () => {
  it("requires a short name, a result, and an optional note", () => {
    expect(parseInspectionName("  Podium   thickness ")).toEqual({
      ok: true,
      name: "Podium thickness",
      nameKey: "podium thickness",
    });
    expect(parseInspectionName(" ")).toMatchObject({ ok: false });
    expect(parseInspectionName("x".repeat(81))).toMatchObject({ ok: false });
    expect(parseInspectionResult("failed")).toEqual({ ok: true, value: "failed" });
    expect(parseInspectionResult("maybe")).toMatchObject({ ok: false });
    expect(parseInspectionNote("  Thin  pass ")).toEqual({ ok: true, value: "Thin pass" });
  });

  it("lets office record and field read", () => {
    expect(resolveInspectionAccess({ role: "office" }, "inspection.edit").ok).toBe(true);
    expect(resolveInspectionAccess({ role: "estimator" }, "inspection.edit").ok).toBe(true);
    expect(resolveInspectionAccess({ role: "field_worker" }, "inspection.read").ok).toBe(true);
    expect(resolveInspectionAccess({ role: "field_lead" }, "inspection.edit").ok).toBe(false);
  });

  it("lists open and failed inspections on jobs that are still open", () => {
    const north = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const mechanical = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
    const closed = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4";
    const attention = buildInspectionAttention({
      organizationId: org,
      jobs: [
        { id: north, name: "North elevation", status: "in_progress", organizationId: org },
        { id: mechanical, name: "Mechanical room", status: "in_progress", organizationId: org },
        { id: closed, name: "Closeout", status: "closed", organizationId: org },
      ],
      inspections: [
        row({ id: "1", jobId: north, name: "Thickness", result: "failed" }),
        row({ id: "2", jobId: north, name: "Lift", result: "passed" }),
        row({ id: "3", jobId: mechanical, name: "Adhesion", result: "open" }),
        row({ id: "4", jobId: closed, name: "Walk", result: "failed" }),
      ],
    });
    expect(attention.map((item) => item.name)).toEqual(["Thickness", "Adhesion"]);
  });
});
