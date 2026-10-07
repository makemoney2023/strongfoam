import { describe, expect, it } from "vitest";
import { resolveCloseoutAccess } from "@/lib/ops/closeout-authorization";
import {
  buildCloseoutAttention,
  closeoutCanBeSigned,
  parseCloseoutNote,
  parseCloseoutStatus,
  type Closeout,
} from "@/lib/ops/closeout";

const org = "00000000-0000-4000-8000-000000000001";

function row(overrides: Partial<Closeout> & Pick<Closeout, "id" | "jobId" | "status">): Closeout {
  return {
    organizationId: org,
    note: "",
    packetText: "",
    createdBy: "office@strongfoam.demo",
    createdAt: new Date("2026-09-19T12:00:00.000Z"),
    updatedAt: new Date("2026-09-19T12:00:00.000Z"),
    ...overrides,
  };
}

describe("closeout", () => {
  it("requires a status and an optional note", () => {
    expect(parseCloseoutStatus("ready")).toEqual({ ok: true, value: "ready" });
    expect(parseCloseoutStatus("done")).toMatchObject({ ok: false });
    expect(parseCloseoutNote("  Waiting  on photos ")).toEqual({
      ok: true,
      value: "Waiting on photos",
    });
    expect(parseCloseoutNote("x".repeat(501))).toMatchObject({ ok: false });
  });

  it("lets office record and field read", () => {
    expect(resolveCloseoutAccess({ role: "office" }, "closeout.edit").ok).toBe(true);
    expect(resolveCloseoutAccess({ role: "estimator" }, "closeout.edit").ok).toBe(true);
    expect(resolveCloseoutAccess({ role: "field_worker" }, "closeout.read").ok).toBe(true);
    expect(resolveCloseoutAccess({ role: "field_lead" }, "closeout.edit").ok).toBe(false);
  });

  it("refuses a signature while an inspection is open or failed", () => {
    expect(closeoutCanBeSigned([])).toBe(true);
    expect(closeoutCanBeSigned([{ result: "passed" }])).toBe(true);
    expect(closeoutCanBeSigned([{ result: "passed" }, { result: "open" }])).toBe(false);
    expect(closeoutCanBeSigned([{ result: "failed" }])).toBe(false);
  });

  it("lists preparing and ready closeouts on jobs that are still open", () => {
    const north = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const mechanical = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
    const closed = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4";
    const attention = buildCloseoutAttention({
      organizationId: org,
      jobs: [
        { id: north, name: "North elevation", status: "in_progress", organizationId: org },
        { id: mechanical, name: "Mechanical room", status: "in_progress", organizationId: org },
        { id: closed, name: "Closeout", status: "closed", organizationId: org },
      ],
      closeouts: [
        row({ id: "1", jobId: north, status: "preparing" }),
        row({ id: "2", jobId: mechanical, status: "ready" }),
        row({ id: "3", jobId: closed, status: "preparing" }),
        row({ id: "4", jobId: north, status: "signed" }),
      ],
    });
    expect(attention.map((item) => item.status)).toEqual(["ready", "preparing"]);
    expect(attention.map((item) => item.jobName)).toEqual(["Mechanical room", "North elevation"]);
  });
});
