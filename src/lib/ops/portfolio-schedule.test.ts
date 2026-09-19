import { describe, expect, it } from "vitest";
import type {
  ProjectScheduleJob,
  ProjectScheduleTask,
} from "@/lib/ops/project-schedule";
import {
  buildPortfolioProjects,
  filterPortfolioProjects,
  getPortfolioProjectRange,
  getPortfolioProjectState,
  type PortfolioProjectionFilter,
  type PortfolioScheduleProject,
} from "@/lib/ops/portfolio-schedule";
import { DEFAULT_WORKING_CALENDAR } from "@/lib/ops/project-schedule-planning";

const now = new Date("2026-09-19T12:00:00.000Z");

function task(
  overrides: Partial<ProjectScheduleTask> = {},
): ProjectScheduleTask {
  return {
    id: "task-1",
    jobId: "job-1",
    title: "Task",
    assignee: null,
    status: "open",
    dueAt: null,
    plannedStartAt: null,
    plannedEndAt: null,
    completedAt: null,
    ...overrides,
  };
}

function job(overrides: Partial<ProjectScheduleJob> = {}): ProjectScheduleJob {
  return {
    id: "job-1",
    number: "JOB-1",
    name: "North wall",
    status: "in_progress",
    projectManager: "Alex Rivera",
    foreman: null,
    plannedStartAt: null,
    plannedEndAt: null,
    tasks: [],
    ...overrides,
  };
}

function project(
  overrides: Partial<PortfolioScheduleProject> = {},
): PortfolioScheduleProject {
  return {
    id: "project-1",
    name: "Podium",
    status: "active",
    projectManager: "Alex Rivera",
    calendar: DEFAULT_WORKING_CALENDAR,
    latestBaseline: null,
    dependencies: [],
    jobs: [],
    ...overrides,
  };
}

function filter(
  overrides: Partial<PortfolioProjectionFilter> = {},
): PortfolioProjectionFilter {
  return {
    state: "all",
    attention: "all",
    from: null,
    to: null,
    hideCompleted: false,
    overlapProjectIds: new Set(),
    ...overrides,
  };
}

describe("portfolio schedule", () => {
  it("keeps projects with no jobs without inventing dates or progress", () => {
    const [result] = buildPortfolioProjects([project()], now);

    expect(result).toMatchObject({
      id: "project-1",
      state: "unscheduled",
      range: { start: null, finish: null },
      progress: { completed: 0, total: 0, percent: null },
    });
  });

  it("uses truthful child dates and ignores invalid dates", () => {
    const result = getPortfolioProjectRange(
      project({
        jobs: [
          job({
            plannedStartAt: "2026-09-10",
            plannedEndAt: "not-a-date",
            tasks: [
              task({
                plannedStartAt: null,
                plannedEndAt: "2026-09-22",
                dueAt: "2026-09-25",
              }),
            ],
          }),
        ],
      }),
    );

    expect(result).toEqual({
      start: "2026-09-10",
      finish: "2026-09-25",
    });
  });

  it("gives closed then blocked precedence over overdue work", () => {
    const blockedAndOverdue = project({
      jobs: [
        job({
          status: "blocked",
          plannedStartAt: "2026-09-01",
          plannedEndAt: "2026-09-10",
        }),
      ],
    });

    expect(getPortfolioProjectState(blockedAndOverdue, now)).toBe("blocked");
    expect(
      getPortfolioProjectState(
        { ...blockedAndOverdue, status: "closed" },
        now,
      ),
    ).toBe("complete");
  });

  it("marks work with no usable schedule date as unscheduled", () => {
    expect(
      getPortfolioProjectState(
        project({
          jobs: [
            job({
              plannedStartAt: "invalid",
              tasks: [task({ dueAt: "also-invalid" })],
            }),
          ],
        }),
        now,
      ),
    ).toBe("unscheduled");
  });

  it("rejects impossible calendar dates throughout range and state", () => {
    const impossible = project({
      jobs: [
        job({
          plannedStartAt: "2026-02-30",
          tasks: [task({ dueAt: "2026-02-30T12:00:00.000Z" })],
        }),
      ],
    });

    expect(getPortfolioProjectRange(impossible)).toEqual({
      start: null,
      finish: null,
    });
    expect(getPortfolioProjectState(impossible, now)).toBe("unscheduled");
  });

  it("calculates latest-baseline finish variance in project working days", () => {
    const [result] = buildPortfolioProjects(
      [
        project({
          jobs: [
            job({
              plannedStartAt: "2026-09-10",
              plannedEndAt: "2026-09-22",
            }),
          ],
          latestBaseline: {
            id: "baseline-1",
            name: "Approved",
            capturedAt: "2026-09-01T12:00:00.000Z",
            items: [
              {
                id: "baseline-item-1",
                baselineId: "baseline-1",
                entityType: "job",
                entityId: "job-1",
                plannedStartAt: "2026-09-10",
                plannedEndAt: "2026-09-18",
                dueAt: null,
              },
            ],
          },
        }),
      ],
      now,
    );

    expect(result?.baselineFinishVarianceDays).toBe(2);
  });

  it("does not calculate variance from an impossible baseline date", () => {
    const [result] = buildPortfolioProjects(
      [
        project({
          jobs: [job({ plannedEndAt: "2026-09-22" })],
          latestBaseline: {
            id: "baseline-1",
            name: "Approved",
            capturedAt: "2026-09-01",
            items: [
              {
                id: "baseline-item-1",
                baselineId: "baseline-1",
                entityType: "job",
                entityId: "job-1",
                plannedStartAt: null,
                plannedEndAt: "2026-02-30",
                dueAt: null,
              },
            ],
          },
        }),
      ],
      now,
    );

    expect(result?.baselineFinishVarianceDays).toBeNull();
  });

  it("counts critical tasks independently inside each project", () => {
    const dependencyProject = (id: string): PortfolioScheduleProject =>
      project({
        id,
        jobs: [
          job({
            id: `${id}-job`,
            tasks: [
              task({
                id: "a",
                jobId: `${id}-job`,
                plannedStartAt: "2026-09-14",
                plannedEndAt: "2026-09-15",
              }),
              task({
                id: "b",
                jobId: `${id}-job`,
                plannedStartAt: "2026-09-16",
                plannedEndAt: "2026-09-17",
              }),
            ],
          }),
        ],
        dependencies: [
          {
            id: `${id}-dependency`,
            projectId: id,
            predecessorTaskId: "a",
            successorTaskId: "b",
            lagDays: 0,
          },
        ],
      });

    const results = buildPortfolioProjects(
      [dependencyProject("project-a"), dependencyProject("project-b")],
      now,
    );

    expect(results.map((item) => item.warningCounts.critical)).toEqual([2, 2]);
  });

  it("ignores foreign dependency edges even when task IDs coincide", () => {
    const [result] = buildPortfolioProjects(
      [
        project({
          id: "project-a",
          jobs: [
            job({
              tasks: [
                task({
                  id: "a",
                  plannedStartAt: "2026-09-14",
                  plannedEndAt: "2026-09-14",
                }),
                task({
                  id: "b",
                  plannedStartAt: "2026-09-14",
                  plannedEndAt: "2026-09-16",
                }),
              ],
            }),
          ],
          dependencies: [
            {
              id: "foreign-dependency",
              projectId: "project-b",
              predecessorTaskId: "a",
              successorTaskId: "b",
              lagDays: 0,
            },
          ],
        }),
      ],
      now,
    );

    expect(result?.warningCounts.critical).toBe(1);
  });

  it("excludes malformed scheduled tasks from critical-path inputs", () => {
    const [result] = buildPortfolioProjects(
      [
        project({
          jobs: [
            job({
              tasks: [
                task({
                  id: "a",
                  plannedStartAt: "2026-09-14",
                  plannedEndAt: "2026-09-14",
                }),
                task({
                  id: "b",
                  plannedStartAt: "2026-09-15",
                  plannedEndAt: "2026-09-15",
                }),
                task({
                  id: "malformed",
                  plannedStartAt: "2026-02-30",
                  plannedEndAt: "2026-03-10",
                }),
              ],
            }),
          ],
          dependencies: [
            {
              id: "valid-dependency",
              projectId: "project-1",
              predecessorTaskId: "a",
              successorTaskId: "b",
              lagDays: 0,
            },
          ],
        }),
      ],
      now,
    );

    expect(result?.warningCounts.critical).toBe(2);
  });

  it("preserves project and job parents when only an overdue task matches", () => {
    const projected = buildPortfolioProjects(
      [
        project({
          jobs: [
            job({
              plannedStartAt: "2026-09-01",
              plannedEndAt: "2026-09-30",
              tasks: [
                task({ id: "late", dueAt: "2026-09-01" }),
                task({ id: "future", dueAt: "2026-09-30" }),
              ],
            }),
          ],
        }),
      ],
      now,
    );

    const results = filterPortfolioProjects(
      projected,
      filter({ state: "overdue" }),
      now,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.jobs).toHaveLength(1);
    expect(results[0]?.jobs[0]?.tasks.map((item) => item.id)).toEqual(["late"]);
  });

  it("uses date-range intersection and excludes undated projects", () => {
    const projected = buildPortfolioProjects(
      [
        project({
          id: "intersects",
          jobs: [
            job({
              plannedStartAt: "2026-09-10",
              plannedEndAt: "2026-09-22",
            }),
          ],
        }),
        project({
          id: "before",
          jobs: [
            job({
              plannedStartAt: "2026-09-01",
              plannedEndAt: "2026-09-05",
            }),
          ],
        }),
        project({ id: "undated" }),
      ],
      now,
    );

    expect(
      filterPortfolioProjects(
        projected,
        filter({ from: "2026-09-20", to: "2026-09-25" }),
        now,
      ).map((item) => item.id),
    ).toEqual(["intersects"]);
  });

  it("uses the project calendar date when filtering timezone boundaries", () => {
    const projected = buildPortfolioProjects(
      [
        project({
          id: "previous-local-day",
          jobs: [
            job({
              plannedStartAt: "2026-09-20T02:00:00.000Z",
            }),
          ],
        }),
        project({
          id: "matching-local-day",
          jobs: [
            job({
              plannedStartAt: "2026-09-20T14:00:00.000Z",
            }),
          ],
        }),
      ],
      now,
    );

    expect(
      filterPortfolioProjects(
        projected,
        filter({ from: "2026-09-20" }),
        now,
      ).map((item) => item.id),
    ).toEqual(["matching-local-day"]);
    expect(
      filterPortfolioProjects(
        projected,
        filter({ from: "2026-09-20", to: "2026-09-20" }),
        now,
      ).map((item) => item.id),
    ).toEqual(["matching-local-day"]);
  });

  it("uses strict dates consistently for warnings and state filters", () => {
    const projected = buildPortfolioProjects(
      [
        project({
          jobs: [
            job({
              plannedEndAt: "2026-02-30",
              tasks: [task({ dueAt: "2026-02-30" })],
            }),
          ],
        }),
      ],
      now,
    );

    expect(projected[0]).toMatchObject({
      state: "unscheduled",
      warningCounts: { overdue: 0, unscheduled: 2 },
    });
    expect(
      filterPortfolioProjects(
        projected,
        filter({ state: "overdue" }),
        now,
      ),
    ).toEqual([]);
    expect(
      filterPortfolioProjects(
        projected,
        filter({ state: "unscheduled" }),
        now,
      ),
    ).toHaveLength(1);
  });

  it("hides completed rows without changing source project progress", () => {
    const projected = buildPortfolioProjects(
      [
        project({
          jobs: [
            job({
              plannedStartAt: "2026-09-10",
              plannedEndAt: "2026-09-22",
              tasks: [
                task({
                  id: "done",
                  status: "done",
                  plannedEndAt: "2026-09-12",
                }),
                task({ id: "open", plannedEndAt: "2026-09-22" }),
              ],
            }),
          ],
        }),
      ],
      now,
    );

    const [result] = filterPortfolioProjects(
      projected,
      filter({ hideCompleted: true }),
      now,
    );

    expect(result?.jobs[0]?.tasks.map((item) => item.id)).toEqual(["open"]);
    expect(result?.progress).toEqual({
      completed: 1,
      total: 2,
      percent: 50,
    });
    expect(projected[0]?.jobs[0]?.tasks).toHaveLength(2);
  });

  it("requires positive variance or an overlap project for attention filters", () => {
    const projected = buildPortfolioProjects(
      [
        project({
          id: "behind",
          jobs: [
            job({
              plannedStartAt: "2026-09-10",
              plannedEndAt: "2026-09-22",
            }),
          ],
          latestBaseline: {
            id: "baseline-1",
            name: "Approved",
            capturedAt: "2026-09-01",
            items: [
              {
                id: "baseline-item-1",
                baselineId: "baseline-1",
                entityType: "job",
                entityId: "job-1",
                plannedStartAt: null,
                plannedEndAt: "2026-09-18",
                dueAt: null,
              },
            ],
          },
        }),
        project({
          id: "ahead",
          jobs: [
            job({
              plannedStartAt: "2026-09-10",
              plannedEndAt: "2026-09-17",
            }),
          ],
          latestBaseline: {
            id: "baseline-2",
            name: "Approved",
            capturedAt: "2026-09-01",
            items: [
              {
                id: "baseline-item-2",
                baselineId: "baseline-2",
                entityType: "job",
                entityId: "job-1",
                plannedStartAt: null,
                plannedEndAt: "2026-09-18",
                dueAt: null,
              },
            ],
          },
        }),
      ],
      now,
    );

    expect(
      filterPortfolioProjects(
        projected,
        filter({ attention: "behind-baseline" }),
        now,
      ).map((item) => item.id),
    ).toEqual(["behind"]);
    expect(
      filterPortfolioProjects(
        projected,
        filter({
          attention: "resource-overlap",
          overlapProjectIds: new Set(["ahead"]),
        }),
        now,
      ).map((item) => item.id),
    ).toEqual(["ahead"]);
  });

  it("returns null variance when current or baseline finish is missing", () => {
    const [missingCurrent, missingBaseline] = buildPortfolioProjects(
      [
        project({
          id: "missing-current",
          latestBaseline: {
            id: "baseline-1",
            name: "Approved",
            capturedAt: "2026-09-01",
            items: [
              {
                id: "baseline-item-1",
                baselineId: "baseline-1",
                entityType: "job",
                entityId: "job-1",
                plannedStartAt: null,
                plannedEndAt: "2026-09-18",
                dueAt: null,
              },
            ],
          },
        }),
        project({
          id: "missing-baseline",
          jobs: [job({ plannedEndAt: "2026-09-22" })],
          latestBaseline: {
            id: "baseline-2",
            name: "Approved",
            capturedAt: "2026-09-01",
            items: [
              {
                id: "baseline-item-2",
                baselineId: "baseline-2",
                entityType: "job",
                entityId: "job-1",
                plannedStartAt: "2026-09-10",
                plannedEndAt: null,
                dueAt: null,
              },
            ],
          },
        }),
      ],
      now,
    );

    expect(missingCurrent?.baselineFinishVarianceDays).toBeNull();
    expect(missingBaseline?.baselineFinishVarianceDays).toBeNull();
  });

  it("does not retain mutable aliases from source projects", () => {
    const source = project({
      jobs: [job({ tasks: [task()] })],
      dependencies: [
        {
          id: "dependency-1",
          projectId: "project-1",
          predecessorTaskId: "a",
          successorTaskId: "b",
          lagDays: 0,
        },
      ],
    });
    const [result] = buildPortfolioProjects([source], now);

    expect(result?.jobs).not.toBe(source.jobs);
    expect(result?.jobs[0]).not.toBe(source.jobs[0]);
    expect(result?.jobs[0]?.tasks).not.toBe(source.jobs[0]?.tasks);
    expect(result?.dependencies).not.toBe(source.dependencies);
  });
});
