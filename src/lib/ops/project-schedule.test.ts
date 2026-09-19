import { describe, expect, it } from "vitest";
import {
  createScheduleWindow,
  getJobScheduleState,
  getTaskProgress,
  getTaskScheduleState,
  isTaskOutsideJobRange,
} from "@/lib/ops/project-schedule";

const today = new Date("2026-09-19T12:00:00-04:00");

describe("project schedule", () => {
  it("calculates task progress without inventing progress for empty jobs", () => {
    expect(getTaskProgress([])).toEqual({
      completed: 0,
      total: 0,
      percent: null,
    });
    expect(
      getTaskProgress([{ status: "done" }, { status: "open" }]),
    ).toEqual({ completed: 1, total: 2, percent: 50 });
  });

  it("gives complete precedence over overdue for tasks", () => {
    expect(
      getTaskScheduleState(
        { status: "done", dueAt: "2026-09-01T12:00:00.000Z" },
        today,
      ),
    ).toBe("complete");
    expect(
      getTaskScheduleState(
        { status: "open", dueAt: "2026-09-01T12:00:00.000Z" },
        today,
      ),
    ).toBe("overdue");
    expect(
      getTaskScheduleState({ status: "open", dueAt: null }, today),
    ).toBe("unscheduled");
  });

  it("gives blocked precedence over overdue for jobs", () => {
    expect(
      getJobScheduleState(
        {
          status: "blocked",
          plannedStartAt: "2026-09-01T12:00:00.000Z",
          plannedEndAt: "2026-09-02T12:00:00.000Z",
        },
        today,
      ),
    ).toBe("blocked");
  });

  it("creates bounded week and month windows", () => {
    const week = createScheduleWindow("week", today);
    const month = createScheduleWindow("month", today);

    expect(week.columns).toHaveLength(42);
    expect(week.start.getDay()).toBe(1);
    expect(month.columns).toHaveLength(6);
    expect(month.start.getDate()).toBe(1);
  });

  it("warns when a task falls outside its job", () => {
    expect(
      isTaskOutsideJobRange(
        {
          plannedStartAt: "2026-08-31T12:00:00.000Z",
          plannedEndAt: "2026-09-05T12:00:00.000Z",
        },
        {
          plannedStartAt: "2026-09-01T12:00:00.000Z",
          plannedEndAt: "2026-09-30T12:00:00.000Z",
        },
      ),
    ).toBe(true);
  });
});
