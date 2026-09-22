import { describe, expect, it } from "vitest";
import {
  buildDispatchDay,
  dispatchesVisibleToUser,
  parseDispatchNote,
  parseWorkDate,
  type Dispatch,
} from "@/lib/ops/dispatch";
import { resolveDispatchAccess } from "@/lib/ops/dispatch-authorization";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

const org = STRONG_FOAM_ORGANIZATION_ID;

function row(overrides: Partial<Dispatch>): Dispatch {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId: org,
    jobId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    userId: "12121212-1212-4121-8121-121212121212",
    workDate: "2026-09-19",
    status: "scheduled",
    note: "",
    createdBy: "office@strongfoam.demo",
    createdAt: new Date("2026-09-19T12:00:00.000Z"),
    updatedAt: new Date("2026-09-19T12:00:00.000Z"),
    ...overrides,
  };
}

describe("dispatch day", () => {
  it("accepts a calendar date and a short note", () => {
    expect(parseWorkDate("2026-09-19")).toEqual({ ok: true, value: "2026-09-19" });
    expect(parseWorkDate("2026-02-31").ok).toBe(false);
    const note = parseDispatchNote("  Bring the lift  ");
    expect(note.ok && note.value).toBe("Bring the lift");
    expect(parseDispatchNote("x".repeat(501)).ok).toBe(false);
  });

  it("keeps field members on their own scheduled rows", () => {
    const own = row({});
    const other = row({
      id: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
    });
    const cancelled = row({
      id: "44444444-4444-4444-8444-444444444444",
      status: "cancelled",
    });
    expect(dispatchesVisibleToUser([own, other, cancelled], own.userId)).toEqual([own]);
  });

  it("flags a double booking and lists jobs with no scheduled dispatch", () => {
    const day = buildDispatchDay({
      organizationId: org,
      jobs: [
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          name: "North elevation",
          status: "in_progress",
          organizationId: org,
        },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
          name: "Mechanical room",
          status: "in_progress",
          organizationId: org,
        },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
          name: "Closed review",
          status: "closed",
          organizationId: org,
        },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4",
          name: "Loading dock",
          status: "blocked",
          organizationId: org,
        },
      ],
      people: [{ userId: "12121212-1212-4121-8121-121212121212", displayName: "Jordan Field" }],
      dispatches: [
        row({}),
        row({
          id: "55555555-5555-4555-8555-555555555555",
          jobId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
        }),
      ],
    });
    expect(day.doubleBooked).toEqual([
      {
        userId: "12121212-1212-4121-8121-121212121212",
        displayName: "Jordan Field",
        jobNames: ["Mechanical room", "North elevation"],
      },
    ]);
    expect(day.undispatched).toEqual([
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4", name: "Loading dock" },
    ]);
  });

  it("lets office schedule and limits field members to reading", () => {
    expect(
      resolveDispatchAccess(
        { role: "office", organizationId: org },
        "dispatch.edit",
      ).ok,
    ).toBe(true);
    expect(
      resolveDispatchAccess(
        { role: "field_worker", organizationId: org },
        "dispatch.edit",
      ).ok,
    ).toBe(false);
    expect(
      resolveDispatchAccess(
        { role: "field_lead", organizationId: org },
        "dispatch.read",
      ).ok,
    ).toBe(true);
    expect(
      resolveDispatchAccess({ role: "estimator" }, "dispatch.edit").ok,
    ).toBe(true);
  });
});
