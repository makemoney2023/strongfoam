import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error jsdom does not publish bundled TypeScript declarations.
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PORTFOLIO_WORK_PAGE_SIZE,
  PortfolioSchedule,
  buildPortfolioWorkRows,
  defaultPortfolioExpansion,
  getPortfolioOverlapCounts,
  portfolioControlHref,
} from "@/components/ops/portfolio-schedule";
import {
  buildPortfolioProjects,
  buildPortfolioResourceLanes,
  buildPortfolioScheduleAssignments,
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

  it("counts conflicting assignments per project in chart and table", async () => {
    const projected = buildPortfolioProjects(
      [
        project("overlap-a", {
          jobs: [
            job("overlap-a-job", {
              projectManager: "Alex",
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
      expect(projectTableWarnings).toEqual([
        "1 potential overlaps",
        "1 potential overlaps",
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
      expect(chartRows()).toHaveLength(7);
      expect(container.querySelectorAll("tbody tr")).toHaveLength(7);
      expect(container.textContent).toContain("Showing 201–207 of 207 rows");
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
