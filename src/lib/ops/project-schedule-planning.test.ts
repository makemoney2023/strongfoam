import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKING_CALENDAR,
  addWorkingDays,
  buildResourceLanes,
  calculateBaselineVariance,
  isWorkingDay,
  workingDayDifference,
  type ScheduleAssignment,
} from "@/lib/ops/project-schedule-planning";

describe("project schedule planning", () => {
  it("uses weekends and dated overrides consistently", () => {
    const calendar = {
      timeZone: "America/Toronto",
      weekendDays: [0, 6],
      exceptions: [
        { date: "2026-09-21", isWorkingDay: false },
        { date: "2026-09-26", isWorkingDay: true },
      ],
    };
    expect(isWorkingDay("2026-09-20", calendar)).toBe(false);
    expect(isWorkingDay("2026-09-21", calendar)).toBe(false);
    expect(isWorkingDay("2026-09-26", calendar)).toBe(true);
    expect(addWorkingDays("2026-09-18", 1, calendar)).toBe("2026-09-22");
  });

  it("calculates signed baseline variance and explicit item states", () => {
    expect(
      calculateBaselineVariance(
        {
          plannedStartAt: "2026-09-10",
          plannedEndAt: "2026-09-14",
        },
        {
          plannedStartAt: "2026-09-08",
          plannedEndAt: "2026-09-11",
        },
        DEFAULT_WORKING_CALENDAR,
      ),
    ).toMatchObject({
      state: "changed",
      startVarianceDays: 2,
      finishVarianceDays: 1,
    });
    expect(
      calculateBaselineVariance(
        { plannedStartAt: "2026-09-10" },
        null,
        DEFAULT_WORKING_CALENDAR,
      ).state,
    ).toBe("added");
  });

  it("counts working-day differences in both directions", () => {
    expect(
      workingDayDifference(
        "2026-09-18",
        "2026-09-21",
        DEFAULT_WORKING_CALENDAR,
      ),
    ).toBe(1);
    expect(
      workingDayDifference(
        "2026-09-21",
        "2026-09-18",
        DEFAULT_WORKING_CALENDAR,
      ),
    ).toBe(-1);
  });

  it("groups free-text assignments and flags range overlap", () => {
    const assignment = (
      id: string,
      resource: string,
      start: string,
      end: string,
    ): ScheduleAssignment => ({
      id,
      resource,
      role: "Task assignee",
      entityType: "task",
      label: id,
      href: `/tasks/${id}`,
      plannedStartAt: start,
      plannedEndAt: end,
      dueAt: null,
    });
    const lanes = buildResourceLanes(
      [
        assignment("one", " Alex Smith ", "2026-09-10", "2026-09-11"),
        assignment("two", "alex  smith", "2026-09-11", "2026-09-14"),
      ],
      DEFAULT_WORKING_CALENDAR,
    );
    expect(lanes).toHaveLength(1);
    expect(lanes[0]?.displayName).toBe("Alex Smith");
    expect(lanes[0]?.potentialOverlapCount).toBe(1);
  });

  it("does not treat weekend-only or due-only items as overlaps", () => {
    const assignments: ScheduleAssignment[] = [
      {
        id: "weekend-one",
        resource: "Alex",
        role: "Foreman",
        entityType: "job",
        label: "Weekend one",
        href: "/jobs/1",
        plannedStartAt: "2026-09-19",
        plannedEndAt: "2026-09-20",
      },
      {
        id: "weekend-two",
        resource: "alex",
        role: "Project manager",
        entityType: "job",
        label: "Weekend two",
        href: "/jobs/2",
        plannedStartAt: "2026-09-19",
        plannedEndAt: "2026-09-20",
      },
      {
        id: "due",
        resource: "Alex",
        role: "Task assignee",
        entityType: "task",
        label: "Due",
        href: "/tasks/due",
        dueAt: "2026-09-19",
      },
    ];
    expect(
      buildResourceLanes(assignments, DEFAULT_WORKING_CALENDAR)[0]
        ?.potentialOverlapCount,
    ).toBe(0);
  });
});
