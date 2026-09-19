import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error jsdom does not publish bundled TypeScript declarations.
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PORTFOLIO_WORK_CONTEXT_OVERHEAD,
  PORTFOLIO_WORK_PAGE_SIZE,
  PortfolioSchedule,
  applyPortfolioQueryPatch,
  buildPortfolioWorkRows,
  defaultPortfolioExpansion,
  getPortfolioOverlapCounts,
  paginatePortfolioWorkRows,
  portfolioControlHref,
  reconcilePortfolioOptimisticQuery,
  reconcilePortfolioSearchDraft,
} from "@/components/ops/portfolio-schedule";
import {
  buildPortfolioProjects,
  buildPortfolioResourceLanes,
  buildPortfolioScheduleAssignments,
  filterPortfolioProjects,
} from "@/lib/ops/portfolio-schedule";
import type {
  PortfolioScheduleData,
  PortfolioScheduleProject,
} from "@/lib/ops/portfolio-schedule";
import type { PortfolioScheduleQuery } from "@/lib/ops/portfolio-schedule-query";
import type {
  ProjectScheduleJob,
  ProjectScheduleTask,
} from "@/lib/ops/project-schedule";
import { DEFAULT_WORKING_CALENDAR } from "@/lib/ops/project-schedule-planning";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const NOW = "2026-09-19T12:00:00.000Z";

function task(
  id: string,
  overrides: Partial<ProjectScheduleTask> = {},
): ProjectScheduleTask {
  return {
    id,
    jobId: "job-1",
    title: `Task ${id}`,
    assignee: null,
    status: "open",
    dueAt: null,
    plannedStartAt: null,
    plannedEndAt: null,
    completedAt: null,
    ...overrides,
  };
}

function job(
  id: string,
  overrides: Partial<ProjectScheduleJob> = {},
): ProjectScheduleJob {
  return {
    id,
    number: `JOB-${id}`,
    name: `Job ${id}`,
    status: "in_progress",
    projectManager: "Alex",
    foreman: null,
    plannedStartAt: null,
    plannedEndAt: null,
    tasks: [],
    ...overrides,
  };
}

function project(
  id: string,
  overrides: Partial<PortfolioScheduleProject> = {},
): PortfolioScheduleProject {
  return {
    id,
    name: `Project ${id}`,
    status: "active",
    projectManager: "Alex",
    calendar: {
      ...DEFAULT_WORKING_CALENDAR,
      weekendDays: [...DEFAULT_WORKING_CALENDAR.weekendDays],
      exceptions: [],
    },
    latestBaseline: null,
    jobs: [],
    dependencies: [],
    ...overrides,
  };
}

function query(
  overrides: Partial<PortfolioScheduleQuery> = {},
): PortfolioScheduleQuery {
  return {
    q: "",
    projectStatus: "active",
    projectManager: "",
    state: "all",
    attention: "all",
    view: "work",
    zoom: "week",
    anchor: null,
    from: null,
    to: null,
    baseline: "latest",
    hideCompleted: false,
    ...overrides,
  };
}

function data(
  projects: PortfolioScheduleProject[],
  truncation: Partial<PortfolioScheduleData["truncation"]> = {},
): PortfolioScheduleData {
  return {
    projects,
    truncation: {
      projects: false,
      jobs: false,
      tasks: false,
      dependencies: false,
      calendarExceptions: false,
      baselineItems: false,
      ...truncation,
    },
  };
}

describe("portfolio schedule route contract", () => {
  it("is dynamic, authenticated, parsed, serialized, and server-filtered", () => {
    const source = readFileSync(
      new URL("../../app/app/projects/schedule/page.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain("await getOpsSession()");
    expect(source).toContain('redirect("/app/login")');
    expect(source).toContain("await searchParams");
    expect(source).toContain("parsePortfolioScheduleQuery");
    expect(source).toContain("listPortfolioSchedule({");
    expect(source).toContain("q: query.q");
    expect(source).toContain("projectStatus:");
    expect(source).toContain("projectManager: query.projectManager");
    expect(source).toContain("serializePortfolioSchedule");
    expect(source).toContain("now={now}");
  });

  it("has a stable semantic project Schedule target", () => {
    const source = readFileSync(
      new URL("../../app/app/projects/[id]/page.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('<section id="schedule"');
    expect(source).toContain('aria-labelledby="schedule-heading"');
    expect(source).toContain('<CardTitle id="schedule-heading">Schedule</CardTitle>');
  });
});

describe("portfolio work model", () => {
  it("expands projects by default only when ten or fewer are visible", () => {
    expect(defaultPortfolioExpansion(Array.from({ length: 10 }, (_, index) => project(`${index}`))).projects.size).toBe(10);
    expect(defaultPortfolioExpansion(Array.from({ length: 11 }, (_, index) => project(`${index}`))).projects.size).toBe(0);
  });

  it("keeps parent rows and isolates project critical paths and baselines", () => {
    const projected = buildPortfolioProjects(
      [
        project("a", {
          jobs: [
            job("a-job", {
              tasks: [
                task("shared-1", {
                  jobId: "a-job",
                  plannedStartAt: "2026-09-21",
                  plannedEndAt: "2026-09-22",
                }),
                task("shared-2", {
                  jobId: "a-job",
                  plannedStartAt: "2026-09-23",
                  plannedEndAt: "2026-09-24",
                }),
              ],
            }),
          ],
          dependencies: [
            {
              id: "a-edge",
              projectId: "a",
              predecessorTaskId: "shared-1",
              successorTaskId: "shared-2",
              lagDays: 0,
            },
          ],
          latestBaseline: {
            id: "a-baseline",
            name: "A baseline",
            capturedAt: "2026-09-01",
            items: [
              {
                id: "a-item",
                baselineId: "a-baseline",
                entityType: "task",
                entityId: "shared-1",
                plannedStartAt: "2026-09-20",
                plannedEndAt: "2026-09-21",
                dueAt: null,
              },
            ],
          },
        }),
        project("b", {
          jobs: [
            job("b-job", {
              tasks: [
                task("shared-1", {
                  jobId: "b-job",
                }),
              ],
            }),
          ],
        }),
      ],
      new Date(NOW),
    );
    const rows = buildPortfolioWorkRows(
      projected,
      new Set(["a", "b"]),
      new Set(["a:a-job", "b:b-job"]),
      NOW,
      "latest",
    );

    expect(rows.map((row) => row.kind)).toEqual([
      "project",
      "job",
      "task",
      "task",
      "project",
      "job",
      "task",
    ]);
    expect(rows.find((row) => row.key === "a:task:shared-1")).toMatchObject({
      critical: true,
      baselineState: { kind: "scheduled" },
    });
    expect(rows.find((row) => row.key === "b:task:shared-1")).toMatchObject({
      critical: false,
      baselineState: { kind: "not-baselined" },
    });
  });

  it("preserves the full-project critical path when filters hide its tasks", () => {
    const projected = buildPortfolioProjects(
      [
        project("filtered-critical", {
          jobs: [
            job("critical-job", {
              tasks: [
                task("true-critical", {
                  jobId: "critical-job",
                  status: "done",
                  plannedStartAt: "2026-09-01",
                  plannedEndAt: "2026-09-10",
                }),
                task("visible-noncritical", {
                  jobId: "critical-job",
                  plannedStartAt: "2026-09-01",
                  plannedEndAt: "2026-09-01",
                }),
              ],
            }),
          ],
        }),
      ],
      new Date(NOW),
    );
    const filtered = filterPortfolioProjects(
      projected,
      {
        state: "overdue",
        attention: "all",
        from: null,
        to: null,
        hideCompleted: false,
        overlapProjectIds: new Set(),
        baselineItemsComplete: true,
      },
      new Date(NOW),
    );
    const expansion = defaultPortfolioExpansion(filtered);
    const rows = buildPortfolioWorkRows(
      filtered,
      expansion.projects,
      expansion.jobs,
      NOW,
      "none",
    );

    expect(filtered[0]?.jobs[0]?.tasks.map((item) => item.id)).toEqual([
      "visible-noncritical",
    ]);
    expect(filtered[0]?.criticalTaskIds).toBe(projected[0]?.criticalTaskIds);
    expect([...projected[0]!.criticalTaskIds]).toEqual(["true-critical"]);
    const projectRow = rows.find((row) => row.kind === "project");
    expect(projectRow?.criticalCount).toBe(1);
    expect(projectRow?.warning).toContain("1 critical");
    expect(
      rows.find((row) => row.key === "filtered-critical:task:visible-noncritical"),
    ).toMatchObject({ critical: false, criticalCount: 0 });
    expect(
      rows.some((row) => row.key === "filtered-critical:task:true-critical"),
    ).toBe(false);
  });

  it("threads partial baseline and critical completeness into every row", () => {
    const projected = buildPortfolioProjects(
      [
        project("partial", {
          latestBaseline: {
            id: "partial-baseline",
            name: "Partial baseline",
            capturedAt: "2026-09-01",
            items: [],
          },
          jobs: [
            job("partial-job", {
              plannedStartAt: "2026-09-01",
              plannedEndAt: "2026-09-10",
              tasks: [
                task("partial-task", {
                  jobId: "partial-job",
                  plannedStartAt: "2026-09-01",
                  plannedEndAt: "2026-09-02",
                }),
              ],
            }),
          ],
        }),
      ],
      new Date(NOW),
    );
    const expansion = defaultPortfolioExpansion(projected);
    const rows = buildPortfolioWorkRows(
      projected,
      expansion.projects,
      expansion.jobs,
      NOW,
      "latest",
      new Map(),
      {
        baselineItemsComplete: false,
        criticalPathComplete: false,
      },
    );

    expect(rows[0]?.warning).toContain(
      "Critical path unavailable—partial data",
    );
    expect(rows[0]?.criticalCount).toBeNull();
    expect(rows[1]?.baselineState).toEqual({
      kind: "unavailable-partial",
    });
    expect(rows[2]).toMatchObject({
      critical: false,
      criticalCount: null,
      baselineState: { kind: "unavailable-partial" },
    });
  });

  it("renders project-calendar row states independently of browser timezone", () => {
    const instant = "2026-09-21T02:00:00.000Z";
    const sources = [
      project("row-toronto", {
        calendar: {
          ...DEFAULT_WORKING_CALENDAR,
          timeZone: "America/Toronto",
        },
        jobs: [
          job("row-toronto-job", {
            tasks: [
              task("row-toronto-task", {
                jobId: "row-toronto-job",
                dueAt: "2026-09-20",
              }),
            ],
          }),
        ],
      }),
      project("row-tokyo", {
        calendar: {
          ...DEFAULT_WORKING_CALENDAR,
          timeZone: "Asia/Tokyo",
        },
        jobs: [
          job("row-tokyo-job", {
            tasks: [
              task("row-tokyo-task", {
                jobId: "row-tokyo-job",
                dueAt: "2026-09-20",
              }),
            ],
          }),
        ],
      }),
    ];
    const previousTimeZone = process.env.TZ;
    try {
      for (const viewerTimeZone of [
        "UTC",
        "America/Los_Angeles",
        "Asia/Tokyo",
      ]) {
        process.env.TZ = viewerTimeZone;
        const projected = buildPortfolioProjects(
          sources,
          new Date(instant),
        );
        const expansion = defaultPortfolioExpansion(projected);
        const rows = buildPortfolioWorkRows(
          projected,
          expansion.projects,
          expansion.jobs,
          instant,
          "none",
        );
        expect(
          rows
            .filter((row) => row.kind === "project" || row.kind === "task")
            .map((row) => [row.key, row.state]),
        ).toEqual([
          ["row-toronto:project", "remaining"],
          ["row-toronto:task:row-toronto-task", "remaining"],
          ["row-tokyo:project", "overdue"],
          ["row-tokyo:task:row-tokyo-task", "overdue"],
        ]);
      }
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });

  it("injects at most two labelled hierarchy context rows across page boundaries", () => {
    expect(PORTFOLIO_WORK_CONTEXT_OVERHEAD).toBe(2);
    const projected = buildPortfolioProjects(
      [
        project("context", {
          jobs: [
            job("context-job", {
              tasks: Array.from({ length: 205 }, (_, index) =>
                task(`context-task-${index}`, {
                  jobId: "context-job",
                }),
              ),
            }),
          ],
        }),
      ],
      new Date(NOW),
    );
    const expansion = defaultPortfolioExpansion(projected);
    const rows = buildPortfolioWorkRows(
      projected,
      expansion.projects,
      expansion.jobs,
      NOW,
      "none",
    );
    const page = paginatePortfolioWorkRows(rows, 1);

    expect(page).toHaveLength(9);
    expect(page.slice(0, 3).map((row) => [row.kind, row.context])).toEqual([
      ["project", true],
      ["job", true],
      ["task", undefined],
    ]);
    expect(page.length).toBeLessThanOrEqual(
      PORTFOLIO_WORK_PAGE_SIZE + PORTFOLIO_WORK_CONTEXT_OVERHEAD,
    );
  });
});

describe("PortfolioSchedule", () => {
  it("preserves unrelated query state in canonical control URLs", () => {
    expect(
      portfolioControlHref(
        query({
          q: "tower",
          projectManager: "Ada",
          attention: "behind-baseline",
          zoom: "month",
        }),
        { view: "resources" },
      ),
    ).toBe(
      "/app/projects/schedule?q=tower&projectStatus=active&projectManager=Ada&state=all&attention=behind-baseline&view=resources&zoom=month&baseline=latest",
    );
  });

  it("composes rapid query patches from the latest optimistic value", () => {
    const initial = query();
    const afterState = applyPortfolioQueryPatch(initial, {
      state: "overdue",
    });
    const afterView = applyPortfolioQueryPatch(afterState, {
      view: "resources",
    });

    expect(afterView).toMatchObject({
      state: "overdue",
      view: "resources",
      projectStatus: "active",
      baseline: "latest",
    });
    expect(portfolioControlHref(afterView, {})).toContain("state=overdue");
    expect(portfolioControlHref(afterView, {})).toContain("view=resources");
    expect(
      reconcilePortfolioOptimisticQuery(initial, afterView, afterState),
    ).toMatchObject({
      state: "overdue",
      view: "resources",
    });
  });

  it("keeps a local search draft until the server q actually changes", () => {
    expect(
      reconcilePortfolioSearchDraft("tower", "tower crane", "tower"),
    ).toBe("tower crane");
    expect(
      reconcilePortfolioSearchDraft("tower", "tower crane", ""),
    ).toBe("");
    expect(
      reconcilePortfolioSearchDraft("tower", "tower crane", "harbour"),
    ).toBe("harbour");
  });

  it("counts conflicting assignments per project in chart and table", async () => {
    const projected = buildPortfolioProjects(
      [
        project("overlap-a", {
          jobs: [
            job("overlap-a-job", {
              projectManager: "Alex",
              status: "blocked",
              plannedStartAt: "2026-09-21",
              plannedEndAt: "2026-09-22",
            }),
          ],
        }),
        project("overlap-b", {
          jobs: [
            job("overlap-b-job", {
              projectManager: "Alex",
              plannedStartAt: "2026-09-21",
              plannedEndAt: "2026-09-22",
            }),
          ],
        }),
      ],
      new Date(NOW),
    );
    const lanes = buildPortfolioResourceLanes(
      buildPortfolioScheduleAssignments(projected),
    );
    const counts = getPortfolioOverlapCounts(lanes);
    const expansion = defaultPortfolioExpansion(projected);
    const rows = buildPortfolioWorkRows(
      projected,
      expansion.projects,
      expansion.jobs,
      NOW,
      "latest",
      counts,
    );

    expect([...counts.entries()]).toEqual([
      ["overlap-a", 1],
      ["overlap-b", 1],
    ]);
    expect(
      rows.find((row) => row.key === "overlap-a:project")?.warning,
    ).toContain("1 potential overlaps");
    expect(
      rows.find((row) => row.key === "overlap-b:project")?.warning,
    ).toContain("1 potential overlaps");

    const html = renderToStaticMarkup(
      createElement(PortfolioSchedule, {
        data: data(projected),
        query: query(),
        now: NOW,
      }),
    );
    expect(html.match(/1 potential overlaps/g)).toHaveLength(2);

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
    try {
      await act(async () => {
        root.render(
          createElement(PortfolioSchedule, {
            data: data(projected),
            query: query(),
            now: NOW,
          }),
        );
      });
      const toggle = container.querySelector(
        '[aria-label="Toggle current work page table"]',
      )!;
      await act(async () => {
        toggle.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });
      expect(
        container.textContent?.match(/1 potential overlaps/g),
      ).toHaveLength(4);
      const projectTableWarnings = [
        ...container.querySelectorAll(
          'tbody tr[data-work-row-id$=":project"] td:last-child',
        ),
      ].map((cell) => cell.textContent);
      expect(projectTableWarnings).toHaveLength(2);
      expect(
        projectTableWarnings.every((warning) =>
          warning?.includes("1 potential overlaps"),
        ),
      ).toBe(true);

      await act(async () => {
        root.render(
          createElement(PortfolioSchedule, {
            data: data(projected),
            query: query({
              attention: "resource-overlap",
              state: "blocked",
              view: "resources",
            }),
            now: NOW,
          }),
        );
      });
      expect(container.textContent).toContain("Potential overlap");
      expect(container.textContent).not.toContain("Project overlap-b");
      const resourceTableToggle = container.querySelector(
        '[aria-label="Toggle current assignment page table"]',
      )!;
      await act(async () => {
        resourceTableToggle.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });
      const projectManagerRow = [
        ...container.querySelectorAll("tbody tr"),
      ].find((row) => row.textContent?.includes("Project manager"));
      expect(projectManagerRow?.textContent).toContain("Potential overlap");
      expect(projectManagerRow?.textContent).not.toContain(
        "No overlap detected",
      );
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

  it("renders exact active and filtered empty states with accessible links", () => {
    const active = renderToStaticMarkup(
      createElement(PortfolioSchedule, {
        data: data([]),
        query: query({
          attention: "behind-baseline",
          zoom: "month",
        }),
        now: NOW,
      }),
    );
    expect(active).toContain("No active projects have schedule work.");
    expect(active).toContain(">View all projects</a>");
    expect(active).toContain("projectStatus=all");
    expect(active).toContain("attention=behind-baseline");
    expect(active).toContain("zoom=month");
    expect(active).toContain("min-h-11 min-w-11");

    const filtered = renderToStaticMarkup(
      createElement(PortfolioSchedule, {
        data: data([]),
        query: query({ q: "tower" }),
        now: NOW,
      }),
    );
    expect(filtered).toContain(
      "No portfolio schedule rows match these filters.",
    );
    expect(filtered).toContain(">Reset filters</a>");
  });

  it("shows exact matching item totals for task attention modes", () => {
    const source = data([
      project("attention-count", {
        jobs: [
          job("attention-parent", {
            plannedStartAt: "2026-09-01",
            plannedEndAt: "2026-09-30",
            tasks: [
              task("overdue-a", {
                jobId: "attention-parent",
                dueAt: "2026-09-18",
              }),
              task("overdue-b", {
                jobId: "attention-parent",
                plannedEndAt: "2026-09-30",
                dueAt: "2026-09-18",
              }),
              task("unscheduled", {
                jobId: "attention-parent",
              }),
              task("future", {
                jobId: "attention-parent",
                dueAt: "2026-09-30",
              }),
            ],
          }),
          job("blocked-undated", { status: "blocked" }),
          job("overdue-job-only", {
            plannedStartAt: "2026-09-01",
            plannedEndAt: "2026-09-10",
          }),
        ],
      }),
    ]);
    const renderAttention = (
      attention: PortfolioScheduleQuery["attention"],
    ) =>
      renderToStaticMarkup(
        createElement(PortfolioSchedule, {
          data: source,
          query: query({ attention }),
          now: NOW,
        }),
      );
    const overdue = renderAttention("overdue-tasks");
    const unscheduled = renderAttention("unscheduled-active-work");

    expect(overdue).toContain("2 matching attention items");
    expect(overdue).toContain("Task overdue-a");
    expect(overdue).toContain("Task overdue-b");
    expect(overdue).not.toContain("Job overdue-job-only");
    expect(unscheduled).toContain("2 matching attention items");
    expect(unscheduled).toContain("Task unscheduled");
    expect(unscheduled).toContain("Job blocked-undated");
    expect(unscheduled).not.toContain("Task future");
  });

  it("labels matching attention totals as partial when source rows are truncated", () => {
    const html = renderToStaticMarkup(
      createElement(PortfolioSchedule, {
        data: data(
          [
            project("partial-attention-count", {
              jobs: [
                job("partial-attention-parent", {
                  tasks: [
                    task("partial-overdue", {
                      jobId: "partial-attention-parent",
                      dueAt: "2026-09-18",
                    }),
                  ],
                }),
              ],
            }),
          ],
          { tasks: true },
        ),
        query: query({ attention: "overdue-tasks" }),
        now: NOW,
      }),
    );

    expect(html).toContain("1 matching attention items (partial)");
  });

  it("renders a dedicated Resources empty state without a table toggle", () => {
    const html = renderToStaticMarkup(
      createElement(PortfolioSchedule, {
        data: data([project("resource-empty")]),
        query: query({ view: "resources" }),
        now: NOW,
      }),
    );

    expect(html).toContain(
      "No resource assignments match these portfolio filters.",
    );
    expect(html).not.toContain("Toggle current assignment page table");
  });

  it("filters authoritative resource lanes by visible entity keys", () => {
    const html = renderToStaticMarkup(
      createElement(PortfolioSchedule, {
        data: data([
          project("resource-visible", {
            jobs: [
              job("resource-visible-job", {
                projectManager: "Morgan",
                plannedStartAt: "2026-09-21",
                plannedEndAt: "2026-09-22",
                tasks: [
                  task("resource-visible-task", {
                    jobId: "resource-visible-job",
                    title: "Visible overlapping task",
                    assignee: "Alex",
                    plannedStartAt: "2026-09-21",
                    plannedEndAt: "2026-09-22",
                  }),
                  task("resource-hidden-task", {
                    jobId: "resource-visible-job",
                    title: "Hidden completed task",
                    assignee: "Alex",
                    status: "done",
                    plannedStartAt: "2026-09-21",
                    plannedEndAt: "2026-09-22",
                  }),
                ],
              }),
            ],
          }),
          project("resource-counterpart", {
            status: "closed",
            jobs: [
              job("resource-counterpart-job", {
                projectManager: "Taylor",
                plannedStartAt: "2026-09-21",
                plannedEndAt: "2026-09-22",
                tasks: [
                  task("resource-counterpart-task", {
                    jobId: "resource-counterpart-job",
                    title: "Hidden counterpart task",
                    assignee: "Alex",
                    status: "done",
                    plannedStartAt: "2026-09-21",
                    plannedEndAt: "2026-09-22",
                  }),
                ],
              }),
            ],
          }),
        ]),
        query: query({
          view: "resources",
          state: "remaining",
          hideCompleted: true,
        }),
        now: NOW,
      }),
    );

    expect(html).toContain("Visible overlapping task");
    expect(html).toContain("Potential overlap · 1 assignment");
    expect(html).toContain("Task assignee");
    expect(html).toContain("Project manager");
    expect(html).toContain("Morgan");
    expect(html).not.toContain("Taylor");
    expect(html).not.toContain("Hidden completed task");
    expect(html).not.toContain("Hidden counterpart task");
    expect(html).not.toMatch(/<span[^>]*>Unscheduled<\/span>/);
  });

  it("renders all truncation alerts, empty hierarchy facts, controls, and one scroller", () => {
    const html = renderToStaticMarkup(
      createElement(PortfolioSchedule, {
        data: data(
          [
            project("empty"),
            project("empty-task", {
              jobs: [job("no-tasks")],
            }),
          ],
          {
            projects: true,
            jobs: true,
            tasks: true,
            dependencies: true,
            calendarExceptions: true,
            baselineItems: true,
          },
        ),
        query: query(),
        now: NOW,
      }),
    );

    for (const label of [
      "Project results are partial",
      "Job results are partial",
      "Task results are partial",
      "Dependency results are partial",
      "Calendar exception results are partial",
      "Baseline item results are partial",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("No jobs");
    expect(html).toContain("No tasks");
    expect(html).toContain("Unscheduled work");
    expect(html).toContain("Partial task count");
    expect(html).toContain("Work");
    expect(html).toContain("Resources");
    expect(html).toContain("min-h-11");
    expect(html).toContain('aria-pressed="true"');
    expect(html.match(/data-portfolio-chart-scroller/g)).toHaveLength(1);
    expect(html).toContain(
      "grid-cols-[minmax(18rem,24rem)_minmax(48rem,1fr)]",
    );
    expect(html).toContain('class="min-w-[72rem]"');
  });

  it("does not evaluate behind-baseline attention from partial baseline items", () => {
    const html = renderToStaticMarkup(
      createElement(PortfolioSchedule, {
        data: data(
          [
            project("partial-attention", {
              latestBaseline: {
                id: "partial-attention-baseline",
                name: "Partial baseline",
                capturedAt: "2026-09-01",
                items: [
                  {
                    id: "partial-attention-item",
                    baselineId: "partial-attention-baseline",
                    entityType: "job",
                    entityId: "partial-attention-job",
                    plannedStartAt: "2026-09-01",
                    plannedEndAt: "2026-09-10",
                    dueAt: null,
                  },
                ],
              },
              jobs: [
                job("partial-attention-job", {
                  plannedStartAt: "2026-09-01",
                  plannedEndAt: "2026-09-15",
                }),
              ],
            }),
          ],
          { baselineItems: true },
        ),
        query: query({ attention: "behind-baseline" }),
        now: NOW,
      }),
    );

    expect(html).toContain("Baseline item results are partial");
    expect(html).toContain(
      "Behind-baseline filter unavailable—partial baseline data.",
    );
    expect(html).toContain("0 projects · 0 jobs · 0 tasks");
    expect(html).not.toContain(
      "No portfolio schedule rows match these filters.",
    );
  });

  it("synchronizes the controlled search draft when the server q changes", async () => {
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
    const renderWithQ = async (q: string) => {
      await act(async () => {
        root.render(
          createElement(PortfolioSchedule, {
            data: data([project("search-draft")]),
            query: query({ q }),
            now: NOW,
          }),
        );
      });
    };

    try {
      await renderWithQ("tower");
      const search = container.querySelector<HTMLInputElement>(
        'input[name="q"]',
      )!;
      expect(search.value).toBe("tower");

      await renderWithQ("");
      expect(search.value).toBe("");

      await renderWithQ("harbour");
      expect(search.value).toBe("harbour");
    } finally {
      await act(async () => root.unmount());
      for (const [key, value] of previousGlobals) {
        if (value === undefined) delete globals[key];
        else globals[key] = value;
      }
      globals.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      dom.window.close();
    }
  });

  it("renders partial chart and table facts without definitive claims", async () => {
    const props = {
      data: data(
        [
          project("partial-render", {
            latestBaseline: {
              id: "partial-render-baseline",
              name: "Partial render baseline",
              capturedAt: "2026-09-01",
              items: [],
            },
            jobs: [
              job("partial-render-job", {
                plannedStartAt: "2026-09-01",
                plannedEndAt: "2026-09-10",
                tasks: [
                  task("partial-render-task", {
                    jobId: "partial-render-job",
                    plannedStartAt: "2026-09-01",
                    plannedEndAt: "2026-09-02",
                  }),
                ],
              }),
            ],
          }),
        ],
        {
          baselineItems: true,
          tasks: true,
          dependencies: true,
        },
      ),
      query: query(),
      now: NOW,
    };
    const html = renderToStaticMarkup(
      createElement(PortfolioSchedule, props),
    );

    expect(html).toContain("Unavailable—partial data");
    expect(html).toContain("Critical path unavailable—partial data");
    expect(html).not.toContain("Added since baseline");
    expect(html).not.toContain(">Critical</span>");

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
    try {
      await act(async () => {
        root.render(createElement(PortfolioSchedule, props));
      });
      const toggle = container.querySelector(
        '[aria-label="Toggle current work page table"]',
      )!;
      await act(async () => {
        toggle.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });
      expect(
        [...container.querySelectorAll("tbody tr td:nth-child(10)")].map(
          (cell) => cell.textContent,
        ),
      ).toEqual([
        "Critical path unavailable—partial data",
        "Critical path unavailable—partial data",
        "Critical path unavailable—partial data",
      ]);
      expect(
        [...container.querySelectorAll("tbody tr td:nth-child(12)")].map(
          (cell) => cell.textContent,
        ),
      ).toEqual([
        "Unavailable—partial data",
        "Unavailable—partial data",
        "Unavailable—partial data",
      ]);
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

  it("paginates the flattened graph at 200 and mounts table rows only while open", async () => {
    expect(PORTFOLIO_WORK_PAGE_SIZE).toBe(200);
    const tasks = Array.from({ length: 205 }, (_, index) =>
      task(`task-${index}`, {
        jobId: "job-many",
        dueAt: "2026-09-21",
      }),
    );
    const props = {
      data: data([
        project("many", {
          jobs: [job("job-many", { tasks })],
        }),
      ]),
      query: query(),
      now: NOW,
    };
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

    try {
      await act(async () => root.render(createElement(PortfolioSchedule, props)));
      const chartRows = () => [
        ...container.querySelectorAll(
          '[data-portfolio-chart-scroller] [data-work-row-id]',
        ),
      ];
      expect(chartRows()).toHaveLength(200);
      expect(container.querySelector("tbody")).toBeNull();
      expect(container.textContent).toContain("Showing 1–200 of 207 rows");

      const toggle = container.querySelector(
        '[aria-label="Toggle current work page table"]',
      )!;
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(toggle.getAttribute("aria-controls")).toBeNull();
      await act(async () => {
        toggle.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });
      const tableId = toggle.getAttribute("aria-controls");
      expect(tableId).toBeTruthy();
      expect(container.ownerDocument.getElementById(tableId!)).not.toBeNull();
      expect(container.querySelectorAll("tbody tr")).toHaveLength(200);
      expect(
        [...container.querySelectorAll("tbody tr")].map((row) =>
          row.getAttribute("data-work-row-id"),
        ),
      ).toEqual(
        chartRows().map((row) => row.getAttribute("data-work-row-id")),
      );

      const next = container.querySelector(
        '[aria-label="Next work rows page"]',
      )!;
      await act(async () => {
        next.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });
      expect(chartRows()).toHaveLength(9);
      expect(container.querySelectorAll("tbody tr")).toHaveLength(9);
      expect(container.textContent).toContain("Showing 201–207 of 207 rows");
      expect(
        chartRows().slice(0, 2).map((row) =>
          row.getAttribute("data-context-row"),
        ),
      ).toEqual(["true", "true"]);

      const manyProjects = Array.from({ length: 205 }, (_, index) =>
        project(`page-project-${index}`, {
          jobs:
            index === 200
              ? [job(`page-job-${index}`, { projectManager: null })]
              : [],
        }),
      );
      await act(async () => {
        root.render(
          createElement(PortfolioSchedule, {
            ...props,
            data: data(manyProjects),
          }),
        );
      });
      const nextProjectsPage = container.querySelector(
        '[aria-label="Next work rows page"]',
      )!;
      await act(async () => {
        nextProjectsPage.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });
      expect(container.textContent).toContain("Page 2 of 2");
      const expandOnPageTwo = container.querySelector(
        '[aria-label="Expand project Project page-project-200"]',
      )!;
      await act(async () => {
        expandOnPageTwo.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });
      expect(container.textContent).toContain("Page 2 of 2");
      expect(container.textContent).toContain("Showing 201–206 of 206 rows");
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
});
