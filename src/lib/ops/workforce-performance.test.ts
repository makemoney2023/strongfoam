import { describe, expect, it } from "vitest";
import {
  buildWorkforcePerformance,
  formatEfficiency,
  parseTargetRate,
  type ProductionAllocation,
  type ProductionEntry,
  type ProductionParticipant,
  type ProductionTarget,
  type WorkforceLabor,
} from "@/lib/ops/workforce-performance";

const asOf = "2026-09-19";
const org = "00000000-0000-4000-8000-000000000001";
const jobId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const jordan = "12121212-1212-4121-8121-121212121212";
const alex = "23232323-2323-4232-8232-232323232323";

function entry(overrides: Partial<ProductionEntry> & Pick<ProductionEntry, "id" | "workDate" | "quantity" | "attributionMode">): ProductionEntry {
  return {
    organizationId: org,
    jobId,
    taskId: null,
    workAreaId: null,
    trade: "spray foam",
    workType: "wall",
    unit: "bags",
    status: "verified",
    recordedBy: "field@strongfoam.demo",
    verifiedBy: "office@strongfoam.demo",
    verifiedAt: new Date(`${overrides.workDate}T12:00:00.000Z`),
    sourceType: null,
    sourceId: null,
    version: 1,
    createdAt: new Date(`${overrides.workDate}T12:00:00.000Z`),
    updatedAt: new Date(`${overrides.workDate}T12:00:00.000Z`),
    ...overrides,
  };
}

function participant(productionEntryId: string, userId: string): ProductionParticipant {
  return { id: `${productionEntryId}-${userId}`, productionEntryId, userId, laborEntryId: null };
}

function allocation(productionEntryId: string, userId: string, quantity: number): ProductionAllocation {
  return { id: `alloc-${productionEntryId}-${userId}`, productionEntryId, userId, quantity };
}

function labor(id: string, userId: string, workDate: string, minutes: number): WorkforceLabor {
  return { id, jobId, userId, workDate, kind: "hourly", minutes };
}

function target(basis: "crew_hour" | "person_hour", rateMilli = 5000): ProductionTarget {
  return {
    id: `target-${basis}`,
    organizationId: org,
    trade: "spray foam",
    workType: "wall",
    unit: "bags",
    basis,
    rateMilli,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    approvedBy: "office@strongfoam.demo",
    approvedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

const people = [
  { userId: jordan, displayName: "Jordan Field", role: "field_worker" },
  { userId: alex, displayName: "Alex Field", role: "field_worker" },
];

describe("workforce performance", () => {
  it("parses a target rate without turning it into pay", () => {
    expect(parseTargetRate("8.5")).toEqual({ ok: true, rateMilli: 8500 });
    expect(parseTargetRate("0")).toMatchObject({ ok: false });
  });

  it("keeps crew production off individual scores and normalizes mixed shifts", () => {
    const crew = entry({ id: "crew", workDate: asOf, quantity: 80, attributionMode: "crew" });
    const fast = entry({ id: "fast", workDate: "2026-09-18", quantity: 20, attributionMode: "individual" });
    const slow = entry({ id: "slow", workDate: "2026-09-17", quantity: 50, attributionMode: "individual" });
    const board = buildWorkforcePerformance({
      asOf,
      entries: [crew, fast, slow],
      participants: [
        participant("crew", jordan),
        participant("crew", alex),
        participant("fast", jordan),
        participant("slow", jordan),
      ],
      allocations: [allocation("fast", jordan, 20), allocation("slow", jordan, 50)],
      targets: [target("crew_hour", 5000), target("person_hour", 10000)],
      labor: [
        labor("crew-jordan", jordan, asOf, 480),
        labor("crew-alex", alex, asOf, 480),
        labor("fast-jordan", jordan, "2026-09-18", 60),
        labor("slow-jordan", jordan, "2026-09-17", 600),
      ],
      people,
      jobs: [{ id: jobId, name: "North elevation spray foam" }],
      dispatches: [],
    });

    const jordanRow = board.workers.find((worker) => worker.userId === jordan);
    expect(jordanRow?.twentyEightDay.segments.map((segment) => segment.productionId).sort()).toEqual(["fast", "slow"]);
    expect(jordanRow?.twentyEightDay.efficiency).toBeCloseTo((7 / 11) * 100, 5);
    expect(formatEfficiency(jordanRow!.twentyEightDay.efficiency!)).toBe("63.6%");
    expect((200 + 50) / 2).not.toBeCloseTo(jordanRow!.twentyEightDay.efficiency!, 0);
    expect(board.crews).toHaveLength(1);
    expect(board.crews[0]?.efficiency).toBeCloseTo(100, 5);
    expect(board.workers.find((worker) => worker.userId === alex)?.twentyEightDay.segments).toEqual([]);
    expect(board.ranked).toBe(false);
    expect(jordanRow?.ranked).toBe(false);
    expect(jordanRow?.quality).toBe("not available");
  });

  it("explains unverified production, missing hours, and a missing target", () => {
    const otherJob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
    const draft = entry({ id: "draft", workDate: asOf, quantity: 40, attributionMode: "individual", status: "draft", verifiedBy: null, verifiedAt: null });
    const bare = entry({ id: "bare", workDate: asOf, quantity: 40, attributionMode: "individual" });
    const untargeted = entry({
      id: "other",
      workDate: "2026-09-16",
      quantity: 10,
      attributionMode: "individual",
      workType: "attic",
    });
    const missing = entry({ id: "missing", workDate: asOf, quantity: 5, attributionMode: "individual", jobId: otherJob });
    const board = buildWorkforcePerformance({
      asOf,
      entries: [draft, bare, untargeted, missing],
      participants: [
        participant("draft", jordan),
        participant("bare", jordan),
        participant("other", jordan),
        participant("missing", jordan),
      ],
      allocations: [
        allocation("draft", jordan, 40),
        allocation("bare", jordan, 40),
        allocation("other", jordan, 10),
        allocation("missing", jordan, 5),
      ],
      targets: [target("person_hour")],
      labor: [
        labor("bare-hours", jordan, asOf, 480),
        labor("other-hours", jordan, "2026-09-16", 60),
      ],
      people,
      jobs: [
        { id: jobId, name: "North elevation spray foam" },
        { id: otherJob, name: "Mechanical room fireproofing" },
      ],
      dispatches: [{ userId: alex, jobId, workDate: asOf, status: "scheduled" }],
    });
    const jordanRow = board.workers.find((worker) => worker.userId === jordan);
    expect(jordanRow?.nextAction).toBe("Production awaiting review.");
    expect(jordanRow?.today.segments).toHaveLength(1);
    expect(jordanRow?.today.excluded.map((row) => row.reason)).toContain("Hours are missing.");
    expect(jordanRow?.twentyEightDay.excluded.map((row) => row.reason)).toContain("No approved target applies.");
    expect(board.exceptions.map((row) => row.kind)).toEqual(
      expect.arrayContaining(["awaiting_review", "missing_production"]),
    );
    expect(board.exceptions.some((row) => row.kind === "missing_labor" && row.label.includes("Mechanical room"))).toBe(true);
  });

  it("does not rank a worker until the sample is large enough", () => {
    const shifts = ["2026-09-17", "2026-09-18", "2026-09-19"].map((workDate, index) =>
      entry({ id: `shift-${index}`, workDate, quantity: 40, attributionMode: "individual" }),
    );
    const board = buildWorkforcePerformance({
      asOf,
      entries: shifts,
      participants: shifts.map((shift) => participant(shift.id, jordan)),
      allocations: shifts.map((shift) => allocation(shift.id, jordan, 40)),
      targets: [target("person_hour")],
      labor: shifts.map((shift) => labor(shift.id, jordan, shift.workDate, 480)),
      people,
      jobs: [{ id: jobId, name: "North elevation spray foam" }],
      dispatches: [],
    });
    const jordanRow = board.workers.find((worker) => worker.userId === jordan);
    expect(jordanRow?.twentyEightDay.eligibleForRank).toBe(true);
    expect(jordanRow?.ranked).toBe(false);
    expect(jordanRow?.today.efficiency).toBeCloseTo(100, 5);
    expect(jordanRow?.nextAction).toBe("Today's verified production is on the target.");
    expect(jordanRow?.personalBests[0]?.label).toBe("spray foam · wall · bags");
  });
});
