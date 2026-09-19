import { describe, expect, it } from "vitest";
import {
  calculateCriticalPath,
  validateDependencyAddition,
  validateDependencyDates,
} from "@/lib/ops/project-schedule-graph";

const tasks = [
  {
    id: "a",
    title: "Prep",
    plannedStartAt: "2026-09-01T00:00:00.000Z",
    plannedEndAt: "2026-09-02T00:00:00.000Z",
  },
  {
    id: "b",
    title: "Install",
    plannedStartAt: "2026-09-03T00:00:00.000Z",
    plannedEndAt: "2026-09-05T00:00:00.000Z",
  },
  {
    id: "c",
    title: "Inspect",
    plannedStartAt: "2026-09-03T00:00:00.000Z",
    plannedEndAt: "2026-09-03T00:00:00.000Z",
  },
] as const;

const edges = [
  { predecessorTaskId: "a", successorTaskId: "b", lagDays: 0 },
] as const;

describe("project schedule graph", () => {
  it("rejects self, duplicate, and circular dependencies", () => {
    expect(
      validateDependencyAddition(tasks, edges, {
        predecessorTaskId: "a",
        successorTaskId: "a",
        lagDays: 0,
      }).ok,
    ).toBe(false);
    expect(
      validateDependencyAddition(tasks, edges, {
        predecessorTaskId: "a",
        successorTaskId: "b",
        lagDays: 0,
      }).ok,
    ).toBe(false);
    expect(
      validateDependencyAddition(tasks, edges, {
        predecessorTaskId: "b",
        successorTaskId: "a",
        lagDays: 0,
      }).ok,
    ).toBe(false);
  });

  it("calculates the longest dependency chain as critical", () => {
    const result = calculateCriticalPath(tasks, edges);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.criticalTaskIds]).toEqual(["a", "b"]);
    expect(result.metrics.get("c")?.totalFloatDays).toBeGreaterThan(0);
  });

  it("fails closed when persisted edges contain a cycle", () => {
    const result = calculateCriticalPath(tasks, [
      ...edges,
      { predecessorTaskId: "b", successorTaskId: "a", lagDays: 0 },
    ]);
    expect(result).toEqual({
      ok: false,
      error: "The dependency graph contains a cycle.",
    });
  });

  it("rejects dates that violate finish-to-start lag", () => {
    const result = validateDependencyDates(
      [
        tasks[0],
        {
          ...tasks[1],
          plannedStartAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      edges,
    );
    expect(result.ok).toBe(false);
  });
});
