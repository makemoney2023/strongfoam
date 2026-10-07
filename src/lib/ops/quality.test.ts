import { describe, expect, it } from "vitest";
import { resolveQualityAccess } from "@/lib/ops/quality-authorization";
import {
  buildQualityAttention,
  parseQualityKind,
  parseQualityName,
  parseQualityNote,
  parseQualityStatus,
  qualityContextLabel,
  type QualityRecord,
} from "@/lib/ops/quality";

const org = "00000000-0000-4000-8000-000000000001";

function row(
  overrides: Partial<QualityRecord> &
    Pick<QualityRecord, "id" | "jobId" | "kind" | "name" | "status">,
): QualityRecord {
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

describe("quality records", () => {
  it("requires a kind, a short name, a status, and an optional note", () => {
    expect(parseQualityKind("deficiency")).toEqual({ ok: true, value: "deficiency" });
    expect(parseQualityKind("inspection")).toMatchObject({ ok: false });
    expect(parseQualityName("  Podium   edge ")).toEqual({
      ok: true,
      name: "Podium edge",
      nameKey: "podium edge",
    });
    expect(parseQualityName(" ")).toMatchObject({ ok: false });
    expect(parseQualityName("x".repeat(81))).toMatchObject({ ok: false });
    expect(parseQualityStatus("reopened")).toEqual({ ok: true, value: "reopened" });
    expect(parseQualityStatus("failed")).toMatchObject({ ok: false });
    expect(parseQualityNote("  Thin  pass ")).toEqual({ ok: true, value: "Thin pass" });
    expect(parseQualityNote("x".repeat(501))).toMatchObject({ ok: false });
  });

  it("lets office record and field read", () => {
    expect(resolveQualityAccess({ role: "office" }, "quality.edit").ok).toBe(true);
    expect(resolveQualityAccess({ role: "estimator" }, "quality.edit").ok).toBe(true);
    expect(resolveQualityAccess({ role: "field_worker" }, "quality.read").ok).toBe(true);
    expect(resolveQualityAccess({ role: "field_lead" }, "quality.edit").ok).toBe(false);
  });

  it("lists open and reopened deficiencies and rework on jobs that are still open", () => {
    const north = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const mechanical = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
    const closed = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4";
    const attention = buildQualityAttention({
      organizationId: org,
      jobs: [
        { id: north, name: "North elevation", status: "in_progress", organizationId: org },
        { id: mechanical, name: "Mechanical room", status: "in_progress", organizationId: org },
        { id: closed, name: "Closeout", status: "closed", organizationId: org },
      ],
      records: [
        row({ id: "1", jobId: north, kind: "deficiency", name: "Podium edge", status: "open" }),
        row({ id: "2", jobId: north, kind: "deficiency", name: "Lift path", status: "corrected" }),
        row({ id: "3", jobId: mechanical, kind: "rework", name: "Second pass", status: "open" }),
        row({ id: "4", jobId: mechanical, kind: "deficiency", name: "Rim gap", status: "reopened" }),
        row({ id: "5", jobId: closed, kind: "deficiency", name: "Old void", status: "open" }),
      ],
    });
    expect(attention.map((item) => `${item.status}:${item.kind}:${item.name}`)).toEqual([
      "reopened:deficiency:Rim gap",
      "open:deficiency:Podium edge",
      "open:rework:Second pass",
    ]);
  });

  it("treats a missing quality source as not available and a corrected source as clear", () => {
    expect(qualityContextLabel({ jobIds: ["job-1"], records: [] })).toBe("not available");
    expect(
      qualityContextLabel({
        jobIds: ["job-1"],
        records: [
          { jobId: "job-1", kind: "deficiency", name: "Podium edge", status: "corrected" },
          { jobId: "other", kind: "deficiency", name: "Elsewhere", status: "open" },
        ],
      }),
    ).toBe("clear");
    expect(
      qualityContextLabel({
        jobIds: ["job-1"],
        records: [
          { jobId: "job-1", kind: "rework", name: "Second pass", status: "open" },
          { jobId: "job-1", kind: "deficiency", name: "Podium edge", status: "reopened" },
        ],
      }),
    ).toBe("Reopened deficiency · Podium edge · 2 open");
  });
});
