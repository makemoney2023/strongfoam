import { describe, expect, it } from "vitest";
// @ts-expect-error jsdom does not publish bundled TypeScript declarations.
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PORTFOLIO_RESOURCE_PAGE_SIZE,
  PortfolioResourceSchedule,
} from "@/components/ops/portfolio-resource-schedule";
import type {
  ProjectScheduleJob,
  ProjectScheduleTask,
  ScheduleWindow,
} from "@/lib/ops/project-schedule";
import { createScheduleWindow } from "@/lib/ops/project-schedule";
import {
  buildPortfolioResourceLanes,
  buildPortfolioScheduleAssignments,
  buildPortfolioProjects,
  createPortfolioOverlapDiagnostics,
  filterPortfolioProjects,
  getPortfolioBaselineState,
  getPortfolioJobScheduleState,
  getPortfolioProjectRange,
  getPortfolioProjectState,
  getPortfolioResourceGeometry,
  getPortfolioTaskScheduleState,
  getPortfolioWorkingDayGradient,
  getPortfolioWorkingDaySegments,
  isPortfolioWorkingDay,
  localScheduleDateKey,
  normalizePortfolioScheduleDates,
  portfolioCalendarDate,
  PORTFOLIO_UNASSIGNED_RESOURCE_KEY,
  serializePortfolioSchedule,
  type PortfolioProjectionFilter,
  type PortfolioScheduleAssignment,
  type PortfolioScheduleProject,
} from "@/lib/ops/portfolio-schedule";
import {
  DEFAULT_WORKING_CALENDAR,
  type ResolvedWorkingCalendar,
} from "@/lib/ops/project-schedule-planning";
import type { PortfolioScheduleStoreResult } from "@/lib/ops/store";

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

const rowDate = new Date("2026-09-01T10:00:00.000Z");

function rawProject(
  overrides: Partial<PortfolioScheduleStoreResult["projects"][number]> = {},
): PortfolioScheduleStoreResult["projects"][number] {
  return {
    id: "project-1",
    createdAt: rowDate,
    updatedAt: rowDate,
    companyId: null,
    siteId: null,
    opportunityId: null,
    sourceLeadId: null,
    name: "Project one",
    status: "active",
    projectManager: "Alex Rivera",
    scheduleCalendarId: null,
    ...overrides,
  };
}

function rawJob(
  overrides: Partial<PortfolioScheduleStoreResult["jobs"][number]> = {},
): PortfolioScheduleStoreResult["jobs"][number] {
  return {
    id: "job-1",
    createdAt: rowDate,
    updatedAt: rowDate,
    projectId: "project-1",
    companyId: null,
    siteId: null,
    opportunityId: null,
    name: "Job one",
    status: "in_progress",
    scope: null,
    services: ["Formwork"],
    projectManager: "Alex Rivera",
    foreman: null,
    plannedStartAt: new Date("2026-09-10T12:00:00.000Z"),
    plannedEndAt: new Date("2026-09-15T12:00:00.000Z"),
    blockerNote: null,
    ...overrides,
  };
}

function rawTask(
  overrides: Partial<PortfolioScheduleStoreResult["tasks"][number]> = {},
): PortfolioScheduleStoreResult["tasks"][number] {
  return {
    id: "task-1",
    createdAt: rowDate,
    updatedAt: rowDate,
    jobId: "job-1",
    workAreaId: null,
    title: "Task one",
    assignee: null,
    dueAt: new Date("2026-09-15T12:00:00.000Z"),
    plannedStartAt: new Date("2026-09-10T12:00:00.000Z"),
    plannedEndAt: new Date("2026-09-14T12:00:00.000Z"),
    completedAt: null,
    status: "open",
    createdBy: "scheduler@example.com",
    ...overrides,
  };
}

function rawDependency(
  overrides: Partial<
    PortfolioScheduleStoreResult["dependencies"][number]
  > = {},
): PortfolioScheduleStoreResult["dependencies"][number] {
  return {
    id: "dependency-1",
    createdAt: rowDate,
    projectId: "project-1",
    predecessorTaskId: "task-1",
    successorTaskId: "task-2",
    lagDays: 0,
    createdBy: "scheduler@example.com",
    ...overrides,
  };
}

function rawCalendar(
  overrides: Partial<PortfolioScheduleStoreResult["calendars"][number]> = {},
): PortfolioScheduleStoreResult["calendars"][number] {
  return {
    id: "calendar-default",
    createdAt: rowDate,
    updatedAt: rowDate,
    updatedBy: "scheduler@example.com",
    name: "Default calendar",
    timeZone: "America/Toronto",
    weekendDays: [0, 6],
    isDefault: true,
    ...overrides,
  };
}

function rawCalendarException(
  overrides: Partial<
    PortfolioScheduleStoreResult["calendarExceptions"][number]
  > = {},
): PortfolioScheduleStoreResult["calendarExceptions"][number] {
  return {
    id: "exception-1",
    createdAt: rowDate,
    updatedAt: rowDate,
    updatedBy: "scheduler@example.com",
    calendarId: "calendar-default",
    date: "2026-12-25",
    name: "Christmas",
    isWorkingDay: false,
    ...overrides,
  };
}

function rawBaseline(
  overrides: Partial<PortfolioScheduleStoreResult["baselines"][number]> = {},
): PortfolioScheduleStoreResult["baselines"][number] {
  return {
    id: "baseline-1",
    projectId: "project-1",
    name: "Approved",
    capturedAt: new Date("2026-09-05T12:00:00.000Z"),
    capturedBy: "scheduler@example.com",
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

function rawBaselineItem(
  overrides: Partial<
    PortfolioScheduleStoreResult["baselineItems"][number]
  > = {},
): PortfolioScheduleStoreResult["baselineItems"][number] {
  return {
    id: "baseline-item-1",
    baselineId: "baseline-1",
    entityType: "job",
    entityId: "job-1",
    plannedStartAt: new Date("2026-09-10T12:00:00.000Z"),
    plannedEndAt: new Date("2026-09-15T12:00:00.000Z"),
    dueAt: null,
    ...overrides,
  };
}

function rawSchedule(
  overrides: Partial<PortfolioScheduleStoreResult> = {},
): PortfolioScheduleStoreResult {
  return {
    projects: [],
    jobs: [],
    tasks: [],
    dependencies: [],
    calendars: [],
    calendarExceptions: [],
    baselines: [],
    baselineItems: [],
    truncation: {
      projects: false,
      jobs: false,
      tasks: false,
      dependencies: false,
      calendarExceptions: false,
      baselineItems: false,
    },
    ...overrides,
  };
}

function containsDate(value: unknown): boolean {
  if (value instanceof Date) return true;
  if (Array.isArray(value)) return value.some(containsDate);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(containsDate);
  }
  return false;
}

describe("serializePortfolioSchedule", () => {
  it("assembles projects with independent calendars, dependencies, and baselines", () => {
    const result = serializePortfolioSchedule(
      rawSchedule({
        projects: [
          rawProject({
            id: "project-2",
            name: "Second",
            scheduleCalendarId: "calendar-2",
          }),
          rawProject({
            id: "project-1",
            name: "First",
            scheduleCalendarId: "calendar-1",
          }),
        ],
        jobs: [
          rawJob({ id: "job-1a", projectId: "project-1" }),
          rawJob({ id: "job-2a", projectId: "project-2" }),
          rawJob({ id: "job-1b", projectId: "project-1" }),
        ],
        tasks: [
          rawTask({ id: "task-2", jobId: "job-2a" }),
          rawTask({ id: "task-1b", jobId: "job-1b" }),
          rawTask({ id: "task-1a", jobId: "job-1a" }),
        ],
        dependencies: [
          rawDependency({ id: "dependency-2", projectId: "project-2" }),
          rawDependency({ id: "dependency-1", projectId: "project-1" }),
        ],
        calendars: [
          rawCalendar(),
          rawCalendar({
            id: "calendar-1",
            name: "Eastern",
            timeZone: "America/New_York",
            weekendDays: [0, 6],
            isDefault: false,
          }),
          rawCalendar({
            id: "calendar-2",
            name: "Western",
            timeZone: "America/Vancouver",
            weekendDays: [5, 6],
            isDefault: false,
          }),
        ],
        calendarExceptions: [
          rawCalendarException({
            id: "exception-1",
            calendarId: "calendar-1",
            date: "2026-11-26",
            name: "Thanksgiving",
          }),
          rawCalendarException({
            id: "exception-2a",
            calendarId: "calendar-2",
            date: "2026-12-24",
            name: "Christmas Eve",
          }),
          rawCalendarException({
            id: "exception-2b",
            calendarId: "calendar-2",
            date: "2026-12-26",
            name: "Boxing Day",
          }),
        ],
        baselines: [
          rawBaseline({
            id: "baseline-2",
            projectId: "project-2",
            name: "Second baseline",
          }),
          rawBaseline({
            id: "baseline-1",
            projectId: "project-1",
            name: "First baseline",
          }),
        ],
        baselineItems: [
          rawBaselineItem({
            id: "item-1",
            baselineId: "baseline-1",
          }),
          rawBaselineItem({
            id: "item-2",
            baselineId: "baseline-2",
          }),
        ],
      }),
    );

    expect(result.projects.map((item) => item.id)).toEqual([
      "project-2",
      "project-1",
    ]);
    expect(result.projects[0]).toMatchObject({
      calendar: {
        id: "calendar-2",
        timeZone: "America/Vancouver",
        weekendDays: [5, 6],
        exceptions: [
          { id: "exception-2a", date: "2026-12-24" },
          { id: "exception-2b", date: "2026-12-26" },
        ],
      },
      latestBaseline: {
        id: "baseline-2",
        items: [{ id: "item-2" }],
      },
      dependencies: [{ id: "dependency-2", projectId: "project-2" }],
      jobs: [{ id: "job-2a", tasks: [{ id: "task-2" }] }],
    });
    expect(result.projects[1]).toMatchObject({
      calendar: {
        id: "calendar-1",
        timeZone: "America/New_York",
        exceptions: [{ id: "exception-1" }],
      },
      latestBaseline: {
        id: "baseline-1",
        items: [{ id: "item-1" }],
      },
      dependencies: [{ id: "dependency-1", projectId: "project-1" }],
      jobs: [
        { id: "job-1a", tasks: [{ id: "task-1a" }] },
        { id: "job-1b", tasks: [{ id: "task-1b" }] },
      ],
    });
  });

  it("isolates deterministically ordered calendars for projects sharing a source", () => {
    const raw = rawSchedule({
      projects: [
        rawProject({
          id: "project-1",
          scheduleCalendarId: "shared-calendar",
        }),
        rawProject({
          id: "project-2",
          scheduleCalendarId: "shared-calendar",
        }),
      ],
      calendars: [
        rawCalendar({
          id: "shared-calendar",
          isDefault: false,
        }),
      ],
      calendarExceptions: [
        rawCalendarException({
          id: "exception-a",
          calendarId: "shared-calendar",
          date: "2026-12-24",
        }),
        rawCalendarException({
          id: "exception-b",
          calendarId: "shared-calendar",
          date: "2026-12-24",
        }),
        rawCalendarException({
          id: "exception-c",
          calendarId: "shared-calendar",
          date: "2026-12-26",
        }),
      ],
    });

    const result = serializePortfolioSchedule(raw);

    expect(
      result.projects[0]?.calendar.exceptions.map((item) => item.id),
    ).toEqual(["exception-a", "exception-b", "exception-c"]);
    expect(result.projects[1]?.calendar.exceptions.map((item) => item.id)).toEqual(
      ["exception-a", "exception-b", "exception-c"],
    );
    expect(result.projects[0]?.calendar).not.toBe(
      result.projects[1]?.calendar,
    );
    expect(result.projects[0]?.calendar.weekendDays).not.toBe(
      result.projects[1]?.calendar.weekendDays,
    );
    expect(result.projects[0]?.calendar.exceptions).not.toBe(
      result.projects[1]?.calendar.exceptions,
    );

    result.projects[0]!.calendar.weekendDays.push(4);
    result.projects[0]!.calendar.exceptions[0]!.name = "Changed";

    expect(result.projects[1]?.calendar.weekendDays).toEqual([0, 6]);
    expect(result.projects[1]?.calendar.exceptions[0]?.name).toBe("Christmas");
    expect(raw.calendars[0]?.weekendDays).toEqual([0, 6]);
    expect(raw.calendarExceptions[0]?.name).toBe("Christmas");
  });

  it("keeps a selected project with no jobs in its input position", () => {
    const result = serializePortfolioSchedule(
      rawSchedule({
        projects: [
          rawProject({ id: "with-job" }),
          rawProject({ id: "without-job" }),
        ],
        jobs: [rawJob({ projectId: "with-job" })],
      }),
    );

    expect(result.projects.map((item) => item.id)).toEqual([
      "with-job",
      "without-job",
    ]);
    expect(result.projects[1]?.jobs).toEqual([]);
  });

  it("keeps a job with an invalid stored status using the safe draft fallback", () => {
    const result = serializePortfolioSchedule(
      rawSchedule({
        projects: [rawProject()],
        jobs: [rawJob({ status: "legacy_status" })],
      }),
    );

    expect(result.projects[0]?.jobs).toHaveLength(1);
    expect(result.projects[0]?.jobs[0]?.status).toBe("draft");
  });

  it("falls back from a missing explicit calendar to the selected default", () => {
    const result = serializePortfolioSchedule(
      rawSchedule({
        projects: [
          rawProject({ scheduleCalendarId: "missing-calendar" }),
        ],
        calendars: [rawCalendar()],
        calendarExceptions: [rawCalendarException()],
      }),
    );

    expect(result.projects[0]?.calendar).toEqual({
      id: "calendar-default",
      name: "Default calendar",
      timeZone: "America/Toronto",
      weekendDays: [0, 6],
      exceptions: [
        {
          id: "exception-1",
          date: "2026-12-25",
          name: "Christmas",
          isWorkingDay: false,
        },
      ],
    });
  });

  it("uses a cloned deterministic fallback when no raw default exists", () => {
    const result = serializePortfolioSchedule(
      rawSchedule({ projects: [rawProject()] }),
    );

    expect(result.projects[0]?.calendar).toEqual(DEFAULT_WORKING_CALENDAR);
    expect(result.projects[0]?.calendar).not.toBe(DEFAULT_WORKING_CALENDAR);
    expect(result.projects[0]?.calendar.weekendDays).not.toBe(
      DEFAULT_WORKING_CALENDAR.weekendDays,
    );
  });

  it("ignores orphan and unselected related rows", () => {
    const result = serializePortfolioSchedule(
      rawSchedule({
        projects: [rawProject()],
        jobs: [
          rawJob(),
          rawJob({ id: "orphan-job", projectId: "unselected-project" }),
        ],
        tasks: [
          rawTask(),
          rawTask({ id: "orphan-task", jobId: "orphan-job" }),
        ],
        dependencies: [
          rawDependency(),
          rawDependency({
            id: "orphan-dependency",
            projectId: "unselected-project",
          }),
        ],
        baselines: [
          rawBaseline(),
          rawBaseline({
            id: "orphan-baseline",
            projectId: "unselected-project",
          }),
        ],
        baselineItems: [
          rawBaselineItem(),
          rawBaselineItem({
            id: "orphan-item",
            baselineId: "orphan-baseline",
          }),
        ],
      }),
    );

    expect(result.projects[0]?.jobs.map((item) => item.id)).toEqual(["job-1"]);
    expect(result.projects[0]?.jobs[0]?.tasks.map((item) => item.id)).toEqual([
      "task-1",
    ]);
    expect(result.projects[0]?.dependencies.map((item) => item.id)).toEqual([
      "dependency-1",
    ]);
    expect(result.projects[0]?.latestBaseline?.items.map((item) => item.id)).toEqual([
      "baseline-item-1",
    ]);
  });

  it("serializes every client date and does not retain mutable raw aliases", () => {
    const raw = rawSchedule({
      projects: [rawProject()],
      jobs: [rawJob()],
      tasks: [
        rawTask({
          completedAt: new Date("2026-09-14T16:00:00.000Z"),
        }),
      ],
      calendars: [rawCalendar()],
      calendarExceptions: [rawCalendarException()],
      baselines: [rawBaseline()],
      baselineItems: [
        rawBaselineItem({
          dueAt: new Date("2026-09-16T12:00:00.000Z"),
        }),
      ],
    });

    const result = serializePortfolioSchedule(raw);

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(containsDate(result)).toBe(false);
    expect(result.projects[0]?.jobs[0]).toMatchObject({
      updatedAt: "2026-09-01T10:00:00.000Z",
      plannedStartAt: "2026-09-10T12:00:00.000Z",
      plannedEndAt: "2026-09-15T12:00:00.000Z",
      tasks: [
        {
          updatedAt: "2026-09-01T10:00:00.000Z",
          dueAt: "2026-09-15T12:00:00.000Z",
          plannedStartAt: "2026-09-10T12:00:00.000Z",
          plannedEndAt: "2026-09-14T12:00:00.000Z",
          completedAt: "2026-09-14T16:00:00.000Z",
        },
      ],
    });
    expect(result.projects[0]?.latestBaseline).toMatchObject({
      capturedAt: "2026-09-05T12:00:00.000Z",
      items: [
        {
          plannedStartAt: "2026-09-10T12:00:00.000Z",
          plannedEndAt: "2026-09-15T12:00:00.000Z",
          dueAt: "2026-09-16T12:00:00.000Z",
        },
      ],
    });

    result.projects[0]!.calendar.weekendDays.push(4);
    result.projects[0]!.calendar.exceptions[0]!.name = "Changed";
    result.projects[0]!.jobs[0]!.tasks[0]!.title = "Changed";
    result.projects[0]!.latestBaseline!.items[0]!.plannedStartAt = null;

    expect(raw.calendars[0]?.weekendDays).toEqual([0, 6]);
    expect(raw.calendarExceptions[0]?.name).toBe("Christmas");
    expect(raw.tasks[0]?.title).toBe("Task one");
    expect(raw.baselineItems[0]?.plannedStartAt).toEqual(
      new Date("2026-09-10T12:00:00.000Z"),
    );
  });

  it("preserves every truncation flag", () => {
    const result = serializePortfolioSchedule(
      rawSchedule({
        truncation: {
          projects: true,
          jobs: true,
          tasks: true,
          dependencies: true,
          calendarExceptions: true,
          baselineItems: true,
        },
      }),
    );

    expect(result.truncation).toEqual({
      projects: true,
      jobs: true,
      tasks: true,
      dependencies: true,
      calendarExceptions: true,
      baselineItems: true,
    });
  });
});

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

function calendar(
  overrides: Partial<ResolvedWorkingCalendar> = {},
): ResolvedWorkingCalendar {
  return {
    id: "calendar",
    name: "Calendar",
    timeZone: "America/Toronto",
    weekendDays: [0, 6],
    exceptions: [],
    ...overrides,
  };
}

function resourceLanes(projects: PortfolioScheduleProject[]) {
  return buildPortfolioResourceLanes(
    buildPortfolioScheduleAssignments(buildPortfolioProjects(projects, now)),
  );
}

function threeDayWindow(): ScheduleWindow {
  const starts = [21, 22, 23].map(
    (day) => new Date(2026, 8, day, 0, 0, 0, 0),
  );
  return {
    start: starts[0]!,
    end: new Date(2026, 8, 23, 23, 59, 59, 999),
    columns: starts.map((start, index) => ({
      key: `column-${index}`,
      label: `Sep ${21 + index}`,
      start,
      end: new Date(2026, 8, 21 + index, 23, 59, 59, 999),
    })),
  };
}

function assignmentIdentity(
  assignment: Pick<PortfolioScheduleAssignment, "projectId" | "id">,
): string {
  return `${assignment.projectId}:${assignment.id}`;
}

function bruteForceOverlap(assignments: PortfolioScheduleAssignment[]): {
  count: number;
  conflicting: Set<string>;
} {
  let count = 0;
  const conflicting = new Set<string>();
  for (let leftIndex = 0; leftIndex < assignments.length; leftIndex += 1) {
    const left = assignments[leftIndex]!;
    if (!left.plannedStartAt || !left.plannedEndAt) continue;
    const leftStart = portfolioCalendarDate(
      left.plannedStartAt,
      left.calendar,
    );
    const leftEnd = portfolioCalendarDate(left.plannedEndAt, left.calendar);
    if (!leftStart || !leftEnd) continue;
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < assignments.length;
      rightIndex += 1
    ) {
      const right = assignments[rightIndex]!;
      if (!right.plannedStartAt || !right.plannedEndAt) continue;
      const rightStart = portfolioCalendarDate(
        right.plannedStartAt,
        right.calendar,
      );
      const rightEnd = portfolioCalendarDate(
        right.plannedEndAt,
        right.calendar,
      );
      if (!rightStart || !rightEnd) continue;
      const start = Math.max(
        Date.parse(`${leftStart}T00:00:00.000Z`),
        Date.parse(`${rightStart}T00:00:00.000Z`),
      );
      const end = Math.min(
        Date.parse(`${leftEnd}T00:00:00.000Z`),
        Date.parse(`${rightEnd}T00:00:00.000Z`),
      );
      let overlaps = false;
      for (
        let cursor = start;
        cursor <= end;
        cursor += 86_400_000
      ) {
        const date = new Date(cursor).toISOString().slice(0, 10);
        if (
          isPortfolioWorkingDay(date, left.calendar) &&
          isPortfolioWorkingDay(date, right.calendar)
        ) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) {
        count += 1;
        conflicting.add(assignmentIdentity(left));
        conflicting.add(assignmentIdentity(right));
      }
    }
  }
  return { count, conflicting };
}

describe("portfolio resource projection", () => {
  it("keeps a positive-offset local schedule column on its local date", () => {
    const previousTimeZone = process.env.TZ;
    try {
      process.env.TZ = "Asia/Tokyo";
      const localMidnight = new Date(2026, 8, 21, 0, 0, 0, 0);

      expect(localMidnight.toISOString().slice(0, 10)).toBe("2026-09-20");
      expect(localScheduleDateKey(localMidnight)).toBe("2026-09-21");
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });

  it("renders linked projects, assignment roles, calendar dates, and 44px timeline targets", () => {
    const projects = buildPortfolioProjects(
      [
        project({
          id: "project-linked",
          name: "Linked project",
          calendar: calendar({ timeZone: "America/Toronto" }),
          jobs: [
            job({
              id: "job-linked",
              projectManager: "Alex",
              foreman: null,
              plannedStartAt: "2026-09-21",
              plannedEndAt: "2026-09-22T02:00:00.000Z",
              tasks: [
                task({
                  id: "task-linked",
                  jobId: "job-linked",
                  assignee: "Alex",
                  dueAt: "2026-09-21",
                }),
              ],
            }),
          ],
        }),
      ],
      now,
    );

    const html = renderToStaticMarkup(
      createElement(PortfolioResourceSchedule, {
        projects,
        window: createScheduleWindow(
          "week",
          new Date("2026-09-21T12:00:00.000Z"),
        ),
        now: now.toISOString(),
        baseline: "none",
      }),
    );

    expect(html).toContain('href="/app/projects/project-linked"');
    expect(html).toContain('aria-label="Open project Linked project"');
    expect(html).toContain(
      'aria-label="Assignment role: Project manager">Project manager',
    );
    expect(html).toContain(
      'aria-label="Assignment role: Task assignee">Task assignee',
    );
    expect(html).toContain("Sep 21, 2026 – Sep 21, 2026");
    expect(html).toContain("before:h-11");
    expect(html).toContain("before:min-w-11");
    expect(html).toContain("before:size-11");
    expect(html).toContain('class="relative flex min-h-14 items-center"');
    expect(html).not.toContain(
      'class="relative flex min-h-14 items-center px-2"',
    );
    expect(html).toContain(
      'aria-label="Open source job JOB-1 · North wall" class="inline-flex min-h-11 min-w-11',
    );
    expect(html).toContain(
      'aria-label="Open project Linked project" class="inline-flex min-h-11 min-w-11',
    );
  });

  it("bounds chart and closed-table DOM while pagination exposes every assignment", async () => {
    expect(PORTFOLIO_RESOURCE_PAGE_SIZE).toBe(200);
    const projects = buildPortfolioProjects(
      [
        project({
          id: "project-page",
          name: "Paged project",
          jobs: [
            job({
              id: "job-page",
              projectManager: "Alex",
              foreman: "Alex",
              plannedStartAt: "2026-09-21",
              plannedEndAt: "2026-09-22",
              tasks: Array.from({ length: 218 }, (_, index) =>
                task({
                  id: `paged-task-${index}`,
                  jobId: "job-page",
                  title: `Paged task ${index}`,
                  assignee: "Alex",
                  dueAt: "2026-09-21",
                }),
              ),
            }),
          ],
        }),
      ],
      now,
    );
    const dom = new JSDOM('<div id="root"></div>');
    const globals = globalThis as unknown as Record<string, unknown>;
    const previousGlobals = new Map(
      ["window", "self", "document", "HTMLElement", "Node"].map(
        (key) => [key, globals[key]] as const,
      ),
    );
    const previousActEnvironment = globals.IS_REACT_ACT_ENVIRONMENT;
    globals.window = dom.window;
    globals.self = dom.window;
    globals.document = dom.window.document;
    globals.HTMLElement = dom.window.HTMLElement;
    globals.Node = dom.window.Node;
    globals.IS_REACT_ACT_ENVIRONMENT = true;
    const container = dom.window.document.querySelector("#root")!;
    const root = createRoot(container);
    const scheduleWindow = createScheduleWindow(
      "week",
      new Date(2026, 8, 21, 12, 0, 0, 0),
    );

    try {
      await act(async () => {
        root.render(
          createElement(PortfolioResourceSchedule, {
            projects,
            window: scheduleWindow,
            now: now.toISOString(),
            baseline: "none",
          }),
        );
      });

      const chartRows = () => [
        ...container.querySelectorAll(
          '[data-resource-assignment-row="true"]',
        ),
      ];
      const rowKeys = () =>
        chartRows().map((row) => row.getAttribute("data-assignment-key"));
      const firstPageKeys = new Set(rowKeys());
      expect(chartRows()).toHaveLength(200);
      expect(container.querySelector("tbody")).toBeNull();
      expect(
        container.querySelectorAll("[data-resource-backdrop] > span"),
      ).toHaveLength(0);
      expect(
        container.querySelectorAll("[data-resource-backdrop]"),
      ).toHaveLength(200);
      expect(container.textContent).toContain(
        "Showing 1–200 of 220 assignments. 1 resource lane.",
      );

      const next = container.querySelector(
        '[aria-label="Next resource assignments page"]',
      )!;
      await act(async () => {
        next.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });

      expect(chartRows()).toHaveLength(20);
      expect(container.textContent).toContain("Page 2 of 2");
      const allKeys = new Set([...firstPageKeys, ...rowKeys()]);
      expect(allKeys.size).toBe(220);

      const tableToggle = container.querySelector(
        '[aria-controls="portfolio-resource-table"]',
      )!;
      expect(tableToggle.getAttribute("aria-expanded")).toBe("false");
      await act(async () => {
        tableToggle.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });
      expect(tableToggle.getAttribute("aria-expanded")).toBe("true");
      expect(container.querySelectorAll("tbody tr")).toHaveLength(20);
      expect(
        new Set(
          [...container.querySelectorAll("tbody tr")].map((row) =>
            row.getAttribute("data-assignment-key"),
          ),
        ),
      ).toEqual(new Set(rowKeys()));

      const filteredProjects = buildPortfolioProjects(
        [
          project({
            id: "project-filtered",
            jobs: [
              job({
                id: "job-filtered",
                projectManager: "Alex",
                foreman: "Alex",
                tasks: Array.from({ length: 8 }, (_, index) =>
                  task({
                    id: `filtered-task-${index}`,
                    jobId: "job-filtered",
                    assignee: "Alex",
                  }),
                ),
              }),
            ],
          }),
        ],
        now,
      );
      await act(async () => {
        root.render(
          createElement(PortfolioResourceSchedule, {
            projects: filteredProjects,
            window: scheduleWindow,
            now: now.toISOString(),
            baseline: "none",
          }),
        );
      });
      expect(chartRows()).toHaveLength(10);
      expect(container.textContent).toContain("Page 1 of 1");
      expect(
        (
          container.querySelector(
            '[aria-label="Previous resource assignments page"]',
          ) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
    } finally {
      await act(async () => root.unmount());
      dom.window.close();
      for (const [key, value] of previousGlobals) {
        if (value === undefined) delete globals[key];
        else globals[key] = value;
      }
      if (previousActEnvironment === undefined) {
        delete globals.IS_REACT_ACT_ENVIRONMENT;
      } else {
        globals.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      }
    }
  });

  it("renders no baseline mark or variance for malformed baseline dates", () => {
    const projects = buildPortfolioProjects(
      [
        project({
          latestBaseline: {
            id: "baseline-malformed",
            name: "Malformed",
            capturedAt: "2026-09-01",
            items: [
              {
                id: "baseline-item-malformed",
                baselineId: "baseline-malformed",
                entityType: "job",
                entityId: "job-1",
                plannedStartAt: "2026-02-30",
                plannedEndAt: "not-a-date",
                dueAt: null,
              },
            ],
          },
          jobs: [
            job({
              projectManager: "Alex",
              foreman: "Morgan",
              plannedStartAt: "2026-09-21",
              plannedEndAt: "2026-09-22",
            }),
          ],
        }),
      ],
      now,
    );
    const html = renderToStaticMarkup(
      createElement(PortfolioResourceSchedule, {
        projects,
        window: threeDayWindow(),
        now: now.toISOString(),
        baseline: "latest",
      }),
    );

    expect(html).not.toContain("Start ");
    expect(html).not.toContain("Not baselined");
    expect(html).not.toContain("border-muted-foreground bg-transparent");
    expect(html.match(/Invalid baseline date/g)?.length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("renders none, not-baselined, and added states in chart and table", () => {
    const baselineHeader = (id: string) => ({
      id: `baseline-${id}`,
      name: "Latest",
      capturedAt: "2026-09-01",
      items: [],
    });
    const projects = buildPortfolioProjects(
      [
        project({
          id: "project-no-baseline",
          name: "No baseline",
          latestBaseline: null,
          jobs: [
            job({
              id: "job-no-baseline",
              projectManager: "Alex",
              foreman: null,
              plannedStartAt: "2026-09-21",
              plannedEndAt: "2026-09-22",
            }),
          ],
        }),
        project({
          id: "project-added",
          name: "Added",
          latestBaseline: baselineHeader("added"),
          jobs: [
            job({
              id: "job-added",
              projectManager: "Alex",
              foreman: null,
              plannedStartAt: "2026-09-21",
              plannedEndAt: "2026-09-22",
            }),
          ],
        }),
        project({
          id: "project-null-item",
          name: "Null item",
          latestBaseline: {
            ...baselineHeader("null-item"),
            items: [
              {
                id: "item-null",
                baselineId: "baseline-null-item",
                entityType: "job",
                entityId: "job-null-item",
                plannedStartAt: null,
                plannedEndAt: null,
                dueAt: null,
              },
            ],
          },
          jobs: [
            job({
              id: "job-null-item",
              projectManager: "Alex",
              foreman: null,
              plannedStartAt: "2026-09-21",
              plannedEndAt: "2026-09-22",
            }),
          ],
        }),
      ],
      now,
    );
    const render = (baseline: "latest" | "none") =>
      renderToStaticMarkup(
        createElement(PortfolioResourceSchedule, {
          projects,
          window: threeDayWindow(),
          now: now.toISOString(),
          baseline,
        }),
      );
    const latest = render("latest");
    const none = render("none");

    expect(latest.match(/Added since baseline/g)?.length).toBeGreaterThanOrEqual(
      2,
    );
    expect(latest.match(/Not baselined/g)?.length).toBeGreaterThanOrEqual(4);
    expect(none.match(/None selected/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it("projects PM, foreman, and task roles with project and calendar provenance", () => {
    const source = project({
      id: "project-provenance",
      name: "Harbour tower",
      calendar: calendar({
        id: "calendar-provenance",
        timeZone: "America/Vancouver",
      }),
      jobs: [
        job({
          id: "job-provenance",
          projectManager: "Alex",
          foreman: "Morgan",
          tasks: [
            task({
              id: "task-provenance",
              jobId: "job-provenance",
              assignee: "Sam",
            }),
          ],
        }),
      ],
    });

    const assignments = buildPortfolioScheduleAssignments([source]);

    expect(assignments.map((assignment) => assignment.role)).toEqual([
      "Project manager",
      "Foreman",
      "Task assignee",
    ]);
    expect(assignments).toMatchObject([
      {
        projectId: "project-provenance",
        projectName: "Harbour tower",
        calendar: {
          id: "calendar-provenance",
          timeZone: "America/Vancouver",
        },
      },
      {
        projectId: "project-provenance",
        projectName: "Harbour tower",
        calendar: {
          id: "calendar-provenance",
          timeZone: "America/Vancouver",
        },
      },
      {
        projectId: "project-provenance",
        projectName: "Harbour tower",
        calendar: {
          id: "calendar-provenance",
          timeZone: "America/Vancouver",
        },
      },
    ]);
    expect(assignments.every((assignment) => assignment.calendar !== source.calendar)).toBe(
      true,
    );
  });

  it("keeps date-only values fixed and converts timestamps to the project calendar date", () => {
    const toronto = calendar({ timeZone: "America/Toronto" });

    expect(portfolioCalendarDate("2026-09-21", toronto)).toBe("2026-09-21");
    expect(
      portfolioCalendarDate("2026-09-21T02:00:00.000Z", toronto),
    ).toBe("2026-09-20");
    expect(portfolioCalendarDate("2026-02-30", toronto)).toBeNull();
  });

  it("maps first, middle, and last dates to exact equal-width column geometry", () => {
    const window = threeDayWindow();
    const sourceCalendar = calendar();

    expect(
      getPortfolioResourceGeometry(
        { dueAt: "2026-09-21" },
        sourceCalendar,
        window,
      ),
    ).toEqual({ kind: "milestone", position: 100 / 6 });
    expect(
      getPortfolioResourceGeometry(
        { dueAt: "2026-09-22" },
        sourceCalendar,
        window,
      ),
    ).toEqual({ kind: "milestone", position: 50 });
    expect(
      getPortfolioResourceGeometry(
        { dueAt: "2026-09-23" },
        sourceCalendar,
        window,
      ),
    ).toEqual({ kind: "milestone", position: (5 * 100) / 6 });
    expect(
      getPortfolioResourceGeometry(
        {
          plannedStartAt: "2026-09-21",
          plannedEndAt: "2026-09-23",
        },
        sourceCalendar,
        window,
      ),
    ).toEqual({ kind: "range", left: 0, width: 100 });
  });

  it("uses equal-width month columns and inclusive finish boundaries", () => {
    const window = createScheduleWindow(
      "month",
      new Date(2026, 8, 15, 12, 0, 0, 0),
    );

    expect(
      getPortfolioResourceGeometry(
        {
          plannedStartAt: "2026-09-30",
          plannedEndAt: "2026-10-01",
        },
        calendar(),
        window,
      ),
    ).toEqual({
      kind: "range",
      left: 100 / 6,
      width: 200 / 6,
    });
  });

  it("builds exact weekend and exception gradient segments", () => {
    const window = createScheduleWindow(
      "week",
      new Date(2026, 8, 14, 12, 0, 0, 0),
    );
    const segments = getPortfolioWorkingDaySegments(
      window,
      calendar({
        exceptions: [
          { date: "2026-09-14", isWorkingDay: false },
          { date: "2026-09-19", isWorkingDay: true },
        ],
      }),
    );

    expect(segments).toHaveLength(42);
    expect(segments[0]).toEqual({
      startPercent: 0,
      endPercent: 100 / 42,
      isWorkingDay: false,
    });
    expect(segments[5]?.isWorkingDay).toBe(true);
    expect(segments[6]?.isWorkingDay).toBe(false);
    expect(segments[41]?.endPercent).toBe(100);
    const weekGradient = getPortfolioWorkingDayGradient(
      window,
      calendar({
        exceptions: [
          { date: "2026-09-14", isWorkingDay: false },
          { date: "2026-09-19", isWorkingDay: true },
        ],
      }),
    );
    expect(weekGradient).toContain("linear-gradient(to right");
    expect(weekGradient).toContain("var(--border)");
    expect(weekGradient).toContain("color-mix(in oklab, var(--muted)");

    const monthGradient = getPortfolioWorkingDayGradient(
      createScheduleWindow(
        "month",
        new Date(2026, 8, 14, 12, 0, 0, 0),
      ),
      calendar(),
    );
    expect(monthGradient).toContain(
      "var(--border) 16.666666666666668%",
    );
    expect(monthGradient).toContain("transparent 100%");
  });

  it("uses project-calendar state at UTC boundaries independent of viewer timezone", () => {
    const toronto = calendar({ timeZone: "America/Toronto" });
    const tokyo = calendar({ timeZone: "Asia/Tokyo" });
    const openTask = task({ dueAt: "2026-09-20" });
    const activeJob = job({ plannedEndAt: "2026-09-20" });
    const instant = "2026-09-21T02:00:00.000Z";
    const previousTimeZone = process.env.TZ;

    try {
      process.env.TZ = "Pacific/Honolulu";
      const first = getPortfolioTaskScheduleState(
        openTask,
        instant,
        toronto,
      );
      process.env.TZ = "Asia/Tokyo";
      const second = getPortfolioTaskScheduleState(
        openTask,
        instant,
        toronto,
      );

      expect(first).toBe("remaining");
      expect(second).toBe(first);
      expect(getPortfolioTaskScheduleState(openTask, instant, tokyo)).toBe(
        "overdue",
      );
      expect(getPortfolioJobScheduleState(activeJob, instant, toronto)).toBe(
        "remaining",
      );
      expect(getPortfolioJobScheduleState(activeJob, instant, tokyo)).toBe(
        "overdue",
      );
      expect(
        getPortfolioJobScheduleState(
          { ...activeJob, status: "blocked" },
          instant,
          tokyo,
        ),
      ).toBe("blocked");
      expect(
        getPortfolioTaskScheduleState(
          { ...openTask, status: "done" },
          instant,
          tokyo,
        ),
      ).toBe("complete");
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });

  it("strictly normalizes malformed baseline dates", () => {
    expect(
      normalizePortfolioScheduleDates({
        plannedStartAt: "2026-02-30",
        plannedEndAt: "not-a-date",
        dueAt: "2026-02-30T12:00:00.000Z",
      }),
    ).toEqual({
      plannedStartAt: null,
      plannedEndAt: null,
      dueAt: null,
    });
  });

  it("distinguishes every portfolio baseline state", () => {
    const header = {
      id: "baseline-state",
      name: "State",
      capturedAt: "2026-09-01",
      items: [],
    };

    expect(getPortfolioBaselineState("none", header, undefined)).toEqual({
      kind: "none",
    });
    expect(
      getPortfolioBaselineState("latest", null, undefined),
    ).toEqual({ kind: "not-baselined" });
    expect(
      getPortfolioBaselineState("latest", header, undefined),
    ).toEqual({ kind: "added" });
    expect(
      getPortfolioBaselineState("latest", header, {
        plannedStartAt: null,
        plannedEndAt: null,
        dueAt: null,
      }),
    ).toEqual({ kind: "not-baselined" });
    expect(
      getPortfolioBaselineState("latest", header, {
        plannedStartAt: "2026-02-30",
        plannedEndAt: null,
        dueAt: null,
      }),
    ).toEqual({ kind: "invalid" });
    expect(
      getPortfolioBaselineState("latest", header, {
        plannedStartAt: "2026-09-21",
        plannedEndAt: "2026-09-22",
        dueAt: null,
      }),
    ).toEqual({
      kind: "scheduled",
      dates: {
        plannedStartAt: "2026-09-21",
        plannedEndAt: "2026-09-22",
        dueAt: null,
      },
    });
  });

  it("groups a normalized person across projects with combined roles and first display spelling", () => {
    const lanes = resourceLanes([
      project({
        id: "project-a",
        name: "Alpha",
        jobs: [
          job({
            id: "job-a",
            projectManager: "  Alex   Smith  ",
            plannedStartAt: "2026-09-14",
            plannedEndAt: "2026-09-15",
          }),
        ],
      }),
      project({
        id: "project-b",
        name: "Beta",
        jobs: [
          job({
            id: "job-b",
            projectManager: null,
            tasks: [
              task({
                id: "task-b",
                jobId: "job-b",
                assignee: "alex smith",
                dueAt: "2026-09-18",
              }),
            ],
          }),
        ],
      }),
    ]);

    expect(lanes.filter((lane) => lane.key === "alex smith")).toHaveLength(1);
    expect(lanes.find((lane) => lane.key === "alex smith")).toMatchObject({
      displayName: "Alex Smith",
      roles: ["Project manager", "Task assignee"],
      assignments: [
        { projectId: "project-a", projectName: "Alpha" },
        { projectId: "project-b", projectName: "Beta" },
      ],
    });
  });

  it("flags both assignments and one unique pair on a shared working date", () => {
    const lane = resourceLanes([
      project({
        id: "project-a",
        jobs: [
          job({
            id: "job-a",
            projectManager: "Alex",
            plannedStartAt: "2026-09-14",
            plannedEndAt: "2026-09-15",
          }),
        ],
      }),
      project({
        id: "project-b",
        jobs: [
          job({
            id: "job-b",
            projectManager: "alex",
            plannedStartAt: "2026-09-15",
            plannedEndAt: "2026-09-16",
          }),
        ],
      }),
    ]).find((candidate) => candidate.key === "alex");

    expect(lane?.potentialOverlapCount).toBe(1);
    expect(lane?.assignments.map((assignment) => assignment.hasPotentialOverlap)).toEqual(
      [true, true],
    );
  });

  it("does not flag a weekend-only intersection", () => {
    const lane = resourceLanes([
      project({
        id: "project-a",
        jobs: [
          job({
            id: "job-a",
            projectManager: "Alex",
            plannedStartAt: "2026-09-19",
            plannedEndAt: "2026-09-20",
          }),
        ],
      }),
      project({
        id: "project-b",
        jobs: [
          job({
            id: "job-b",
            projectManager: "alex",
            plannedStartAt: "2026-09-19",
            plannedEndAt: "2026-09-20",
          }),
        ],
      }),
    ]).find((candidate) => candidate.key === "alex");

    expect(lane?.potentialOverlapCount).toBe(0);
  });

  it("does not flag when one calendar exception closes the only shared date", () => {
    const lanes = resourceLanes([
      project({
        id: "project-a",
        calendar: calendar({
          id: "calendar-a",
          exceptions: [
            { date: "2026-09-21", isWorkingDay: false },
          ],
        }),
        jobs: [
          job({
            id: "job-a",
            projectManager: "Alex",
            plannedStartAt: "2026-09-18",
            plannedEndAt: "2026-09-21",
          }),
        ],
      }),
      project({
        id: "project-b",
        calendar: calendar({ id: "calendar-b" }),
        jobs: [
          job({
            id: "job-b",
            projectManager: "Alex",
            plannedStartAt: "2026-09-21",
            plannedEndAt: "2026-09-22",
          }),
        ],
      }),
    ]);

    expect(lanes.find((lane) => lane.key === "alex")?.potentialOverlapCount).toBe(0);
  });

  it("flags a weekend date when both calendars make it a working exception", () => {
    const saturdayWorking = {
      exceptions: [{ date: "2026-09-19", isWorkingDay: true }],
    };
    const lane = resourceLanes([
      project({
        id: "project-a",
        calendar: calendar({ id: "calendar-a", ...saturdayWorking }),
        jobs: [
          job({
            id: "job-a",
            projectManager: "Alex",
            plannedStartAt: "2026-09-19",
            plannedEndAt: "2026-09-19",
          }),
        ],
      }),
      project({
        id: "project-b",
        calendar: calendar({ id: "calendar-b", ...saturdayWorking }),
        jobs: [
          job({
            id: "job-b",
            projectManager: "Alex",
            plannedStartAt: "2026-09-19",
            plannedEndAt: "2026-09-19",
          }),
        ],
      }),
    ]).find((candidate) => candidate.key === "alex");

    expect(lane?.potentialOverlapCount).toBe(1);
  });

  it("detects overlap from project-local dates across timezone boundaries", () => {
    const lane = resourceLanes([
      project({
        id: "project-toronto",
        calendar: calendar({
          id: "calendar-toronto",
          timeZone: "America/Toronto",
        }),
        jobs: [
          job({
            id: "job-toronto",
            projectManager: "Alex",
            plannedStartAt: "2026-09-22T02:00:00.000Z",
            plannedEndAt: "2026-09-22T02:00:00.000Z",
          }),
        ],
      }),
      project({
        id: "project-vancouver",
        calendar: calendar({
          id: "calendar-vancouver",
          timeZone: "America/Vancouver",
        }),
        jobs: [
          job({
            id: "job-vancouver",
            projectManager: "Alex",
            plannedStartAt: "2026-09-21T12:00:00.000Z",
            plannedEndAt: "2026-09-21T12:00:00.000Z",
          }),
        ],
      }),
    ]).find((candidate) => candidate.key === "alex");

    expect(lane?.potentialOverlapCount).toBe(1);
    expect(lane?.assignments.map((assignment) => assignment.hasPotentialOverlap)).toEqual(
      [true, true],
    );
  });

  it("keeps due-only milestones visible but excludes them from overlap detection", () => {
    const lane = resourceLanes([
      project({
        jobs: [
          job({
            projectManager: "Alex",
            plannedStartAt: "2026-09-21",
            plannedEndAt: "2026-09-22",
            tasks: [
              task({
                assignee: "Alex",
                dueAt: "2026-09-21",
              }),
            ],
          }),
        ],
      }),
    ]).find((candidate) => candidate.key === "alex");

    expect(lane?.assignments).toHaveLength(2);
    expect(lane?.assignments.find((assignment) => assignment.entityType === "task")).toMatchObject({
      dueAt: "2026-09-21",
      hasPotentialOverlap: false,
    });
    expect(lane?.potentialOverlapCount).toBe(0);
  });

  it("keeps an Unassigned lane visible without overlap warnings", () => {
    const lane = resourceLanes([
      project({
        jobs: [
          job({
            projectManager: null,
            foreman: null,
            plannedStartAt: "2026-09-21",
            plannedEndAt: "2026-09-22",
          }),
        ],
      }),
    ]).find(
      (candidate) => candidate.key === PORTFOLIO_UNASSIGNED_RESOURCE_KEY,
    );

    expect(lane?.displayName).toBe("Unassigned");
    expect(lane?.assignments).toHaveLength(2);
    expect(lane?.assignments.every((assignment) => !assignment.hasPotentialOverlap)).toBe(
      true,
    );
    expect(lane?.potentialOverlapCount).toBe(0);
  });

  it("keeps a real person named Unassigned separate and overlap-eligible", () => {
    const lanes = resourceLanes([
      project({
        jobs: [
          job({
            id: "job-real-a",
            projectManager: "Unassigned",
            foreman: null,
            plannedStartAt: "2026-09-21",
            plannedEndAt: "2026-09-22",
          }),
          job({
            id: "job-real-b",
            projectManager: "unassigned",
            foreman: null,
            plannedStartAt: "2026-09-21",
            plannedEndAt: "2026-09-22",
          }),
        ],
      }),
    ]);
    const realPerson = lanes.find((lane) => lane.key === "unassigned");
    const nullLane = lanes.find(
      (lane) => lane.key === PORTFOLIO_UNASSIGNED_RESOURCE_KEY,
    );

    expect(realPerson).toMatchObject({
      displayName: "Unassigned",
      potentialOverlapCount: 1,
    });
    expect(
      realPerson?.assignments.every(
        (assignment) => assignment.hasPotentialOverlap,
      ),
    ).toBe(true);
    expect(nullLane).toMatchObject({
      displayName: "Unassigned",
      potentialOverlapCount: 0,
    });
  });

  it("treats malformed dates as unscheduled and never creates a false overlap", () => {
    const lane = resourceLanes([
      project({
        jobs: [
          job({
            id: "job-a",
            projectManager: "Alex",
            plannedStartAt: "2026-02-30",
            plannedEndAt: "not-a-date",
          }),
          job({
            id: "job-b",
            projectManager: "Alex",
            plannedStartAt: "2026-02-30",
            plannedEndAt: "2026-02-30T12:00:00.000Z",
          }),
        ],
      }),
    ]).find((candidate) => candidate.key === "alex");

    expect(lane?.assignments).toMatchObject([
      { plannedStartAt: null, plannedEndAt: null },
      { plannedStartAt: null, plannedEndAt: null },
    ]);
    expect(lane?.potentialOverlapCount).toBe(0);
  });

  it("counts three mutually overlapping assignments as three unique pairs", () => {
    const lane = resourceLanes(
      ["a", "b", "c"].map((id) =>
        project({
          id: `project-${id}`,
          jobs: [
            job({
              id: `job-${id}`,
              projectManager: "Alex",
              plannedStartAt: "2026-09-21",
              plannedEndAt: "2026-09-23",
            }),
          ],
        }),
      ),
    ).find((candidate) => candidate.key === "alex");

    expect(lane?.potentialOverlapCount).toBe(3);
    expect(lane?.assignments.every((assignment) => assignment.hasPotentialOverlap)).toBe(
      true,
    );
  });

  it("aggregates 9,000 assignments and 5,000 exceptions without rebuilding signatures", () => {
    const exceptions = Array.from({ length: 5_000 }, (_, index) => ({
      date: new Date(Date.UTC(2030, 0, 1 + index))
        .toISOString()
        .slice(0, 10),
      isWorkingDay: index % 3 !== 0,
    }));
    const assignments = buildPortfolioScheduleAssignments([
      project({
        id: "project-dense",
        calendar: calendar({ exceptions }),
        jobs: [
          job({
            id: "job-dense",
            projectManager: "Alex",
            foreman: "Alex",
            plannedStartAt: "2026-09-21",
            plannedEndAt: "2026-09-21",
            tasks: Array.from({ length: 8_998 }, (_, index) =>
              task({
                id: `dense-task-${index}`,
                jobId: "job-dense",
                assignee: "Alex",
                plannedStartAt: "2026-09-21",
                plannedEndAt: "2026-09-21",
              }),
            ),
          }),
        ],
      }),
    ]);
    const diagnostics = createPortfolioOverlapDiagnostics();
    const lane = buildPortfolioResourceLanes(assignments, diagnostics).find(
      (candidate) => candidate.key === "alex",
    );

    expect(lane?.assignments).toHaveLength(9_000);
    expect(lane?.potentialOverlapCount).toBe(40_495_500);
    expect(
      lane?.assignments.every(
        (assignment) => assignment.hasPotentialOverlap,
      ),
    ).toBe(true);
    expect(diagnostics.rangeQueries).toBe(8_999);
    expect(diagnostics.signatureBuilds).toBe(1);
    expect(diagnostics.calendarIndexBuilds).toBe(1);
    expect(diagnostics.pairIndexBuilds).toBe(1);
    expect(diagnostics.workingDateEvaluations).toBeLessThan(10);
  });

  it("canonicalizes equivalent cloned project calendars onto one cache path", () => {
    const firstCalendar = calendar({
      id: "calendar-first",
      weekendDays: [6, 0],
      exceptions: [
        { date: "2026-12-26", isWorkingDay: true },
        { date: "2026-12-25", isWorkingDay: false },
      ],
    });
    const secondCalendar = calendar({
      id: "calendar-second",
      weekendDays: [0, 6],
      exceptions: [
        { date: "2026-12-25", isWorkingDay: false },
        { date: "2026-12-26", isWorkingDay: true },
      ],
    });
    const assignments = buildPortfolioScheduleAssignments([
      project({
        id: "project-equivalent-a",
        calendar: firstCalendar,
        jobs: [
          job({
            id: "job-equivalent-a",
            projectManager: "Alex",
            plannedStartAt: "2026-09-21",
            plannedEndAt: "2026-09-21",
          }),
        ],
      }),
      project({
        id: "project-equivalent-b",
        calendar: secondCalendar,
        jobs: [
          job({
            id: "job-equivalent-b",
            projectManager: "Alex",
            plannedStartAt: "2026-09-21",
            plannedEndAt: "2026-09-21",
          }),
        ],
      }),
    ]);
    const diagnostics = createPortfolioOverlapDiagnostics();
    const lane = buildPortfolioResourceLanes(assignments, diagnostics).find(
      (candidate) => candidate.key === "alex",
    );

    expect(assignments[0]?.calendar).not.toBe(assignments[2]?.calendar);
    expect(lane?.potentialOverlapCount).toBe(1);
    expect(diagnostics.signatureBuilds).toBe(2);
    expect(diagnostics.calendarIndexBuilds).toBe(1);
    expect(diagnostics.pairIndexBuilds).toBe(1);
  });

  it("matches a brute-force oracle for mixed ranges, ends, and calendars", () => {
    const assignments = buildPortfolioScheduleAssignments([
      project({
        id: "project-mixed-a",
        calendar: calendar({
          id: "calendar-mixed-a",
          exceptions: [
            { date: "2026-09-21", isWorkingDay: false },
          ],
        }),
        jobs: [
          job({
            id: "mixed-a-long",
            projectManager: "Alex",
            plannedStartAt: "2026-09-18",
            plannedEndAt: "2026-09-25",
          }),
          job({
            id: "mixed-a-short",
            projectManager: "Alex",
            plannedStartAt: "2026-09-21",
            plannedEndAt: "2026-09-21",
          }),
        ],
      }),
      project({
        id: "project-mixed-b",
        calendar: calendar({
          id: "calendar-mixed-b",
          weekendDays: [5, 6],
          exceptions: [
            { date: "2026-09-19", isWorkingDay: true },
          ],
        }),
        jobs: [
          job({
            id: "mixed-b-nested",
            projectManager: "Alex",
            plannedStartAt: "2026-09-19",
            plannedEndAt: "2026-09-23",
          }),
          job({
            id: "mixed-b-late",
            projectManager: "Alex",
            plannedStartAt: "2026-09-24",
            plannedEndAt: "2026-09-28",
          }),
        ],
      }),
      project({
        id: "project-mixed-c",
        calendar: calendar({
          id: "calendar-mixed-c",
          weekendDays: [0, 1, 2, 3, 4, 5, 6],
          exceptions: [
            { date: "2026-09-22", isWorkingDay: true },
          ],
        }),
        jobs: [
          job({
            id: "mixed-c-exception",
            projectManager: "Alex",
            plannedStartAt: "2026-09-20",
            plannedEndAt: "2026-09-24",
          }),
        ],
      }),
    ]).filter((assignment) => assignment.resource === "Alex");
    const oracle = bruteForceOverlap(assignments);
    const lane = buildPortfolioResourceLanes(assignments)[0]!;
    const actualConflicting = new Set(
      lane.assignments
        .filter((assignment) => assignment.hasPotentialOverlap)
        .map(assignmentIdentity),
    );

    expect(lane.potentialOverlapCount).toBe(oracle.count);
    expect(actualConflicting).toEqual(oracle.conflicting);
  });

  it("builds bounded lazy calendar-pair indexes for many long-range conflicts", () => {
    const exceptions = Array.from({ length: 300 }, (_, index) => ({
      date: new Date(Date.UTC(2020, 0, 1 + index * 10))
        .toISOString()
        .slice(0, 10),
      isWorkingDay: index % 2 === 0,
    }));
    const longJobs = (prefix: string) =>
      Array.from({ length: 20 }, (_, index) =>
        job({
          id: `${prefix}-${index}`,
          projectManager: "Alex",
          foreman: null,
          plannedStartAt: "2020-01-01",
          plannedEndAt: "2030-12-31",
        }),
      );
    const assignments = buildPortfolioScheduleAssignments([
      project({
        id: "project-stress-a",
        calendar: calendar({
          id: "calendar-stress-a",
          exceptions,
        }),
        jobs: longJobs("a"),
      }),
      project({
        id: "project-stress-b",
        calendar: calendar({
          id: "calendar-stress-b",
          weekendDays: [5, 6],
          exceptions,
        }),
        jobs: longJobs("b"),
      }),
    ]);
    const diagnostics = createPortfolioOverlapDiagnostics();
    const lane = buildPortfolioResourceLanes(assignments, diagnostics).find(
      (candidate) => candidate.key === "alex",
    );

    expect(lane?.potentialOverlapCount).toBe(780);
    expect(diagnostics.rangeQueries).toBeLessThan(80);
    expect(diagnostics.signatureBuilds).toBe(2);
    expect(diagnostics.calendarIndexBuilds).toBe(2);
    expect(diagnostics.pairIndexBuilds).toBe(3);
    expect(diagnostics.workingDateEvaluations).toBeLessThan(1_000);
  });

  it("uses deterministic lexical lane and assignment order for every input permutation", () => {
    const sources = [
      project({
        id: "project-z",
        name: "Zulu",
        jobs: [job({ id: "job-z", projectManager: "Zoe" })],
      }),
      project({
        id: "project-ring",
        name: "Ring",
        jobs: [job({ id: "job-ring", projectManager: "Åke" })],
      }),
      project({
        id: "project-a",
        name: "Alpha",
        jobs: [job({ id: "job-a", projectManager: "Amy" })],
      }),
      project({
        id: "project-b",
        name: "Beta",
        jobs: [job({ id: "job-b", projectManager: "Zoe" })],
      }),
    ];
    const projection = (items: PortfolioScheduleProject[]) =>
      buildPortfolioResourceLanes(
        buildPortfolioScheduleAssignments(items),
      ).map((lane) => ({
        key: lane.key,
        assignments: lane.assignments.map(
          (assignment) => `${assignment.projectId}:${assignment.id}`,
        ),
      }));

    const forward = projection(sources);
    const reverse = projection([...sources].reverse());

    expect(forward.map((lane) => lane.key)).toEqual([
      "amy",
      "zoe",
      "åke",
      PORTFOLIO_UNASSIGNED_RESOURCE_KEY,
    ]);
    expect(reverse).toEqual(forward);
    expect(
      forward.find((lane) => lane.key === "zoe")?.assignments,
    ).toEqual([
      "project-b:job:job-b:project-manager",
      "project-z:job:job-z:project-manager",
    ]);
  });

  it("shares one deeply frozen calendar clone without retaining source aliases", () => {
    const source = buildPortfolioProjects(
      [
        project({
          calendar: calendar({
            exceptions: [
              { date: "2026-09-21", name: "Closure", isWorkingDay: false },
            ],
          }),
          jobs: [
            job({
              projectManager: "Alex",
              tasks: Array.from({ length: 50 }, (_, index) =>
                task({
                  id: `task-${index}`,
                  assignee: "Alex",
                }),
              ),
            }),
          ],
        }),
      ],
      now,
    );
    const snapshot = structuredClone(source);
    const assignments = buildPortfolioScheduleAssignments(source);
    const lanes = buildPortfolioResourceLanes(assignments);

    expect(source).toEqual(snapshot);
    expect(assignments[0]?.calendar).not.toBe(source[0]?.calendar);
    expect(assignments[0]?.calendar.weekendDays).not.toBe(
      source[0]?.calendar.weekendDays,
    );
    expect(lanes[0]?.assignments[0]).not.toBe(assignments[0]);
    expect(new Set(assignments.map((assignment) => assignment.calendar)).size).toBe(
      1,
    );
    expect(
      new Set(
        lanes.flatMap((lane) =>
          lane.assignments.map((assignment) => assignment.calendar),
        ),
      ).size,
    ).toBe(1);
    expect(Object.isFrozen(assignments[0]?.calendar)).toBe(true);
    expect(Object.isFrozen(assignments[0]?.calendar.weekendDays)).toBe(true);
    expect(Object.isFrozen(assignments[0]?.calendar.exceptions)).toBe(true);
    expect(Object.isFrozen(assignments[0]?.calendar.exceptions[0])).toBe(true);

    source[0]!.calendar.weekendDays.push(4);
    source[0]!.calendar.exceptions[0]!.name = "Source changed";
    expect(assignments[0]?.calendar.weekendDays).toEqual([0, 6]);
    expect(assignments[0]?.calendar.exceptions[0]?.name).toBe("Closure");
    expect(() => {
      (
        assignments[0]!.calendar.weekendDays as unknown as number[]
      ).push(5);
    }).toThrow();
    expect(() => {
      (
        assignments[0]!.calendar.exceptions[0] as unknown as {
          name?: string;
        }
      ).name = "Output changed";
    }).toThrow();
  });
});
