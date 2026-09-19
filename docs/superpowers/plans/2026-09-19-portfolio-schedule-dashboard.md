# Portfolio Schedule and Dashboard Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded, read-only all-project Schedule at `/app/projects/schedule` and derive dashboard schedule-attention widgets from the same portfolio projection.

**Architecture:** Build one set-based store read for selected projects and their jobs, tasks, dependencies, calendars, latest baselines, and baseline items. Serialize that result on the server, then use pure portfolio functions for project health, filtering, baseline roll-up, cross-project resource overlaps, and dashboard summaries. Keep all schedule mutations on the existing project Schedule and make portfolio/dashboard actions drill through to filtered portfolio or project views.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM/PostgreSQL, Vitest, Tailwind 4, existing shadcn/ui components, Lucide icons.

---

## Source requirements

- PRD: `docs/strongfoam-crm-erp-prd.md`, SCH-022 through SCH-031.
- Design: `docs/superpowers/specs/2026-09-19-portfolio-schedule-dashboard-design.md`.
- Existing project Schedule:
  - `src/lib/ops/project-schedule.ts`
  - `src/lib/ops/project-schedule-graph.ts`
  - `src/lib/ops/project-schedule-planning.ts`
  - `src/components/ops/project-schedule.tsx`
- Before adding client boundaries, read:
  `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`.

## Global constraints

- Use **Portfolio Schedule** for the cross-project page and **Schedule** for the
  shared product concept.
- Default to active projects; other statuses remain filterable.
- Keep the portfolio workspace read-only.
- Do not create cross-project dependencies or a portfolio critical path.
- Resolve calendars, critical paths, and baselines independently per project.
- Use one bounded set of store reads; never call a project Schedule query in a
  loop.
- Dashboard counts and links must use the same projection and filter semantics
  as `/app/projects/schedule`.
- Do not invent hours, utilization, capacity, project dates, or baseline dates.
- Preserve the existing Projects table and Home widgets.
- Do not add a chart/Gantt dependency.
- Do not stage `.playwright-mcp/` or root screenshot files.
- Use the repository-required `makemoney2023` author and committer environment
  for every commit, then verify the author before pushing.

## File structure

| Path | Responsibility |
|---|---|
| `src/lib/ops/portfolio-schedule.ts` | Pure portfolio ranges, state, filters, baseline roll-up, cross-calendar resources, and dashboard summaries |
| `src/lib/ops/portfolio-schedule.test.ts` | Pure portfolio behavior |
| `src/lib/ops/portfolio-schedule-query.ts` | Parse and serialize shareable portfolio URL state |
| `src/lib/ops/portfolio-schedule-query.test.ts` | URL defaults, validation, and link generation |
| `src/lib/ops/store.ts` | Bounded database portfolio read |
| `src/lib/ops/demo-store.ts` | Demo portfolio read parity |
| `src/lib/ops/demo-store.test.ts` | Scoping, bounds, and raw data contract |
| `src/components/ops/portfolio-schedule.tsx` | Portfolio controls, project/job/task Work hierarchy, warnings, and table |
| `src/components/ops/portfolio-resource-schedule.tsx` | Cross-project resource lanes and table |
| `src/app/app/projects/schedule/page.tsx` | Authorized server route and serialization |
| `src/app/app/projects/page.tsx` | Entry action to Portfolio Schedule |
| `src/app/app/page.tsx` | Schedule attention and upcoming-event widgets |

---

## Phase A — Portfolio domain and bounded data

### Task 1: Build the pure portfolio schedule domain

**Files:**
- Create: `src/lib/ops/portfolio-schedule.ts`
- Create: `src/lib/ops/portfolio-schedule.test.ts`

- [ ] **Step 1: Write failing project roll-up tests**

Create `src/lib/ops/portfolio-schedule.test.ts` with fixed ISO fixtures:

```ts
import { describe, expect, it } from "vitest";
import {
  buildPortfolioProjects,
  getPortfolioProjectState,
  type PortfolioScheduleProject,
} from "@/lib/ops/portfolio-schedule";
import { DEFAULT_WORKING_CALENDAR } from "@/lib/ops/project-schedule-planning";

const now = new Date("2026-09-19T12:00:00.000Z");

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

describe("portfolio schedule", () => {
  it("keeps projects with no jobs and reports no synthetic range", () => {
    const [result] = buildPortfolioProjects([project()], now);
    expect(result).toMatchObject({
      id: "project-1",
      state: "unscheduled",
      range: { start: null, finish: null },
      progress: { completed: 0, total: 0, percent: null },
    });
  });

  it("gives blocked project work precedence over overdue work", () => {
    expect(
      getPortfolioProjectState(
        project({
          jobs: [
            {
              id: "job-1",
              number: "JOB-1",
              name: "North wall",
              status: "blocked",
              projectManager: "Alex Rivera",
              foreman: null,
              plannedStartAt: "2026-09-01T12:00:00.000Z",
              plannedEndAt: "2026-09-10T12:00:00.000Z",
              tasks: [],
            },
          ],
        }),
        now,
      ),
    ).toBe("blocked");
  });
});
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run:

```bash
npx vitest run src/lib/ops/portfolio-schedule.test.ts
```

Expected: FAIL because `@/lib/ops/portfolio-schedule` does not exist.

- [ ] **Step 3: Define the portfolio contracts**

Create `src/lib/ops/portfolio-schedule.ts`:

```ts
import {
  getJobScheduleState,
  getTaskProgress,
  getTaskScheduleState,
  type ProjectScheduleBaselineItem,
  type ProjectScheduleDependency,
  type ProjectScheduleJob,
  type ScheduleState,
} from "@/lib/ops/project-schedule";
import type { ResolvedWorkingCalendar } from "@/lib/ops/project-schedule-planning";

export type PortfolioScheduleBaseline = {
  id: string;
  name: string;
  capturedAt: string;
  items: ProjectScheduleBaselineItem[];
};

export type PortfolioScheduleProject = {
  id: string;
  name: string;
  status: string;
  projectManager: string | null;
  calendar: ResolvedWorkingCalendar;
  latestBaseline: PortfolioScheduleBaseline | null;
  jobs: ProjectScheduleJob[];
  dependencies: ProjectScheduleDependency[];
};

export type PortfolioScheduleData = {
  projects: PortfolioScheduleProject[];
  truncation: {
    projects: boolean;
    jobs: boolean;
    tasks: boolean;
    dependencies: boolean;
    calendarExceptions: boolean;
    baselineItems: boolean;
  };
};

export type PortfolioProjectRange = {
  start: string | null;
  finish: string | null;
};

export type ProjectedPortfolioProject = PortfolioScheduleProject & {
  state: ScheduleState;
  range: PortfolioProjectRange;
  progress: ReturnType<typeof getTaskProgress>;
  warningCounts: {
    blocked: number;
    overdue: number;
    unscheduled: number;
    critical: number;
  };
  baselineFinishVarianceDays: number | null;
};

export type PortfolioProjectionFilter = {
  state: "all" | "remaining" | "complete" | "blocked" | "overdue" | "unscheduled";
  attention: "all" | "overdue-tasks" | "unscheduled-active-work" | "behind-baseline" | "resource-overlap";
  from: string | null;
  to: string | null;
  hideCompleted: boolean;
  overlapProjectIds: ReadonlySet<string>;
  baselineItemsComplete: boolean;
};
```

- [ ] **Step 4: Implement truthful project ranges and state**

Add these exports:

```ts
export function getPortfolioProjectRange(
  project: PortfolioScheduleProject,
): PortfolioProjectRange;

export function getPortfolioProjectState(
  project: PortfolioScheduleProject,
  now?: Date,
): ScheduleState;

export function buildPortfolioProjects(
  projects: readonly PortfolioScheduleProject[],
  now?: Date,
): ProjectedPortfolioProject[];

export function filterPortfolioProjects(
  projects: readonly ProjectedPortfolioProject[],
  filter: PortfolioProjectionFilter,
  now?: Date,
): ProjectedPortfolioProject[];
```

Implementation rules:

1. Collect job `plannedStartAt`/`plannedEndAt` and task
   `plannedStartAt`/`plannedEndAt`/`dueAt`.
2. Use the earliest valid start or milestone as `start`.
3. Use the latest valid planned completion or due date as `finish`.
4. Closed projects are complete.
5. Any blocked non-complete job makes the project blocked.
6. Otherwise any overdue job or open overdue task makes it overdue.
7. A project with work but no schedule date is unscheduled.
8. Other non-closed projects are remaining.
9. Progress uses all tasks, regardless of filters or collapsed state.
10. State filtering preserves project/job parents when a descendant matches.
11. Date filtering includes projects whose truthful range intersects
    `from..to`; undated projects remain only when no date range is active.
12. `behind-baseline` requires positive project finish variance.
13. `resource-overlap` requires the project ID in `overlapProjectIds`.
14. Hiding completed rows never changes source progress totals.

- [ ] **Step 5: Add latest-baseline and warning-count tests**

Add:

```ts
it("uses the latest project baseline finish without inventing missing dates", () => {
  const [result] = buildPortfolioProjects([
    project({
      jobs: [scheduledJob("2026-09-10", "2026-09-22")],
      latestBaseline: {
        id: "baseline-1",
        name: "Approved",
        capturedAt: "2026-09-01T12:00:00.000Z",
        items: [
          baselineJobItem("job-1", "2026-09-10", "2026-09-18"),
        ],
      },
    }),
  ], now);
  expect(result?.baselineFinishVarianceDays).toBe(2);
});

it("counts critical tasks independently inside each project", () => {
  const projects = buildPortfolioProjects([
    dependencyProject("project-a"),
    dependencyProject("project-b"),
  ], now);
  expect(projects.map((item) => item.warningCounts.critical)).toEqual([2, 2]);
});

it("preserves parents when only an overdue task matches", () => {
  const filtered = filterPortfolioProjects(
    buildPortfolioProjects([projectWithOneOverdueTask()], now),
    {
      state: "overdue",
      attention: "all",
      from: null,
      to: null,
      hideCompleted: false,
      overlapProjectIds: new Set(),
    },
    now,
  );
  expect(filtered).toHaveLength(1);
  expect(filtered[0]?.jobs[0]?.tasks).toHaveLength(1);
});
```

Use Monday–Friday fixture dates so the expected variance is two working days.

- [ ] **Step 6: Implement baseline roll-up and per-project critical counts**

For each project:

1. Call `calculateCriticalPath(project.jobs.flatMap(...), project.dependencies,
   project.calendar)`.
2. Count critical IDs only inside that project.
3. Find the latest current finish from `getPortfolioProjectRange`.
4. Find the latest baseline finish/due across that baseline's items.
5. Use `workingDayDifference` only when both values exist.
6. Return `null` for missing current or baseline finish.

- [ ] **Step 7: Run focused tests**

Run:

```bash
npx vitest run \
  src/lib/ops/portfolio-schedule.test.ts \
  src/lib/ops/project-schedule.test.ts \
  src/lib/ops/project-schedule-graph.test.ts \
  src/lib/ops/project-schedule-planning.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the portfolio domain**

```bash
git add \
  src/lib/ops/portfolio-schedule.ts \
  src/lib/ops/portfolio-schedule.test.ts
```

Commit message:

```text
Add portfolio Schedule roll-up rules.
```

---

### Task 2: Add shareable portfolio Schedule query state

**Files:**
- Create: `src/lib/ops/portfolio-schedule-query.ts`
- Create: `src/lib/ops/portfolio-schedule-query.test.ts`

- [ ] **Step 1: Write failing URL-state tests**

```ts
import { describe, expect, it } from "vitest";
import {
  parsePortfolioScheduleQuery,
  portfolioScheduleHref,
} from "@/lib/ops/portfolio-schedule-query";

describe("portfolio Schedule query", () => {
  it("defaults to active projects, Work, Week, and latest baselines", () => {
    expect(parsePortfolioScheduleQuery({})).toMatchObject({
      projectStatus: "active",
      state: "all",
      attention: "all",
      view: "work",
      zoom: "week",
      baseline: "latest",
      hideCompleted: false,
    });
  });

  it("drops invalid enum and date values", () => {
    expect(
      parsePortfolioScheduleQuery({
        state: "late",
        view: "capacity",
        anchor: "09/19/2026",
      }),
    ).toMatchObject({
      state: "all",
      view: "work",
      anchor: null,
    });
  });

  it("builds widget links with only canonical parameters", () => {
    expect(
      portfolioScheduleHref({
        projectStatus: "active",
        attention: "overdue-tasks",
      }),
    ).toBe(
      "/app/projects/schedule?projectStatus=active&attention=overdue-tasks",
    );
  });
});
```

- [ ] **Step 2: Run the tests and verify failure**

```bash
npx vitest run src/lib/ops/portfolio-schedule-query.test.ts
```

Expected: FAIL because the query module does not exist.

- [ ] **Step 3: Implement parsing and canonical links**

Export:

```ts
export type PortfolioScheduleQuery = {
  q: string;
  projectStatus: string;
  projectManager: string;
  state: "all" | "remaining" | "complete" | "blocked" | "overdue" | "unscheduled";
  attention: "all" | "overdue-tasks" | "unscheduled-active-work" | "behind-baseline" | "resource-overlap";
  view: "work" | "resources";
  zoom: "week" | "month";
  anchor: string | null;
  from: string | null;
  to: string | null;
  baseline: "latest" | "none";
  hideCompleted: boolean;
};

export function parsePortfolioScheduleQuery(
  input: Record<string, string | string[] | undefined>,
): PortfolioScheduleQuery;

export function portfolioScheduleHref(
  input: Partial<PortfolioScheduleQuery>,
): string;
```

Use exact enum sets and `/^\d{4}-\d{2}-\d{2}$/` plus calendar-date validation.
Sort emitted query keys as:
`q`, `projectStatus`, `projectManager`, `state`, `attention`, `view`, `zoom`,
`anchor`, `from`, `to`, `baseline`, `hideCompleted`.

- [ ] **Step 4: Run tests and commit**

```bash
npx vitest run src/lib/ops/portfolio-schedule-query.test.ts
```

Expected: PASS.

```bash
git add \
  src/lib/ops/portfolio-schedule-query.ts \
  src/lib/ops/portfolio-schedule-query.test.ts
```

Commit message:

```text
Add shareable portfolio Schedule filters.
```

---

### Task 3: Add one bounded portfolio schedule store read

**Files:**
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/demo-store.test.ts`

- [ ] **Step 1: Define the raw store contract**

In `src/lib/ops/store.ts`, export:

```ts
export type PortfolioScheduleStoreFilters = {
  q?: string;
  projectStatus?: string;
  projectManager?: string;
};

export type PortfolioScheduleTruncation = {
  projects: boolean;
  jobs: boolean;
  tasks: boolean;
  dependencies: boolean;
  calendarExceptions: boolean;
  baselineItems: boolean;
};

export type PortfolioScheduleStoreResult = {
  projects: ProjectRow[];
  jobs: JobRow[];
  tasks: JobTaskRow[];
  dependencies: JobTaskDependencyRow[];
  calendars: ScheduleCalendarRow[];
  calendarExceptions: ScheduleCalendarExceptionRow[];
  baselines: ProjectScheduleBaselineRow[];
  baselineItems: ProjectScheduleBaselineItemRow[];
  truncation: PortfolioScheduleTruncation;
};
```

- [ ] **Step 2: Add failing demo-store scope tests**

Add imports for `listDemoPortfolioSchedule` and write:

```ts
it("returns one bounded portfolio schedule without unrelated records", () => {
  const result = listDemoPortfolioSchedule({ projectStatus: "active" });
  expect(result.projects.length).toBeGreaterThan(0);
  const projectIds = new Set(result.projects.map((project) => project.id));
  const jobIds = new Set(result.jobs.map((job) => job.id));
  expect(result.jobs.every((job) => projectIds.has(job.projectId!))).toBe(true);
  expect(result.tasks.every((task) => jobIds.has(task.jobId))).toBe(true);
  expect(
    result.dependencies.every((edge) => projectIds.has(edge.projectId)),
  ).toBe(true);
});

it("selects only the latest non-deleted baseline per project", () => {
  captureTwoDemoBaselinesForProject(DEMO_PROJECT_ID);
  const result = listDemoPortfolioSchedule({ projectStatus: "active" });
  expect(
    result.baselines.filter(
      (baseline) => baseline.projectId === DEMO_PROJECT_ID,
    ),
  ).toHaveLength(1);
});
```

Use existing baseline capture helpers and unique names; do not add a test-only
store mutation API.

- [ ] **Step 3: Implement demo adapter parity**

Add:

```ts
export function listDemoPortfolioSchedule(
  filters: PortfolioScheduleStoreFilters = {},
): PortfolioScheduleStoreResult;
```

Apply these exact bounds after filtering:

```ts
const PROJECT_LIMIT = 250;
const JOB_LIMIT = 2_000;
const TASK_LIMIT = 5_000;
const DEPENDENCY_LIMIT = 10_000;
const CALENDAR_EXCEPTION_LIMIT = 5_000;
const BASELINE_ITEM_LIMIT = 5_000;
```

Read one extra row for each bound, return only the limit, and set the matching
truncation flag. Select the most recent non-deleted baseline by `capturedAt`
per selected project. Include only calendars/exceptions used by selected
projects plus the default fallback.

- [ ] **Step 4: Implement the database adapter**

In `src/lib/ops/store.ts`, add:

```ts
export async function listPortfolioSchedule(
  filters: PortfolioScheduleStoreFilters = {},
): Promise<PortfolioScheduleStoreResult>;
```

Database flow:

1. Query matching projects with `.limit(251)`.
2. Return empty arrays immediately when no projects match.
3. Query jobs with `inArray(jobs.projectId, projectIds)` and `.limit(2001)`.
4. Query tasks with `inArray(jobTasks.jobId, renderedJobIds)` and
   `.limit(5001)`.
5. Query dependencies with
   `inArray(jobTaskDependencies.projectId, projectIds)` and `.limit(10001)`.
6. Resolve the default calendar once through `ensureDefaultScheduleCalendar`.
7. Query all selected explicit calendar IDs plus the fallback ID in one read.
8. Query exceptions for those calendar IDs with `.limit(5001)`, render 5,000,
   and set `truncation.calendarExceptions` from the extra-row detection.
9. Use `selectDistinctOn([projectScheduleBaselines.projectId])`, filtering
   `deletedAt IS NULL`, ordered by `projectId` then `capturedAt DESC`.
10. Query baseline items for the selected baseline IDs with `.limit(5001)`.

Run independent dependent-entity queries in one `Promise.all` only after the
selected project IDs are known. Do not call `listJobs`,
`listProjectJobTasks`, `resolveProjectScheduleCalendar`, or
`getProjectScheduleBaseline` in a project loop.

The default-calendar resolver depends on the schema/migration invariant that
at most one row is default. Keep the Drizzle partial unique index
`schedule_calendars_single_default_idx` and migration
`0009_schedule_calendar_default.sql` aligned.

- [ ] **Step 5: Add explicit bound tests**

Extract and export a small pure helper from `demo-store.ts`:

```ts
export function boundedRows<T>(
  rows: readonly T[],
  limit: number,
): { rows: T[]; truncated: boolean };
```

Test:

```ts
expect(boundedRows(["a", "b", "c"], 2)).toEqual({
  rows: ["a", "b"],
  truncated: true,
});
expect(boundedRows(["a"], 2)).toEqual({
  rows: ["a"],
  truncated: false,
});
```

Use the helper for every demo bound.

- [ ] **Step 6: Run store, type, and lint checks**

```bash
npx vitest run src/lib/ops/demo-store.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: PASS.

- [ ] **Step 7: Commit the bounded portfolio read**

```bash
git add \
  src/lib/ops/store.ts \
  src/lib/ops/demo-store.ts \
  src/lib/ops/demo-store.test.ts
```

Commit message:

```text
Add a bounded portfolio Schedule query.
```

---

### Task 4: Serialize and assemble portfolio schedule data

**Files:**
- Modify: `src/lib/ops/portfolio-schedule.ts`
- Modify: `src/lib/ops/portfolio-schedule.test.ts`

- [ ] **Step 1: Add a failing raw-to-serialized assembly test**

Add a `serializePortfolioSchedule` test with two projects using different
calendar IDs and baselines:

```ts
it("assembles jobs, tasks, calendars, dependencies, and baselines by project", () => {
  const result = serializePortfolioSchedule(rawPortfolioFixture());
  expect(result.projects).toHaveLength(2);
  expect(result.projects[0]?.calendar.timeZone).toBe("America/Toronto");
  expect(result.projects[1]?.calendar.timeZone).toBe("America/Vancouver");
  expect(result.projects[0]?.jobs[0]?.tasks).toHaveLength(2);
  expect(result.projects[1]?.latestBaseline?.name).toBe("Recovery");
  expect(JSON.stringify(result)).not.toContain('"createdAt":');
});
```

- [ ] **Step 2: Implement linear assembly**

Add:

```ts
export function serializePortfolioSchedule(
  raw: PortfolioScheduleStoreResult,
): PortfolioScheduleData;
```

Use maps:

- tasks by job ID
- jobs by project ID
- dependencies by project ID
- calendars by calendar ID
- exceptions by calendar ID
- baseline items by baseline ID
- latest baseline by project ID

Serialize every `Date` with `toISOString()`. Use the default calendar for
projects whose `scheduleCalendarId` is null. Preserve `raw.truncation`.

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/lib/ops/portfolio-schedule.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit serialized portfolio assembly**

```bash
git add \
  src/lib/ops/portfolio-schedule.ts \
  src/lib/ops/portfolio-schedule.test.ts
```

Commit message:

```text
Assemble serialized portfolio Schedule data.
```

---

## Phase B — Portfolio Schedule workspace

### Task 5: Build the cross-project resource projection

**Files:**
- Modify: `src/lib/ops/portfolio-schedule.ts`
- Modify: `src/lib/ops/portfolio-schedule.test.ts`
- Create: `src/components/ops/portfolio-resource-schedule.tsx`

- [ ] **Step 1: Add failing cross-calendar overlap tests**

```ts
it("requires a shared working date before flagging a cross-project overlap", () => {
  const lanes = buildPortfolioResourceLanes([
    assignmentForProject("a", "Alex", "2026-09-19", "2026-09-21", {
      weekendDays: [0, 6],
      exceptions: [],
    }),
    assignmentForProject("b", " alex ", "2026-09-19", "2026-09-21", {
      weekendDays: [0, 6],
      exceptions: [{ date: "2026-09-21", isWorkingDay: false }],
    }),
  ]);
  expect(lanes[0]?.potentialOverlapCount).toBe(0);
});

it("flags a shared date that both project calendars treat as working", () => {
  const lanes = buildPortfolioResourceLanes([
    assignmentForProject("a", "Alex", "2026-09-21", "2026-09-22"),
    assignmentForProject("b", "alex", "2026-09-22", "2026-09-23"),
  ]);
  expect(lanes[0]?.potentialOverlapCount).toBe(1);
});
```

- [ ] **Step 2: Implement portfolio assignment contracts**

Add:

```ts
export type PortfolioScheduleAssignment = ScheduleAssignment & {
  projectId: string;
  projectName: string;
  calendar: ResolvedWorkingCalendar;
};

export type PortfolioResourceLane = {
  key: string;
  displayName: string;
  roles: ScheduleAssignmentRole[];
  assignments: Array<
    PortfolioScheduleAssignment & { hasPotentialOverlap: boolean }
  >;
  potentialOverlapCount: number;
};

export function buildPortfolioScheduleAssignments(
  projects: readonly PortfolioScheduleProject[],
): PortfolioScheduleAssignment[];

export function buildPortfolioResourceLanes(
  assignments: readonly PortfolioScheduleAssignment[],
): PortfolioResourceLane[];
```

The sweep algorithm groups by normalized person. Two active ranges overlap
only when at least one intersecting ISO date returns `true` from
`isWorkingDay(date, left.calendar)` and `isWorkingDay(date, right.calendar)`.
Due-only milestones are excluded from overlap counts.

- [ ] **Step 3: Build `PortfolioResourceSchedule`**

Create a client component with props:

```ts
{
  projects: ProjectedPortfolioProject[];
  resourceLanes?: readonly PortfolioResourceLane[];
  window: ScheduleWindow;
  now: string;
  baseline: "latest" | "none";
  baselineItemsTruncated?: boolean;
  showOnlyOverlappingAssignments?: boolean;
}
```

Render:

- Resource name and role badges.
- Source project name.
- Job/task label and source link.
- Current range or milestone.
- Latest-baseline outline when selected.
- **Potential overlap** badge and accessible conflict text.
- Explicit unscheduled assignments.
- A 200-assignment page with Previous/Next controls.
- A button-controlled table for only the current assignment page; mount the
  table DOM only while the toggle is open.
- Table columns for resource, role, project, source item, dates, baseline
  variance, and overlap state.

Do not render hours, percentages, capacity, or “overallocated.”

- [ ] **Step 4: Run tests and checks**

```bash
npx vitest run src/lib/ops/portfolio-schedule.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: PASS.

- [ ] **Step 5: Commit resource projection**

```bash
git add \
  src/lib/ops/portfolio-schedule.ts \
  src/lib/ops/portfolio-schedule.test.ts \
  src/components/ops/portfolio-resource-schedule.tsx
```

Commit message:

```text
Add cross-project Schedule resource lanes.
```

---

### Task 6: Build the Portfolio Schedule Work view and route

**Files:**
- Create: `src/components/ops/portfolio-schedule.tsx`
- Modify: `src/app/app/projects/schedule/page.tsx`
- Modify: `src/app/app/projects/page.tsx`

- [ ] **Step 1: Read the current Next.js client-boundary guide**

Read:

```text
node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md
```

Confirm all props passed from `page.tsx` contain only strings, numbers,
booleans, arrays, and plain objects.

- [ ] **Step 2: Build the client component contract**

Create:

```tsx
"use client";

export function PortfolioSchedule({
  data,
  query,
  now,
}: {
  data: PortfolioScheduleData;
  query: PortfolioScheduleQuery;
  now: string;
}) {
  // Render the behavior below.
}
```

Use `useRouter` and `usePathname` to update canonical URL parameters through
`portfolioScheduleHref`. Do not fetch data from the client.

Build projected projects with `buildPortfolioProjects`. Build resource lanes
once, derive `overlapProjectIds` from overlapping assignments, then call
`filterPortfolioProjects` with `state`, `attention`, `from`, `to`,
`hideCompleted`, and that ID set. All chart and table rows use this one
filtered collection.

- [ ] **Step 3: Implement controls and empty/truncated states**

Render:

- Search form.
- Project status select.
- Project manager select derived from visible projects.
- Schedule state select.
- Attention select.
- Work/Resources buttons with `aria-pressed`.
- Week/Month buttons with `aria-pressed`.
- Previous, Today, Next.
- Latest baseline/None.
- Hide completed.

For each `data.truncation` flag, render an Alert naming the partial entity and
state that aggregate totals are partial. When no rows match, show
**No portfolio schedule rows match these filters** and a Reset filters link.

Above the chart, show:

```text
{visibleProjects} projects · {visibleJobs} jobs · {visibleTasks} tasks
```

When task rows are truncated, append **Partial task count**. This visible
summary is the count target for dashboard drill-through acceptance.
For overdue-task and unscheduled-active-work attention modes, append
**(partial)** to the local matching total when projects, jobs, or tasks are
truncated. Truncated baseline items make behind-baseline filtering unavailable
and row variance **Unavailable—partial data**. Truncated tasks or dependencies
make critical-path facts **Critical path unavailable—partial data** rather
than definitive non-critical labels. Calendar-exception truncation propagates
partial summary semantics to working-day baseline and resource calculations.

- [ ] **Step 4: Implement project/job/task hierarchy**

Use a contained horizontal scroller with:

```text
min-width: 72rem
label pane: minmax(18rem, 24rem)
timeline pane: minmax(48rem, 1fr)
```

Project rows:

- Link to `/app/projects/{id}`.
- `aria-expanded` project toggle.
- State badge, project manager, global task progress.
- Earliest start/latest finish.
- Warning counts.
- Latest baseline name, capture date, and finish variance.
- **Open project Schedule** action.

Expanded project rows render jobs. Expanded job rows render tasks. Reuse
existing pure geometry/state functions and source links. Call
`calculateCriticalPath` separately for each project. Render six grouped week
headers or six month headers.

- [ ] **Step 5: Add the equivalent table**

The Work table columns are:

```text
Type
Project
Job / task
Status
Manager / assignee
Planned start
Planned completion
Due date
Progress
Critical path
Latest baseline
Variance
Warning
```

The table uses the same filtered project/job/task collection as the chart.
Flattened Work rows paginate at 200 rows. A page may prepend at most two
labelled project/job context rows. The current-page table mounts only while
its toggle is open and uses the exact same page rows as the chart.

- [ ] **Step 6: Wire Resources view**

When `query.view === "resources"`, render
`PortfolioResourceSchedule` with the same window, projects, `now`, and baseline
mode. Switching views updates `view` in the URL without resetting other
filters.

- [ ] **Step 7: Create the authorized server page**

Create `src/app/app/projects/schedule/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ops/page-header";
import { PortfolioSchedule } from "@/components/ops/portfolio-schedule";
import { getOpsSession } from "@/lib/ops/auth";
import { serializePortfolioSchedule } from "@/lib/ops/portfolio-schedule";
import { parsePortfolioScheduleQuery } from "@/lib/ops/portfolio-schedule-query";
import { listPortfolioSchedule } from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export default async function PortfolioSchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await getOpsSession())) redirect("/app/login");
  const query = parsePortfolioScheduleQuery(await searchParams);
  const raw = await listPortfolioSchedule({
    q: query.q,
    projectStatus: query.projectStatus,
    projectManager: query.projectManager,
  });
  const data = serializePortfolioSchedule(raw);
  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/projects", label: "Projects" },
          { label: "Portfolio Schedule" },
        ]}
        title="Portfolio Schedule"
        description="Active projects, schedule risks, baselines, and assignment overlap."
      />
      <PortfolioSchedule
        data={data}
        query={query}
        now={new Date().toISOString()}
      />
    </div>
  );
}
```

- [ ] **Step 8: Add the Projects entry action**

In `src/app/app/projects/page.tsx`, add a PageHeader action:

```tsx
<Button
  variant="outline"
  className="min-h-11"
  nativeButton={false}
  render={<Link href="/app/projects/schedule" />}
>
  <CalendarRangeIcon aria-hidden="true" />
  Portfolio Schedule
</Button>
```

Keep the project count text beside the button.

- [ ] **Step 9: Run component checks**

```bash
npx vitest run \
  src/lib/ops/portfolio-schedule.test.ts \
  src/lib/ops/portfolio-schedule-query.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: PASS.

- [ ] **Step 10: Commit the workspace**

```bash
git add \
  src/components/ops/portfolio-schedule.tsx \
  src/app/app/projects/schedule/page.tsx \
  src/app/app/projects/page.tsx
```

Commit message:

```text
Build the all-project Portfolio Schedule.
```

---

## Phase C — Dashboard widgets and acceptance

### Task 7: Add portfolio schedule summaries and widget links

**Files:**
- Modify: `src/lib/ops/portfolio-schedule.ts`
- Modify: `src/lib/ops/portfolio-schedule.test.ts`
- Modify: `src/app/app/page.tsx`

- [ ] **Step 1: Add failing dashboard summary tests**

Add:

```ts
describe("portfolio Schedule dashboard summary", () => {
  it("counts schedule attention from projected active projects", () => {
    const summary = buildPortfolioScheduleSummary(
      dashboardPortfolioFixture(),
      new Date("2026-09-19T12:00:00.000Z"),
    );
    expect(summary).toMatchObject({
      overdueTasks: 2,
      unscheduledActiveWork: 3,
      projectsBehindBaseline: 1,
      peopleWithPotentialOverlap: 1,
    });
  });

  it("orders and limits upcoming events to the next 14 days", () => {
    const summary = buildPortfolioScheduleSummary(
      upcomingPortfolioFixture(),
      new Date("2026-09-19T12:00:00.000Z"),
    );
    expect(summary.upcomingEvents).toHaveLength(5);
    expect(summary.upcomingEvents.map((event) => event.date)).toEqual([
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
    ]);
  });

  it("marks aggregate counts partial when their source rows are truncated", () => {
    const summary = buildPortfolioScheduleSummary(
      truncatedPortfolioFixture({ tasks: true }),
      new Date("2026-09-19T12:00:00.000Z"),
    );
    expect(summary.partialCounts).toContain("overdueTasks");
    expect(summary.partialCounts).toContain("unscheduledActiveWork");
  });
});
```

- [ ] **Step 2: Implement summary contracts**

Add:

```ts
export type PortfolioScheduleEvent = {
  id: string;
  projectId: string;
  projectName: string;
  entityType: "project" | "job" | "task";
  label: string;
  kind: "start" | "finish" | "due";
  date: string;
  href: string;
};

export type PortfolioScheduleSummary = {
  overdueTasks: number;
  unscheduledActiveWork: number;
  projectsBehindBaseline: number;
  peopleWithPotentialOverlap: number;
  upcomingEvents: PortfolioScheduleEvent[];
  partialCounts: string[];
};

export function buildPortfolioScheduleSummary(
  data: PortfolioScheduleData,
  now?: Date,
): PortfolioScheduleSummary;
```

Rules:

- Count only open overdue tasks for `overdueTasks`.
- Count undated non-complete jobs plus undated open tasks for
  `unscheduledActiveWork`.
- Count positive project baseline finish variance.
- Count resource lanes with `potentialOverlapCount > 0`, not overlap pairs.
- Include events from today through day 14 inclusive.
- Sort by date, then project name, then label; return five.
- Set partial flags from `data.truncation`.

- [ ] **Step 3: Test count-to-link parity**

Add:

```ts
it("uses portfolio filters that reproduce each widget count", () => {
  expect(PORTFOLIO_SCHEDULE_WIDGETS.overdueTasks.href).toBe(
    "/app/projects/schedule?projectStatus=active&attention=overdue-tasks",
  );
  expect(PORTFOLIO_SCHEDULE_WIDGETS.unscheduledActiveWork.href).toBe(
    "/app/projects/schedule?projectStatus=active&attention=unscheduled-active-work",
  );
  expect(PORTFOLIO_SCHEDULE_WIDGETS.projectsBehindBaseline.href).toBe(
    "/app/projects/schedule?projectStatus=active&attention=behind-baseline",
  );
  expect(PORTFOLIO_SCHEDULE_WIDGETS.peopleWithPotentialOverlap.href).toBe(
    "/app/projects/schedule?projectStatus=active&attention=resource-overlap&view=resources",
  );
});
```

Export `PORTFOLIO_SCHEDULE_WIDGETS` from the query module and build every href
with `portfolioScheduleHref`.

- [ ] **Step 4: Add one portfolio read on Home**

In `src/app/app/page.tsx`, keep the existing project/job reads for existing
widgets and add one portfolio read to the page's `Promise.all`:

```ts
const portfolioRaw = await listPortfolioSchedule({
  projectStatus: "active",
});
const portfolioData = serializePortfolioSchedule(portfolioRaw);
const portfolioSummary = buildPortfolioScheduleSummary(
  portfolioData,
  new Date(),
);
```

Do not change the inputs to `buildHomeSummary`; its existing cards retain their
current all-record semantics. Only the new Schedule attention widgets use the
active-project portfolio projection.

- [ ] **Step 5: Render Schedule attention cards**

Add a section below Needs attention:

```tsx
<section aria-labelledby="schedule-attention-title" className="space-y-3">
  <div>
    <h2 id="schedule-attention-title" className="font-heading text-lg font-semibold">
      Schedule attention
    </h2>
    <p className="text-sm text-muted-foreground">
      Exceptions across active projects.
    </p>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {/* Four StatCard instances using canonical widget hrefs. */}
  </div>
</section>
```

Labels:

- Overdue tasks
- Unscheduled active work
- Projects behind baseline
- Potential resource overlaps

If a count is partial, append **Partial result — portfolio limit reached** to
the hint and keep the link functional.

- [ ] **Step 6: Render Upcoming schedule events**

Add a Card beside or below Next up:

- Title: **Upcoming schedule events**
- Description: **Starts, finishes, and due dates in the next 14 days.**
- Five chronological rows.
- Date, event-kind text, project name, source label, and source link.
- Empty text: **No scheduled starts, finishes, or due dates in the next 14
  days.**
- Footer action: **Open Portfolio Schedule**.

- [ ] **Step 7: Run summary and Home checks**

```bash
npx vitest run \
  src/lib/ops/portfolio-schedule.test.ts \
  src/lib/ops/portfolio-schedule-query.test.ts \
  src/lib/ops/home.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: PASS.

- [ ] **Step 8: Commit dashboard integration**

```bash
git add \
  src/lib/ops/portfolio-schedule.ts \
  src/lib/ops/portfolio-schedule.test.ts \
  src/lib/ops/portfolio-schedule-query.ts \
  src/lib/ops/portfolio-schedule-query.test.ts \
  src/app/app/page.tsx
```

Commit message:

```text
Add portfolio Schedule dashboard attention.
```

---

### Task 8: Complete full verification and SCH-022–SCH-031 traceability

**Files:**
- Modify only if implementation behavior changed:
  `docs/superpowers/specs/2026-09-19-portfolio-schedule-dashboard-design.md`
- Modify only if product requirements changed:
  `docs/strongfoam-crm-erp-prd.md`

- [ ] **Step 1: Run the complete automated matrix**

```bash
npm test
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run build
```

Expected:

- 0 failed tests.
- 0 lint warnings.
- 0 TypeScript errors.
- Successful Next.js production build.

- [ ] **Step 2: Seed browser acceptance data in demo fixtures**

Ensure demo data includes:

- Three active projects and one closed project.
- One project with no jobs.
- One undated job and one undated task.
- One blocked job.
- Two overdue open tasks.
- Two different project calendars.
- One dependency chain and one parallel non-critical task in each of two
  projects.
- Two latest baselines, one positive and one negative variance.
- One project with no baseline.
- A normalized assignee shared across projects with one true working-day
  overlap and one weekend-only intersection.
- At least six upcoming events so the five-item limit is visible.

Use fixed relative dates derived from one `now` constant so tests and browser
checks remain deterministic.

- [ ] **Step 3: Browser-verify the full portfolio workspace**

Desktop checks:

1. Active projects appear by default; closed project does not.
2. Include closed status and see the closed project.
3. Search and manager filters preserve shareable URL state.
4. Project and job expand/collapse expose `aria-expanded`.
5. Week/Month and Previous/Today/Next update the URL and window.
6. Work rows link to projects, jobs, and tasks.
7. Per-project critical labels do not leak across projects.
8. Latest baseline labels show independent names and dates.
9. Truncation Alerts are absent for normal demo data.
10. Work table matches filtered chart rows.

Resources checks:

1. Normalized person appears once across projects.
2. True overlap says **Potential overlap**.
3. Weekend-only intersection is not flagged.
4. No hours, utilization, capacity, or “overallocated” text appears.
5. Resource table agrees with lane warnings.

- [ ] **Step 4: Verify dashboard drill-through**

For each schedule widget:

1. Record the visible count.
2. Open the widget.
3. Confirm the Portfolio Schedule URL has the documented filters.
4. Confirm the matching filtered records reproduce the widget count.

Open each upcoming event and confirm it reaches the named project/job/task
record.

- [ ] **Step 5: Verify mobile and keyboard behavior**

At 375px:

- Document width equals viewport width.
- The Schedule chart has one contained horizontal scroller.
- Labels remain readable.
- Text is at least 12px.
- Buttons and summaries are at least 44px high.
- Dashboard widgets stack without horizontal page overflow.

Keyboard-only:

- Tab reaches every filter, view switch, navigation control, expansion toggle,
  table summary, and source link.
- Focus is visible.
- Expansion state is announced.
- No required fact or action depends on hover.

- [ ] **Step 6: Capture evidence**

Capture:

- Desktop Portfolio Schedule Work screenshot.
- Desktop Resources screenshot with **Potential overlap**.
- 375px Portfolio Schedule screenshot.
- Home Schedule attention screenshot.
- Short recording covering filters, hierarchy, Work/Resources, widget
  drill-through, and accessible tables.

Keep artifacts outside the repository and attach them to the pull request.

- [ ] **Step 7: Self-review requirement coverage**

Map:

| Requirement | Required evidence |
|---|---|
| SCH-022 | Active project hierarchy browser check |
| SCH-023 | URL parser tests and control browser check |
| SCH-024 | Project roll-up unit tests and row/table check |
| SCH-025 | Per-project graph/calendar/baseline tests |
| SCH-026 | Read-only UI and project drill-through |
| SCH-027 | Cross-calendar resource tests and Resources browser check |
| SCH-028 | Latest baseline store/domain tests |
| SCH-029 | Store bounds/scoping tests and truncation Alerts |
| SCH-030 | Summary tests and Home widgets |
| SCH-031 | Count-to-link tests, table parity, keyboard, and 375px checks |

If implementation differs materially, update the PRD decision/change log and
the design specification before committing. Do not silently change behavior
only in code.

- [ ] **Step 8: Commit any acceptance corrections**

Stage only changed source, tests, and documentation. Use:

```text
Finalize portfolio Schedule acceptance coverage.
```

- [ ] **Step 9: Push and update the pull request**

Push the implementation branch and include:

- SCH-022 through SCH-031 mapping.
- Bounded query limits.
- Full verification commands and results.
- Desktop/mobile screenshots and recording.
- Any partial-result limitations discovered during acceptance.

## Definition of done

- `/app/projects/schedule` defaults to active projects.
- Project → Job → Task hierarchy includes undated and empty projects.
- URL state is canonical and shareable.
- Project progress/ranges/warnings are truthful.
- Critical path, calendar, and baseline calculations stay project-specific.
- Latest baseline selection is explicit per project.
- Portfolio view has no mutation commands.
- Cross-project resource overlap uses both project calendars.
- Dashboard counts and links use the same portfolio projection.
- Upcoming events are chronological, bounded, and linked.
- Store query count is independent of project count.
- Every bound produces an explicit partial-result warning.
- Work and Resources tables match their charts.
- Unit, store, lint, typecheck, build, desktop, mobile, keyboard, and browser
  console checks pass.
