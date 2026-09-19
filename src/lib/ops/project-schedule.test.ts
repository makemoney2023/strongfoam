import { describe, expect, it } from "vitest";
import {
  createScheduleWindow,
  filterScheduleJobs,
  getJobGeometry,
  getJobScheduleState,
  getTaskGeometry,
  getTaskProgress,
  getTaskScheduleState,
  hideCompletedScheduleRows,
  isTaskOutsideJobRange,
  moveScheduleAnchor,
  positionInWindow,
  shiftScheduleDates,
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

  it("uses truthful task and job geometry", () => {
    expect(
      getTaskGeometry({
        plannedStartAt: "2026-09-20T12:00:00.000Z",
        plannedEndAt: "2026-09-22T12:00:00.000Z",
        dueAt: "2026-09-23T12:00:00.000Z",
      }),
    ).toEqual({
      kind: "bar",
      start: "2026-09-20T12:00:00.000Z",
      end: "2026-09-22T12:00:00.000Z",
    });
    expect(
      getTaskGeometry({
        plannedStartAt: "2026-09-20T12:00:00.000Z",
        plannedEndAt: null,
        dueAt: null,
      }),
    ).toEqual({
      kind: "milestone",
      date: "2026-09-20T12:00:00.000Z",
      source: "planned",
    });
    expect(
      getTaskGeometry({
        plannedStartAt: null,
        plannedEndAt: null,
        dueAt: "2026-09-23T12:00:00.000Z",
      }),
    ).toEqual({
      kind: "milestone",
      date: "2026-09-23T12:00:00.000Z",
      source: "due",
    });
    expect(
      getTaskGeometry({
        plannedStartAt: null,
        plannedEndAt: null,
        dueAt: null,
      }),
    ).toEqual({ kind: "unscheduled" });
    expect(
      getJobGeometry({
        plannedStartAt: null,
        plannedEndAt: "2026-09-23T12:00:00.000Z",
      }),
    ).toEqual({
      kind: "milestone",
      date: "2026-09-23T12:00:00.000Z",
      source: "planned",
    });
  });

  it("keeps the parent job when only a child task matches", () => {
    const visible = filterScheduleJobs(
      [
        {
          id: "job-1",
          number: "JOB-1",
          name: "Podium",
          status: "in_progress",
          projectManager: null,
          foreman: null,
          plannedStartAt: "2026-09-01T12:00:00.000Z",
          plannedEndAt: "2026-09-30T12:00:00.000Z",
          tasks: [
            {
              id: "task-1",
              jobId: "job-1",
              title: "Late task",
              assignee: null,
              status: "open",
              dueAt: "2026-09-01T12:00:00.000Z",
              plannedStartAt: null,
              plannedEndAt: null,
              completedAt: null,
            },
          ],
        },
      ],
      "overdue",
      today,
    );

    expect(visible).toHaveLength(1);
    expect(visible[0].tasks.map((task) => task.id)).toEqual(["task-1"]);
  });

  it("keeps every child task beneath a blocked job", () => {
    const visible = filterScheduleJobs(
      [
        {
          id: "job-1",
          number: "JOB-1",
          name: "Podium",
          status: "blocked",
          projectManager: null,
          foreman: null,
          plannedStartAt: null,
          plannedEndAt: null,
          tasks: [
            {
              id: "task-1",
              jobId: "job-1",
              title: "Open task",
              assignee: null,
              status: "open",
              dueAt: null,
              plannedStartAt: null,
              plannedEndAt: null,
              completedAt: null,
            },
          ],
        },
      ],
      "blocked",
      today,
    );

    expect(visible[0]?.tasks).toHaveLength(1);
  });

  it("hides completed rows without changing their source collection", () => {
    const jobs = [
      {
        id: "job-1",
        number: "JOB-1",
        name: "Podium",
        status: "in_progress" as const,
        projectManager: null,
        foreman: null,
        plannedStartAt: null,
        plannedEndAt: null,
        tasks: [
          {
            id: "task-1",
            jobId: "job-1",
            title: "Done task",
            assignee: null,
            status: "done" as const,
            dueAt: null,
            plannedStartAt: null,
            plannedEndAt: null,
            completedAt: null,
          },
          {
            id: "task-2",
            jobId: "job-1",
            title: "Open task",
            assignee: null,
            status: "open" as const,
            dueAt: null,
            plannedStartAt: null,
            plannedEndAt: null,
            completedAt: null,
          },
        ],
      },
    ];

    expect(hideCompletedScheduleRows(jobs)[0]?.tasks).toHaveLength(1);
    expect(jobs[0]?.tasks).toHaveLength(2);
  });

  it("positions only dates inside the visible window", () => {
    const window = createScheduleWindow("week", today);

    expect(positionInWindow(window.start, window)).toBe(0);
    expect(positionInWindow(window.end, window)).toBe(100);
    expect(
      positionInWindow(new Date(window.start.getTime() - 1), window),
    ).toBeNull();
  });

  it("moves anchors by one full visible window", () => {
    const week = moveScheduleAnchor(today, "week", 1);
    const month = moveScheduleAnchor(today, "month", -1);

    expect(week.getDate()).toBe(31);
    expect(month.getMonth()).toBe(2);
  });

  it("clamps month anchors to the destination month end", () => {
    const augustEnd = new Date(2026, 7, 31, 12, 30, 0, 0);
    const result = moveScheduleAnchor(augustEnd, "month", 1);

    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(28);
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(30);
  });

  it("clamps month anchors to leap day when available", () => {
    const augustEnd = new Date(2027, 7, 31, 12, 0, 0, 0);
    const result = moveScheduleAnchor(augustEnd, "month", 1);

    expect(result.getFullYear()).toBe(2028);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(29);
  });

  it("clamps negative six-month navigation without changing week behavior", () => {
    const augustEnd = new Date(2026, 7, 31, 12, 0, 0, 0);
    const month = moveScheduleAnchor(augustEnd, "month", -1);
    const week = moveScheduleAnchor(augustEnd, "week", -1);

    expect(month.getFullYear()).toBe(2026);
    expect(month.getMonth()).toBe(1);
    expect(month.getDate()).toBe(28);
    expect(week.getTime()).toBe(
      new Date(2026, 6, 20, 12, 0, 0, 0).getTime(),
    );
  });

  it("shifts a task range by working days while preserving duration", () => {
    expect(
      shiftScheduleDates(
        {
          plannedStartAt: "2026-09-10T12:00:00.000Z",
          plannedEndAt: "2026-09-12T12:00:00.000Z",
          dueAt: null,
        },
        3,
      ),
    ).toEqual({
      plannedStartAt: "2026-09-15T12:00:00.000Z",
      plannedEndAt: "2026-09-16T12:00:00.000Z",
      dueAt: null,
    });
  });

  it("moves only dueAt for a due-only milestone", () => {
    expect(
      shiftScheduleDates(
        {
          plannedStartAt: null,
          plannedEndAt: null,
          dueAt: "2026-09-10T12:00:00.000Z",
        },
        -2,
      ).dueAt,
    ).toBe("2026-09-08T12:00:00.000Z");
  });

  it("moves Friday by one working day to Monday", () => {
    expect(
      shiftScheduleDates(
        {
          plannedStartAt: "2026-09-18T12:00:00.000Z",
          plannedEndAt: null,
          dueAt: null,
        },
        1,
      ).plannedStartAt,
    ).toBe("2026-09-21T12:00:00.000Z");
  });
});
