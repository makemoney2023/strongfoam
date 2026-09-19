# Project Schedule Roll-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-level Schedule that rolls up every job and job task into an accessible Gantt-style view with task duration, finish-to-start dependencies, critical path, controlled rescheduling, immutable baselines, assignment overlays, and working-day calendars.

**Architecture:** Keep geometry, graph, calendar, variance, and overlap algorithms in pure domain modules; fetch jobs/tasks/dependencies/baselines/calendar with bounded project-scoped reads; and pass serialized data into focused client components. Phase A renders existing dates. Phase B adds task planned dates and `completedAt`. Phase C adds dependency planning and controlled rescheduling. Phase D adds transactional immutable baselines, assignment projections, and one resolved working calendar used by every calculation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM/PostgreSQL, Vitest, Tailwind 4, existing shadcn/ui components, Lucide icons.

---

## Source requirements

- PRD: `docs/strongfoam-crm-erp-prd.md`, SCH-001 through SCH-021.
- Design: `docs/superpowers/specs/2026-09-19-project-schedule-gantt-design.md`.
- Next.js guidance: read
  `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
  before implementing the client boundary.

## Global constraints

- Use the visible product label **Schedule**.
- Phase A is read-only and must not invent task duration.
- Phase C must include dependencies, critical path, and rescheduling; these are
  not optional follow-ups.
- Phase D must include baseline variance, assignment/resource overlays, and
  working-day exceptions; there is no deferred schedule-feature bucket.
- Do not add a Gantt/chart dependency; use bounded CSS Grid rendering.
- Do not issue one task query per job.
- Completed rows remain in progress totals when filtered or collapsed.
- Dates are shown in organization-local calendar days.
- Keep the existing Jobs card and task edit dialogs.
- Use existing semantic tokens and shadcn components.
- Use Lucide icons, not emoji.
- Use test-first steps and one commit per task.
- Do not stage `.playwright-mcp/` or root screenshot files.

## Commit convention

Every commit in this repository must use:

```bash
GIT_AUTHOR_NAME="makemoney2023" \
GIT_AUTHOR_EMAIL="124006256+makemoney2023@users.noreply.github.com" \
GIT_COMMITTER_NAME="makemoney2023" \
GIT_COMMITTER_EMAIL="124006256+makemoney2023@users.noreply.github.com" \
git commit -m "Commit message"

git log -1 --format='%an <%ae>'
```

The author check must print:

```text
makemoney2023 <124006256+makemoney2023@users.noreply.github.com>
```

## File structure

| Path | Responsibility |
|---|---|
| `src/lib/ops/project-schedule.ts` | Pure progress, state, window, filtering, and geometry rules |
| `src/lib/ops/project-schedule.test.ts` | Schedule domain tests |
| `src/lib/ops/project-schedule-graph.ts` | DAG validation, topological order, and critical-path calculation |
| `src/lib/ops/project-schedule-graph.test.ts` | Dependency and critical-path tests |
| `src/lib/ops/project-schedule-planning.ts` | Working-day arithmetic, baseline variance, and assignment overlap |
| `src/lib/ops/project-schedule-planning.test.ts` | Calendar, baseline, and resource tests |
| `src/components/ops/project-schedule.tsx` | Interactive chart, controls, and accessible table |
| `src/components/ops/task-dependency-editor.tsx` | Add/remove finish-to-start dependencies and lag |
| `src/components/ops/schedule-reschedule-dialog.tsx` | Shared drag/keyboard before-after confirmation |
| `src/components/ops/schedule-baseline-controls.tsx` | Capture/select/remove immutable baselines |
| `src/components/ops/schedule-calendar-dialog.tsx` | Configure working days and dated exceptions |
| `src/components/ops/project-resource-schedule.tsx` | Assignment lanes and potential-overlap warnings |
| `src/lib/ops/store.ts` | Bounded project task query and database task date persistence |
| `src/lib/ops/demo-store.ts` | Demo parity for project task reads and task date persistence |
| `src/lib/ops/demo-store.test.ts` | Demo project schedule/store behavior |
| `src/app/app/projects/[id]/page.tsx` | Project Schedule card integration |
| `src/app/app/jobs/[id]/page.tsx` | Stable task anchors |
| `src/db/schema.ts` | Phase B task schedule columns and constraint |
| `drizzle/0006_job_task_schedule.sql` | Additive task schedule migration |
| `drizzle/0007_job_task_dependencies.sql` | Dependency edge migration |
| `drizzle/0008_schedule_planning.sql` | Calendar and baseline migration |
| `drizzle/meta/_journal.json` | Migration journal entry |
| `src/lib/ops/job-workspace.ts` | Job task input propagation |
| `src/app/app/jobs/workspace-fields.tsx` | Planned task date fields |
| `src/app/app/jobs/actions.ts` | Planned task date form input |
| `src/app/app/projects/actions.ts` | Dependency and reschedule server actions |

---

## Phase A — Read-only project schedule

### Task 1: Build the pure schedule domain

**Files:**
- Create: `src/lib/ops/project-schedule.ts`
- Create: `src/lib/ops/project-schedule.test.ts`

- [ ] **Step 1: Write failing tests for progress and schedule state**

Create `src/lib/ops/project-schedule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createScheduleWindow,
  getJobScheduleState,
  getTaskScheduleState,
  getTaskProgress,
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
    expect(createScheduleWindow("week", today).columns).toHaveLength(42);
    expect(createScheduleWindow("month", today).columns).toHaveLength(6);
  });

  it("warns when a task falls outside its job", () => {
    expect(
      isTaskOutsideJobRange(
        {
          plannedStartAt: "2026-09-01T12:00:00.000Z",
          plannedEndAt: "2026-09-30T12:00:00.000Z",
        },
        {
          plannedStartAt: "2026-08-31T12:00:00.000Z",
          plannedEndAt: "2026-09-05T12:00:00.000Z",
        },
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
npx vitest run src/lib/ops/project-schedule.test.ts
```

Expected: FAIL because `@/lib/ops/project-schedule` does not exist.

- [ ] **Step 3: Implement the schedule types and pure rules**

Create `src/lib/ops/project-schedule.ts` with these exported contracts:

```ts
import type { JobStatus } from "@/lib/ops/jobs";

export const SCHEDULE_ZOOMS = ["week", "month"] as const;
export type ScheduleZoom = (typeof SCHEDULE_ZOOMS)[number];

export const SCHEDULE_FILTERS = [
  "all",
  "remaining",
  "complete",
  "blocked",
  "overdue",
  "unscheduled",
] as const;
export type ScheduleFilter = (typeof SCHEDULE_FILTERS)[number];

export type ScheduleState =
  | "remaining"
  | "complete"
  | "blocked"
  | "overdue"
  | "unscheduled";

export type ProjectScheduleTask = {
  id: string;
  jobId: string;
  title: string;
  assignee: string | null;
  status: "open" | "done";
  dueAt: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  completedAt: string | null;
};

export type ProjectScheduleJob = {
  id: string;
  number: string;
  name: string;
  status: JobStatus;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  tasks: ProjectScheduleTask[];
};

export type TaskProgress = {
  completed: number;
  total: number;
  percent: number | null;
};

export type ScheduleColumn = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

export type ScheduleWindow = {
  start: Date;
  end: Date;
  columns: ScheduleColumn[];
};
```

Implement the following behavior:

```ts
function startOfLocalDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : startOfLocalDay(parsed);
}

export function getTaskProgress(
  tasks: Array<{ status: string }>,
): TaskProgress {
  const completed = tasks.filter((task) => task.status === "done").length;
  return {
    completed,
    total: tasks.length,
    percent:
      tasks.length === 0 ? null : Math.round((completed / tasks.length) * 100),
  };
}

export function getTaskScheduleState(
  task: {
    status: string;
    dueAt?: string | null;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
  },
  now = new Date(),
): ScheduleState {
  if (task.status === "done") return "complete";
  const finish = parseDay(task.plannedEndAt ?? task.dueAt);
  if (finish && finish < startOfLocalDay(now)) return "overdue";
  if (!task.plannedStartAt && !task.plannedEndAt && !task.dueAt) {
    return "unscheduled";
  }
  return "remaining";
}

export function getJobScheduleState(
  job: {
    status: string;
    plannedStartAt: string | null;
    plannedEndAt: string | null;
  },
  now = new Date(),
): ScheduleState {
  if (job.status === "complete" || job.status === "closed") return "complete";
  if (job.status === "blocked") return "blocked";
  const end = parseDay(job.plannedEndAt);
  if (end && end < startOfLocalDay(now)) return "overdue";
  if (!job.plannedStartAt && !job.plannedEndAt) return "unscheduled";
  return "remaining";
}

export function isTaskOutsideJobRange(
  task: { plannedStartAt: string | null; plannedEndAt: string | null },
  job: { plannedStartAt: string | null; plannedEndAt: string | null },
): boolean {
  const taskStart = parseDay(task.plannedStartAt);
  const taskEnd = parseDay(task.plannedEndAt);
  const jobStart = parseDay(job.plannedStartAt);
  const jobEnd = parseDay(job.plannedEndAt);
  return Boolean(
    (taskStart && jobStart && taskStart < jobStart) ||
      (taskEnd && jobEnd && taskEnd > jobEnd),
  );
}
```

`createScheduleWindow("week", anchor)` must return 42 one-day columns starting
on the Monday immediately before the anchor's week. `month` must return six
calendar-month columns beginning with the first day of the month before the
anchor. Add:

```ts
export function matchesScheduleFilter(
  state: ScheduleState,
  filter: ScheduleFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "remaining") return state !== "complete";
  return state === filter;
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run:

```bash
npx vitest run src/lib/ops/project-schedule.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the schedule domain**

```bash
git add src/lib/ops/project-schedule.ts src/lib/ops/project-schedule.test.ts
```

Commit message:

```text
Add project schedule date and progress rules.
```

---

### Task 2: Add one bounded project-task read

**Files:**
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/demo-store.test.ts`

- [ ] **Step 1: Write the failing demo-store test**

Add to `src/lib/ops/demo-store.test.ts`:

```ts
it("lists all tasks for one project without leaking other projects", () => {
  const result = listDemoProjectJobTasks(DEMO_PROJECT_ID);
  expect(result.tasks.length).toBeGreaterThan(0);
  expect(result.tasks.every((task) => task.jobId === DEMO_JOB_ID)).toBe(true);
  expect(
    listDemoProjectJobTasks("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
  ).toEqual({ tasks: [], truncated: false });
});
```

Import `DEMO_JOB_ID` and `DEMO_PROJECT_ID` from demo data and
`listDemoProjectJobTasks` from demo store.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npx vitest run src/lib/ops/demo-store.test.ts
```

Expected: FAIL because `listDemoProjectJobTasks` is not exported.

- [ ] **Step 3: Implement demo and database reads**

In `src/lib/ops/demo-store.ts`, add:

```ts
export function listDemoProjectJobTasks(projectId: string): {
  tasks: JobTaskRow[];
  truncated: boolean;
} {
  const jobIds = new Set(
    jobsList.filter((job) => job.projectId === projectId).map((job) => job.id),
  );
  const rows = jobTasks
    .filter((task) => jobIds.has(task.jobId))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, 1_001);
  return { tasks: rows.slice(0, 1_000), truncated: rows.length > 1_000 };
}
```

In `src/lib/ops/store.ts`:

1. Import `asc` from `drizzle-orm`.
2. Import/export `listDemoProjectJobTasks`.
3. Add:

```ts
export async function listProjectJobTasks(
  projectId: string,
): Promise<{ tasks: JobTaskRow[]; truncated: boolean }> {
  if (isDemoOpsStore()) return listDemoProjectJobTasks(projectId);
  const db = getDb();
  const rows = await db
    .select({ task: jobTasks })
    .from(jobTasks)
    .innerJoin(jobs, eq(jobTasks.jobId, jobs.id))
    .where(eq(jobs.projectId, projectId))
    .orderBy(asc(jobTasks.createdAt))
    .limit(1_001);
  return {
    tasks: rows.slice(0, 1_000).map(({ task }) => task),
    truncated: rows.length > 1_000,
  };
}
```

The project page continues using `listJobs({ projectId })`, which is already
project-scoped. Do not call `listJobTasks` in a loop.

- [ ] **Step 4: Run the store tests**

Run:

```bash
npx vitest run src/lib/ops/demo-store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the bounded read**

```bash
git add src/lib/ops/store.ts src/lib/ops/demo-store.ts src/lib/ops/demo-store.test.ts
```

Commit message:

```text
Add a bounded project task roll-up query.
```

---

### Task 3: Build the read-only Schedule component

**Files:**
- Create: `src/components/ops/project-schedule.tsx`
- Modify: `src/lib/ops/project-schedule.ts`
- Modify: `src/lib/ops/project-schedule.test.ts`

- [ ] **Step 1: Add failing projection/filter tests**

Add tests proving:

```ts
it("keeps the parent job when only a child task matches", () => {
  const visible = filterScheduleJobs(
    [
      {
        id: "job-1",
        number: "JOB-1",
        name: "Podium",
        status: "in_progress",
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
```

Also test `positionInWindow(date, window)` clamps to `0..100` and returns null
outside the visible window.

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
npx vitest run src/lib/ops/project-schedule.test.ts
```

Expected: FAIL because projection/filter helpers do not exist.

- [ ] **Step 3: Implement projection helpers**

Add to `src/lib/ops/project-schedule.ts`:

```ts
export function filterScheduleJobs(
  jobs: ProjectScheduleJob[],
  filter: ScheduleFilter,
  now = new Date(),
): ProjectScheduleJob[] {
  if (filter === "all") return jobs;
  return jobs.flatMap((job) => {
    const jobMatches = matchesScheduleFilter(
      getJobScheduleState(job, now),
      filter,
    );
    const tasks = job.tasks.filter((task) =>
      matchesScheduleFilter(getTaskScheduleState(task, now), filter),
    );
    return jobMatches || tasks.length ? [{ ...job, tasks }] : [];
  });
}

export function positionInWindow(
  value: string | Date | null,
  window: ScheduleWindow,
): number | null {
  if (!value) return null;
  const date = startOfLocalDay(
    value instanceof Date ? value : new Date(value),
  );
  if (Number.isNaN(date.getTime()) || date < window.start || date > window.end) {
    return null;
  }
  const span = window.end.getTime() - window.start.getTime();
  return ((date.getTime() - window.start.getTime()) / span) * 100;
}
```

Export a `moveScheduleAnchor(anchor, zoom, direction)` helper where direction is
`-1 | 1`; week moves 42 days and month moves six months.

- [ ] **Step 4: Implement `ProjectSchedule`**

Create `src/components/ops/project-schedule.tsx` as a client component with:

```ts
"use client";

export function ProjectSchedule({
  jobs,
  now,
  truncated = false,
}: {
  jobs: ProjectScheduleJob[];
  now: string;
  truncated?: boolean;
}) {
  const [zoom, setZoom] = useState<ScheduleZoom>("week");
  const [filter, setFilter] = useState<ScheduleFilter>("all");
  const [anchor, setAnchor] = useState(() => new Date(now));
  const [expanded, setExpanded] = useState(
    () => new Set(jobs.length <= 10 ? jobs.map((job) => job.id) : []),
  );

  const window = createScheduleWindow(zoom, anchor);
  const visibleJobs = filterScheduleJobs(jobs, filter, new Date(now));
  const projectProgress = getTaskProgress(jobs.flatMap((job) => job.tasks));

  // Render toolbar, summary, bounded chart grid, unscheduled rows, and table.
}
```

Required render details:

- Summary text:
  - `No tasks` when `projectProgress.percent === null`.
  - Otherwise `{completed} / {total} tasks complete`.
- Toolbar:
  - Native select for filter.
  - Two buttons for Week/Month with `aria-pressed`.
  - Previous, Today, and Next buttons with accessible names.
- Chart:
  - One label column and one bounded timeline pane.
  - Job expand button uses `aria-expanded`.
  - Only render task rows for expanded jobs.
  - Bars/milestones are links.
  - Use text/icon status in the label pane.
  - Render unscheduled rows in a labelled group below dated rows.
- Accessible alternative:
  - `<details>` with summary `View schedule as table`.
  - Existing shadcn Table components.
  - Columns defined by the design specification.
- Empty filtered state:
  - Message plus button that sets `filter` to `all`.
- Truncated state:
  - Destructive or warning Alert with the bounded-result message from Task 4.

Use `style={{ left: `${percent}%` }}` only for computed geometry. Use semantic
Tailwind classes for colors. Keep each row at least `min-h-11`.

- [ ] **Step 5: Run focused tests, lint, and typecheck**

Run:

```bash
npx vitest run src/lib/ops/project-schedule.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: all pass.

- [ ] **Step 6: Commit the Schedule component**

```bash
git add \
  src/lib/ops/project-schedule.ts \
  src/lib/ops/project-schedule.test.ts \
  src/components/ops/project-schedule.tsx
```

Commit message:

```text
Build the read-only project Schedule component.
```

---

### Task 4: Integrate Schedule on the project page

**Files:**
- Modify: `src/app/app/projects/[id]/page.tsx`
- Modify: `src/app/app/jobs/[id]/page.tsx`

- [ ] **Step 1: Add stable task anchors**

In `src/app/app/jobs/[id]/page.tsx`, change each task list item:

```tsx
<li
  id={`task-${task.id}`}
  key={task.id}
  className="scroll-mt-24 flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
>
```

- [ ] **Step 2: Fetch and serialize project tasks**

In `src/app/app/projects/[id]/page.tsx`:

1. Import `ProjectSchedule`.
2. Import `listProjectJobTasks`.
3. Include `projectTaskResult` in the existing `Promise.all`, then set
   `projectTasks = projectTaskResult.tasks`.
4. Build serializable props:

```ts
const scheduleJobs = jobs.map((job) => ({
  id: job.id,
  number: formatJobNumber(job.id),
  name: job.name,
  status: job.status as JobStatus,
  plannedStartAt: job.plannedStartAt?.toISOString() ?? null,
  plannedEndAt: job.plannedEndAt?.toISOString() ?? null,
  tasks: projectTasks
    .filter((task) => task.jobId === job.id)
    .map((task) => ({
      id: task.id,
      jobId: task.jobId,
      title: task.title,
      assignee: task.assignee,
      status: task.status === "done" ? "done" : "open",
      dueAt: task.dueAt?.toISOString() ?? null,
      plannedStartAt: null,
      plannedEndAt: null,
      completedAt: null,
    })),
}));
```

Replace the repeated `filter` in the illustrative mapping with this linear
grouping before constructing `scheduleJobs`:

```ts
const tasksByJob = new Map<string, typeof projectTasks>();
for (const task of projectTasks) {
  const bucket = tasksByJob.get(task.jobId) ?? [];
  bucket.push(task);
  tasksByJob.set(task.jobId, bucket);
}
```

Then map `(tasksByJob.get(job.id) ?? [])` into each job's serialized `tasks`.

Pass `projectTaskResult.truncated` into `ProjectSchedule` and render an Alert:

```text
Only the first 1,000 tasks are shown. Narrow this project or review jobs
individually for the remaining tasks.
```

- [ ] **Step 3: Add the Schedule card**

Insert between Project details and Jobs:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Schedule</CardTitle>
    <CardDescription>
      Jobs, task progress, due dates, blockers, and unscheduled work.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <ProjectSchedule
      jobs={scheduleJobs}
      now={new Date().toISOString()}
      truncated={projectTaskResult.truncated}
    />
  </CardContent>
</Card>
```

If there are no jobs, render the existing add-job action in an EmptyState
instead of mounting an empty chart.

- [ ] **Step 4: Verify Phase A**

Run:

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
npm test
npm run build
```

Expected: all pass.

Browser checks:

1. Open the demo project.
2. Confirm its job appears even if one side of the range is missing.
3. Expand the job and see every task.
4. Switch Week/Month.
5. Exercise all filters.
6. Use Previous, Today, and Next.
7. Open the job and task links.
8. Open the accessible table.
9. Repeat at 375px and keyboard-only.

- [ ] **Step 5: Commit Phase A integration**

```bash
git add \
  src/app/app/projects/[id]/page.tsx \
  src/app/app/jobs/[id]/page.tsx
```

Commit message:

```text
Add the project job and task Schedule roll-up.
```

---

## Phase B — Task dates and actual completion

### Task 5: Add task schedule columns

**Files:**
- Create: `drizzle/0006_job_task_schedule.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `src/db/schema.ts`
- Modify: `src/db/schema.test.ts`

- [ ] **Step 1: Add failing schema expectations**

In `src/db/schema.test.ts`, assert:

```ts
expect(jobTasks.plannedStartAt).toBeDefined();
expect(jobTasks.plannedEndAt).toBeDefined();
expect(jobTasks.completedAt).toBeDefined();
```

- [ ] **Step 2: Run the schema test and verify it fails**

Run:

```bash
npx vitest run src/db/schema.test.ts
```

Expected: FAIL because the columns are undefined.

- [ ] **Step 3: Update Drizzle schema**

Add to `jobTasks` in `src/db/schema.ts`:

```ts
plannedStartAt: timestamp("planned_start_at", { withTimezone: true }),
plannedEndAt: timestamp("planned_end_at", { withTimezone: true }),
completedAt: timestamp("completed_at", { withTimezone: true }),
```

Add the SQL check through the table extras:

```ts
check(
  "job_tasks_planned_date_order",
  sql`${table.plannedStartAt} IS NULL
    OR ${table.plannedEndAt} IS NULL
    OR ${table.plannedEndAt} >= ${table.plannedStartAt}`,
),
index("job_tasks_job_schedule_idx").on(
  table.jobId,
  table.plannedStartAt,
  table.plannedEndAt,
),
```

Import `check`, `index`, and `sql` from the applicable Drizzle modules.

- [ ] **Step 4: Add the additive migration**

Create `drizzle/0006_job_task_schedule.sql`:

```sql
ALTER TABLE "job_tasks"
  ADD COLUMN IF NOT EXISTS "planned_start_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "planned_end_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "completed_at" timestamptz;

ALTER TABLE "job_tasks"
  ADD CONSTRAINT "job_tasks_planned_date_order"
  CHECK (
    "planned_start_at" IS NULL
    OR "planned_end_at" IS NULL
    OR "planned_end_at" >= "planned_start_at"
  );

CREATE INDEX IF NOT EXISTS "job_tasks_job_schedule_idx"
  ON "job_tasks" ("job_id", "planned_start_at", "planned_end_at");
```

Add index `6`, tag `0006_job_task_schedule`, and a monotonically increasing
`when` value to `drizzle/meta/_journal.json`.

- [ ] **Step 5: Run schema tests and typecheck**

Run:

```bash
npx vitest run src/db/schema.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit the migration**

```bash
git add \
  drizzle/0006_job_task_schedule.sql \
  drizzle/meta/_journal.json \
  src/db/schema.ts \
  src/db/schema.test.ts
```

Commit message:

```text
Add planned and actual dates to job tasks.
```

---

### Task 6: Parse and edit task planned dates

**Files:**
- Modify: `src/lib/ops/job-workspace.ts`
- Modify: `src/lib/ops/job-workspace.test.ts`
- Modify: `src/app/app/jobs/workspace-fields.tsx`
- Modify: `src/app/app/jobs/actions.ts`
- Modify: `src/app/app/jobs/[id]/page.tsx`

- [ ] **Step 1: Add failing parser tests**

Add to `src/lib/ops/job-workspace.test.ts`:

```ts
it("accepts a task planned range", () => {
  const parsed = parseJobTaskInput({
    title: "Install north wall",
    plannedStartAt: "2026-09-20T08:00",
    plannedEndAt: "2026-09-22T16:00",
  });
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  expect(parsed.value.plannedStartAt).toBeInstanceOf(Date);
  expect(parsed.value.plannedEndAt).toBeInstanceOf(Date);
});

it("rejects task planned completion before planned start", () => {
  expect(
    parseJobTaskInput({
      title: "Install north wall",
      plannedStartAt: "2026-09-22T16:00",
      plannedEndAt: "2026-09-20T08:00",
    }),
  ).toEqual({
    ok: false,
    error: "Planned completion must be on or after planned start.",
    field: "plannedEndAt",
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npx vitest run src/lib/ops/job-workspace.test.ts
```

Expected: FAIL because task inputs do not accept planned dates.

- [ ] **Step 3: Extend job-task parsing**

Keep the shared request-task parser in `src/lib/ops/collaboration.ts`
unchanged. Extend only `JobTaskInput` and `parseJobTaskInput` with:

```ts
plannedStartAt: Date | null;
plannedEndAt: Date | null;
```

After the existing shared task parse succeeds, parse empty job-task planned
date values as null, return field-specific invalid-date errors, and enforce:

```ts
if (
  plannedStartAt &&
  plannedEndAt &&
  plannedEndAt.getTime() < plannedStartAt.getTime()
) {
  return {
    ok: false,
    error: "Planned completion must be on or after planned start.",
    field: "plannedEndAt",
  };
}
```

Pass both fields through `parseJobTaskInput`.

- [ ] **Step 4: Add planned date fields to TaskFields**

Extend defaults with `plannedStartAt` and `plannedEndAt`. Add two
`datetime-local` inputs:

```tsx
<div className="space-y-2">
  <Label htmlFor={id("plannedStartAt")}>Planned start</Label>
  <Input
    id={id("plannedStartAt")}
    name="plannedStartAt"
    type="datetime-local"
    className="h-11"
    defaultValue={defaults.plannedStartAt ?? ""}
  />
  <FieldError name="plannedStartAt" />
</div>
<div className="space-y-2">
  <Label htmlFor={id("plannedEndAt")}>Planned completion</Label>
  <Input
    id={id("plannedEndAt")}
    name="plannedEndAt"
    type="datetime-local"
    className="h-11"
    defaultValue={defaults.plannedEndAt ?? ""}
  />
  <FieldError name="plannedEndAt" />
</div>
```

Keep `dueAt`; it is a deadline, not a replacement for planned completion.

- [ ] **Step 5: Wire action inputs and edit defaults**

In both add/save task actions, pass:

```ts
plannedStartAt: String(formData.get("plannedStartAt") ?? ""),
plannedEndAt: String(formData.get("plannedEndAt") ?? ""),
```

On the job edit dialog defaults, serialize with `datetimeLocalValue`.

- [ ] **Step 6: Run parser, type, and lint checks**

Run:

```bash
npx vitest run src/lib/ops/job-workspace.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: parser tests pass; typecheck may remain blocked until Task 7 persists
the new fields. Continue directly to Task 7 before committing if so.

---

### Task 7: Persist task dates and completion timestamps

**Files:**
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/demo-data.ts`
- Modify: `src/lib/ops/demo-store.test.ts`

- [ ] **Step 1: Add failing store tests**

Add tests that:

1. Create a task with planned start/end and read the same values.
2. Complete it and expect `completedAt` to be a `Date`.
3. Reopen it and expect `completedAt` to be null.

Use the existing demo task helpers and a unique task title.

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npx vitest run src/lib/ops/demo-store.test.ts
```

Expected: FAIL because the demo/store records do not persist the new fields.

- [ ] **Step 3: Persist planned dates**

In database and demo add/update functions, write:

```ts
plannedStartAt: args.input.plannedStartAt,
plannedEndAt: args.input.plannedEndAt,
```

Update demo fixtures to include:

```ts
plannedStartAt: null,
plannedEndAt: null,
completedAt: null,
```

for every `JobTaskRow` fixture constructed manually.

- [ ] **Step 4: Set and clear actual completion**

Database status mutation:

```ts
.set({
  status: args.status,
  completedAt: args.status === "done" ? new Date() : null,
  updatedAt: new Date(),
})
```

Demo status mutation:

```ts
task.status = args.status;
task.completedAt = args.status === "done" ? new Date() : null;
task.updatedAt = new Date();
```

Do not backfill timestamps for pre-existing done tasks.

- [ ] **Step 5: Include schedule facts in task events**

Task create/update event payload:

```ts
payload: {
  taskId: task.id,
  workAreaId: task.workAreaId,
  plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
  plannedEndAt: task.plannedEndAt?.toISOString() ?? null,
},
```

Completion/reopen payload also includes:

```ts
completedAt: task.completedAt?.toISOString() ?? null,
```

- [ ] **Step 6: Run focused and full checks**

Run:

```bash
npx vitest run \
  src/lib/ops/job-workspace.test.ts \
  src/lib/ops/demo-store.test.ts \
  src/db/schema.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: all pass.

- [ ] **Step 7: Commit task schedule persistence**

```bash
git add \
  src/lib/ops/job-workspace.ts \
  src/lib/ops/job-workspace.test.ts \
  src/app/app/jobs/workspace-fields.tsx \
  src/app/app/jobs/actions.ts \
  src/app/app/jobs/[id]/page.tsx \
  src/lib/ops/store.ts \
  src/lib/ops/demo-store.ts \
  src/lib/ops/demo-data.ts \
  src/lib/ops/demo-store.test.ts
```

Commit message:

```text
Schedule job tasks and track actual completion.
```

---

### Task 8: Upgrade Schedule to task bars and warnings

**Files:**
- Modify: `src/app/app/projects/[id]/page.tsx`
- Modify: `src/components/ops/project-schedule.tsx`
- Modify: `src/lib/ops/project-schedule.ts`
- Modify: `src/lib/ops/project-schedule.test.ts`

- [ ] **Step 1: Serialize Phase B task fields**

Change project task mapping to:

```ts
plannedStartAt: task.plannedStartAt?.toISOString() ?? null,
plannedEndAt: task.plannedEndAt?.toISOString() ?? null,
completedAt: task.completedAt?.toISOString() ?? null,
```

- [ ] **Step 2: Add failing geometry/warning tests**

Add tests proving:

- Both planned task dates produce a duration range.
- One planned task date produces a milestone.
- Due-only task remains a due milestone.
- No dates produce unscheduled.
- A task outside its parent job range is flagged.
- Complete tasks with historical end dates are complete, not overdue.

- [ ] **Step 3: Add truthful task geometry**

Export:

```ts
export type ScheduleGeometry =
  | { kind: "bar"; start: string; end: string }
  | { kind: "milestone"; date: string; source: "planned" | "due" }
  | { kind: "unscheduled" };

export function getTaskGeometry(
  task: Pick<
    ProjectScheduleTask,
    "plannedStartAt" | "plannedEndAt" | "dueAt"
  >,
): ScheduleGeometry {
  if (task.plannedStartAt && task.plannedEndAt) {
    return {
      kind: "bar",
      start: task.plannedStartAt,
      end: task.plannedEndAt,
    };
  }
  if (task.plannedStartAt || task.plannedEndAt) {
    return {
      kind: "milestone",
      date: task.plannedStartAt ?? task.plannedEndAt!,
      source: "planned",
    };
  }
  if (task.dueAt) {
    return { kind: "milestone", date: task.dueAt, source: "due" };
  }
  return { kind: "unscheduled" };
}
```

Add the equivalent `getJobGeometry`.

- [ ] **Step 4: Render task bars and warnings**

In `ProjectSchedule`:

- Render task bars only for `geometry.kind === "bar"`.
- Render a diamond milestone and a visible `Due` or `Planned` label for
  milestones.
- Add an AlertTriangle Lucide icon plus `Outside job dates` text when
  `isTaskOutsideJobRange` returns true.
- Add actual completion to the accessible table.
- Preserve Phase A behavior for tasks without planned dates.

- [ ] **Step 5: Run domain and build checks**

Run:

```bash
npx vitest run src/lib/ops/project-schedule.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
npm test
npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit the Phase B chart upgrade**

```bash
git add \
  src/app/app/projects/[id]/page.tsx \
  src/components/ops/project-schedule.tsx \
  src/lib/ops/project-schedule.ts \
  src/lib/ops/project-schedule.test.ts
```

Commit message:

```text
Render task duration and schedule warnings.
```

---

## Phase C — Dependencies, critical path, and controlled rescheduling

### Task 9: Add dependency storage and graph algorithms

**Files:**
- Create: `drizzle/0007_job_task_dependencies.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `src/db/schema.ts`
- Modify: `src/db/schema.test.ts`
- Create: `src/lib/ops/project-schedule-graph.ts`
- Create: `src/lib/ops/project-schedule-graph.test.ts`

- [ ] **Step 1: Add failing schema and graph tests**

Add to `src/db/schema.test.ts`:

```ts
expect(jobTaskDependencies).toBeDefined();
expect(jobTaskDependencies.predecessorTaskId).toBeDefined();
expect(jobTaskDependencies.successorTaskId).toBeDefined();
expect(jobTaskDependencies.lagDays).toBeDefined();
```

Create `src/lib/ops/project-schedule-graph.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  calculateCriticalPath,
  validateDependencyAddition,
} from "@/lib/ops/project-schedule-graph";

const tasks = [
  {
    id: "a",
    plannedStartAt: "2026-09-01T00:00:00.000Z",
    plannedEndAt: "2026-09-02T00:00:00.000Z",
  },
  {
    id: "b",
    plannedStartAt: "2026-09-03T00:00:00.000Z",
    plannedEndAt: "2026-09-05T00:00:00.000Z",
  },
  {
    id: "c",
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
});
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
npx vitest run \
  src/db/schema.test.ts \
  src/lib/ops/project-schedule-graph.test.ts
```

Expected: FAIL because the table and graph module do not exist.

- [ ] **Step 3: Add the dependency table**

Export `jobTaskDependencies` from `src/db/schema.ts`:

```ts
export const jobTaskDependencies = pgTable(
  "job_task_dependencies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    predecessorTaskId: uuid("predecessor_task_id")
      .notNull()
      .references(() => jobTasks.id, { onDelete: "cascade" }),
    successorTaskId: uuid("successor_task_id")
      .notNull()
      .references(() => jobTasks.id, { onDelete: "cascade" }),
    lagDays: integer("lag_days").notNull().default(0),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    unique("job_task_dependencies_unique").on(
      table.predecessorTaskId,
      table.successorTaskId,
    ),
    check(
      "job_task_dependencies_no_self",
      sql`${table.predecessorTaskId} <> ${table.successorTaskId}`,
    ),
    check(
      "job_task_dependencies_lag_nonnegative",
      sql`${table.lagDays} >= 0`,
    ),
    index("job_task_dependencies_project_idx").on(table.projectId),
    index("job_task_dependencies_successor_idx").on(table.successorTaskId),
  ],
);
```

Create `drizzle/0007_job_task_dependencies.sql` with the exact SQL from the
design specification. Add journal index `7` with tag
`0007_job_task_dependencies`.

- [ ] **Step 4: Implement graph validation**

Create `src/lib/ops/project-schedule-graph.ts` with:

```ts
export type ScheduleGraphTask = {
  id: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
};

export type ScheduleDependency = {
  predecessorTaskId: string;
  successorTaskId: string;
  lagDays: number;
};

export type CriticalPathMetric = {
  earliestStartDay: number;
  earliestFinishDay: number;
  latestStartDay: number;
  latestFinishDay: number;
  totalFloatDays: number;
};

export function validateDependencyAddition(
  tasks: readonly ScheduleGraphTask[],
  edges: readonly ScheduleDependency[],
  candidate: ScheduleDependency,
):
  | { ok: true }
  | { ok: false; error: string; field?: "predecessorTaskId" | "lagDays" };

export function calculateCriticalPath(
  tasks: readonly ScheduleGraphTask[],
  edges: readonly ScheduleDependency[],
):
  | {
      ok: true;
      criticalTaskIds: Set<string>;
      metrics: Map<string, CriticalPathMetric>;
    }
  | { ok: false; error: string };
```

Implementation rules:

1. Reject missing task IDs, self edges, duplicate edges, non-integer lag, and
   negative lag.
2. Build adjacency and indegree maps.
3. Run Kahn's topological sort after adding the candidate; if sorted count is
   less than task count, reject the cycle.
4. For critical path, exclude tasks missing either planned date and remove
   edges touching excluded tasks.
5. Convert dates to local calendar-day ordinals. Duration is
   `max(1, endOrdinal - startOrdinal + 1)`.
6. Forward pass:

```ts
earliestStart[task] = max(
  0,
  ...incoming.map(
    (edge) => earliestFinish[edge.predecessorTaskId] + edge.lagDays,
  ),
);
earliestFinish[task] = earliestStart[task] + durationDays[task];
```

7. Set `projectFinish` to the maximum earliest finish.
8. Reverse pass:

```ts
latestFinish[task] =
  outgoing.length === 0
    ? projectFinish
    : Math.min(
        ...outgoing.map(
          (edge) =>
            latestStart[edge.successorTaskId] - edge.lagDays,
        ),
      );
latestStart[task] = latestFinish[task] - durationDays[task];
```

9. `totalFloatDays = latestStart - earliestStart`; zero-float tasks are
   critical.
10. Return the invalid-graph error instead of partial metrics when a cycle is
    present.

- [ ] **Step 5: Run tests, typecheck, and lint**

```bash
npx vitest run \
  src/db/schema.test.ts \
  src/lib/ops/project-schedule-graph.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: all pass.

- [ ] **Step 6: Commit dependency storage and graph**

```bash
git add \
  drizzle/0007_job_task_dependencies.sql \
  drizzle/meta/_journal.json \
  src/db/schema.ts \
  src/db/schema.test.ts \
  src/lib/ops/project-schedule-graph.ts \
  src/lib/ops/project-schedule-graph.test.ts
```

Commit message:

```text
Add task dependency and critical path foundations.
```

---

### Task 10: Add dependency commands and editor

**Files:**
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/demo-data.ts`
- Modify: `src/lib/ops/demo-store.test.ts`
- Modify: `src/app/app/projects/actions.ts`
- Create: `src/components/ops/task-dependency-editor.tsx`
- Modify: `src/components/ops/project-schedule.tsx`
- Modify: `src/app/app/projects/[id]/page.tsx`

- [ ] **Step 1: Add failing dependency store tests**

Add demo-store tests for:

```ts
it("creates and removes a same-project dependency", () => {
  const result = addDemoJobTaskDependency({
    projectId: DEMO_PROJECT_ID,
    predecessorTaskId: firstTask.id,
    successorTaskId: secondTask.id,
    lagDays: 1,
    actor: "pm@strongfoam.com",
  });
  expect(result.ok).toBe(true);
  expect(listDemoProjectTaskDependencies(DEMO_PROJECT_ID).edges).toHaveLength(1);
  if (!result.ok) return;
  expect(
    deleteDemoJobTaskDependency({
      projectId: DEMO_PROJECT_ID,
      dependencyId: result.dependency.id,
      actor: "pm@strongfoam.com",
    }).ok,
  ).toBe(true);
});
```

Add separate assertions that self, duplicate, cross-project, and circular edges
return `{ ok: false, error }` and do not alter stored edges.

- [ ] **Step 2: Run tests and verify they fail**

```bash
npx vitest run src/lib/ops/demo-store.test.ts
```

Expected: FAIL because dependency store functions do not exist.

- [ ] **Step 3: Implement project-scoped dependency reads**

Add store type:

```ts
export type ProjectDependencyResult = {
  edges: JobTaskDependencyRow[];
  truncated: boolean;
};
```

Database and demo functions:

```ts
export async function listProjectTaskDependencies(
  projectId: string,
): Promise<ProjectDependencyResult>;

export async function addJobTaskDependency(args: {
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  lagDays: number;
  actor: string;
}): Promise<
  | { ok: true; dependency: JobTaskDependencyRow }
  | { ok: false; error: string; field?: string }
>;

export async function deleteJobTaskDependency(args: {
  projectId: string;
  dependencyId: string;
  actor: string;
}): Promise<{ ok: true } | { ok: false; error: string }>;
```

Read at most 2,001 edges, return 2,000, and set `truncated`. Before insert:

1. Load both tasks joined through their jobs.
2. Require both jobs' `projectId` to equal `args.projectId`.
3. Load existing project edges.
4. Call `validateDependencyAddition`.
5. Insert only when validation succeeds.
6. Record `task_dependency_added` on the successor task's job with both task
   IDs and lag.

Delete requires the edge's `projectId` to match and records
`task_dependency_removed` on the successor task's job before returning.
Implement equivalent demo behavior and include dependency arrays in demo state
reset.

- [ ] **Step 4: Add server actions**

In `src/app/app/projects/actions.ts`, add:

```ts
export async function addProjectTaskDependency(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/projects/${projectId}`,
  );
  const result = await addJobTaskDependency({
    projectId,
    predecessorTaskId: String(formData.get("predecessorTaskId") ?? ""),
    successorTaskId: String(formData.get("successorTaskId") ?? ""),
    lagDays: Number(formData.get("lagDays") ?? 0),
    actor: session.email,
  });
  if (!result.ok) return fail(returnTo, result.error);
  revalidatePath(returnTo);
  return succeed(returnTo, "Dependency added.");
}
```

Add `removeProjectTaskDependency` with the same auth/return-to pattern and
success notice `Dependency removed.`.

- [ ] **Step 5: Build the dependency editor**

Create `src/components/ops/task-dependency-editor.tsx`:

- Props: `projectId`, `task`, all project tasks, incoming edges, and `returnTo`.
- Use a FormDialog titled **Manage dependencies**.
- Add predecessor select excluding the current task.
- Add integer lag input with `min={0}` and `step={1}`.
- Submit through `ActionForm` and `addProjectTaskDependency`.
- List current predecessors with job/task label, lag, and a ConfirmForm remove
  action.
- Show `No predecessors` empty text when appropriate.

Required form fields:

```tsx
<input type="hidden" name="projectId" value={projectId} />
<input type="hidden" name="successorTaskId" value={task.id} />
<input type="hidden" name="returnTo" value={returnTo} />
```

- [ ] **Step 6: Wire dependencies into project Schedule data**

Fetch `listProjectTaskDependencies(project.id)` in the project page
`Promise.all`, serialize the edges, and pass them to `ProjectSchedule`.

In `ProjectSchedule`:

- Pass each task's incoming edges to `TaskDependencyEditor`.
- Add a predecessor summary to task accessible text and table.
- Draw SVG elbow connectors only when both linked rows are expanded and both
  timeline coordinates are visible.
- Mark hidden/off-window connectors as text (`2 predecessors`) rather than
  drawing misleading partial lines.
- Show the dependency truncation warning when `truncated` is true.

- [ ] **Step 7: Run tests and checks**

```bash
npx vitest run \
  src/lib/ops/project-schedule-graph.test.ts \
  src/lib/ops/demo-store.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: all pass.

- [ ] **Step 8: Commit dependency commands and UI**

```bash
git add \
  src/lib/ops/store.ts \
  src/lib/ops/demo-store.ts \
  src/lib/ops/demo-data.ts \
  src/lib/ops/demo-store.test.ts \
  src/app/app/projects/actions.ts \
  src/components/ops/task-dependency-editor.tsx \
  src/components/ops/project-schedule.tsx \
  src/app/app/projects/[id]/page.tsx
```

Commit message:

```text
Manage task dependencies from the project Schedule.
```

---

### Task 11: Add critical-path labels and controlled rescheduling

**Files:**
- Modify: `src/lib/ops/project-schedule.ts`
- Modify: `src/lib/ops/project-schedule.test.ts`
- Modify: `src/lib/ops/project-schedule-graph.ts`
- Modify: `src/lib/ops/project-schedule-graph.test.ts`
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/demo-store.test.ts`
- Modify: `src/app/app/projects/actions.ts`
- Create: `src/components/ops/schedule-reschedule-dialog.tsx`
- Modify: `src/components/ops/project-schedule.tsx`

- [ ] **Step 1: Add failing shift and reschedule tests**

Add pure schedule tests:

```ts
it("shifts a task range while preserving duration", () => {
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
    plannedStartAt: "2026-09-13T12:00:00.000Z",
    plannedEndAt: "2026-09-15T12:00:00.000Z",
    dueAt: null,
  });
});

it("moves only dueAt for a due-only milestone", () => {
  const shifted = shiftScheduleDates(
    {
      plannedStartAt: null,
      plannedEndAt: null,
      dueAt: "2026-09-10T12:00:00.000Z",
    },
    -2,
  );
  expect(shifted.dueAt).toBe("2026-09-08T12:00:00.000Z");
});
```

Add demo-store tests that:

- A matching `expectedUpdatedAt` updates task dates.
- A stale timestamp returns `This schedule changed. Refresh and try again.`
- A move that starts a successor before predecessor finish plus lag is rejected.
- Rejected commands preserve original dates.
- Accepted commands add a `task_rescheduled` or `job_rescheduled` event with
  before/after dates.

- [ ] **Step 2: Run tests and verify they fail**

```bash
npx vitest run \
  src/lib/ops/project-schedule.test.ts \
  src/lib/ops/project-schedule-graph.test.ts \
  src/lib/ops/demo-store.test.ts
```

Expected: FAIL because date shifting and reschedule commands do not exist.

- [ ] **Step 3: Implement date shifting and edge validation**

Add:

```ts
export function shiftScheduleDates(
  dates: {
    plannedStartAt: string | null;
    plannedEndAt: string | null;
    dueAt: string | null;
  },
  deltaDays: number,
): {
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  dueAt: string | null;
};
```

Require integer `deltaDays`. Shift both planned dates when present. If neither
planned date exists, shift `dueAt`. Preserve original time-of-day and duration.

Add graph validation:

```ts
export function validateDependencyDates(
  tasks: readonly ScheduleGraphTask[],
  edges: readonly ScheduleDependency[],
):
  | { ok: true }
  | {
      ok: false;
      error: string;
      predecessorTaskId: string;
      successorTaskId: string;
    };
```

For edges where both predecessor end and successor start exist, require:

```text
successor start day >= predecessor end day + lagDays
```

Name both task titles in the caller's user-facing conflict message.

- [ ] **Step 4: Implement optimistic reschedule store commands**

Add:

```ts
export async function rescheduleJob(args: {
  projectId: string;
  jobId: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  expectedUpdatedAt: Date;
  actor: string;
}): Promise<{ ok: true; job: JobRow } | { ok: false; error: string }>;

export async function rescheduleJobTask(args: {
  projectId: string;
  jobId: string;
  taskId: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  dueAt: Date | null;
  expectedUpdatedAt: Date;
  actor: string;
}): Promise<{ ok: true; task: JobTaskRow } | { ok: false; error: string }>;
```

Both commands:

1. Verify entity membership in `projectId`.
2. Compare persisted `updatedAt.getTime()` to `expectedUpdatedAt.getTime()`.
3. Validate date order.
4. For task moves, load project tasks and edges, apply the proposed dates in
   memory, and run `validateDependencyDates`.
5. Update with a `WHERE updated_at = expectedUpdatedAt` predicate.
6. If no row updates, return the stale error.
7. Record before/after ISO dates and expected version in the job event.

Job moves preserve job duration but do not cascade task dates. Existing
out-of-job-range warnings remain visible afterward.

- [ ] **Step 5: Add one server action for drag and keyboard moves**

In `src/app/app/projects/actions.ts`, add
`rescheduleProjectScheduleItem(formData)`. Parse:

```text
projectId
entityType = job | task
jobId
taskId
plannedStartAt
plannedEndAt
dueAt
expectedUpdatedAt
returnTo
```

Use the appropriate store command. On success:

```ts
revalidatePath(`/app/projects/${projectId}`);
revalidatePath(`/app/jobs/${jobId}`);
return succeed(returnTo, entityType === "job" ? "Job rescheduled." : "Task rescheduled.");
```

Use field errors for invalid dates and a toast error for stale/dependency
conflicts.

- [ ] **Step 6: Build the shared confirmation dialog**

Create `src/components/ops/schedule-reschedule-dialog.tsx` with props:

```ts
type ReschedulePreview = {
  entityType: "job" | "task";
  entityId: string;
  jobId: string;
  label: string;
  expectedUpdatedAt: string;
  before: {
    plannedStartAt: string | null;
    plannedEndAt: string | null;
    dueAt: string | null;
  };
  after: {
    plannedStartAt: string | null;
    plannedEndAt: string | null;
    dueAt: string | null;
  };
  warnings: string[];
};
```

The dialog must:

- Show old and proposed dates side by side.
- Show dependency and job-range warnings.
- Submit hidden fields to `rescheduleProjectScheduleItem`.
- Use **Confirm reschedule** as the mutation button.
- Cancel without mutation.
- Be opened from either a pointer drop or a row **Reschedule** button.

- [ ] **Step 7: Add pointer drag and keyboard-equivalent controls**

In `ProjectSchedule`:

1. Add a dedicated grip button to scheduled bars/milestones.
2. On pointer down, store start X and source geometry.
3. On pointer move, render a non-persistent ghost shifted by whole timeline
   columns.
4. On pointer up, convert pixel delta to integer day/month-column delta and
   call `shiftScheduleDates`.
5. Open `ScheduleRescheduleDialog`; do not call the action directly.
6. Add a row menu **Reschedule** action that opens the same dialog with date
   inputs and no drag requirement.
7. Support Escape to cancel an active drag.
8. Set `aria-describedby` to instructions: `Drag to propose new dates. Saving
   requires confirmation.`

Do not make the source-record link itself draggable.

- [ ] **Step 8: Render critical path accessibly**

Call `calculateCriticalPath` with serialized tasks and edges. For each critical
task:

- Add a `Critical` badge in the label pane.
- Add `data-critical="true"` to the bar for semantic styling.
- Add a `Critical path` cell/value in the table.
- Include a toolbar toggle **Highlight critical path**; disabling the visual
  highlight does not remove text/table labels.

If graph calculation fails, render an Alert naming the invalid graph instead of
showing partial critical results.

- [ ] **Step 9: Run all focused checks**

```bash
npx vitest run \
  src/lib/ops/project-schedule.test.ts \
  src/lib/ops/project-schedule-graph.test.ts \
  src/lib/ops/demo-store.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Expected: all pass.

- [ ] **Step 10: Commit critical path and rescheduling**

```bash
git add \
  src/lib/ops/project-schedule.ts \
  src/lib/ops/project-schedule.test.ts \
  src/lib/ops/project-schedule-graph.ts \
  src/lib/ops/project-schedule-graph.test.ts \
  src/lib/ops/store.ts \
  src/lib/ops/demo-store.ts \
  src/lib/ops/demo-store.test.ts \
  src/app/app/projects/actions.ts \
  src/components/ops/schedule-reschedule-dialog.tsx \
  src/components/ops/project-schedule.tsx
```

Commit message:

```text
Add critical path and confirmed Schedule rescheduling.
```

---

## Phase D — Baseline, resources, and working calendar

### Task 12: Add planning schema and pure working-day rules

**Files:**
- Create: `drizzle/0008_schedule_planning.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `src/db/schema.ts`
- Modify: `src/db/schema.test.ts`
- Create: `src/lib/ops/project-schedule-planning.ts`
- Create: `src/lib/ops/project-schedule-planning.test.ts`
- Modify: `src/lib/ops/project-schedule-graph.ts`
- Modify: `src/lib/ops/project-schedule-graph.test.ts`

- [ ] **Step 1: Add failing schema and planning tests**

Assert exports for:

```ts
scheduleCalendars
scheduleCalendarExceptions
projectScheduleBaselines
projectScheduleBaselineItems
projects.scheduleCalendarId
```

Create planning tests:

```ts
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
      { plannedStartAt: "2026-09-10", plannedEndAt: "2026-09-12" },
      { plannedStartAt: "2026-09-08", plannedEndAt: "2026-09-11" },
      weekdayCalendar,
    ),
  ).toMatchObject({
    state: "changed",
    startVarianceDays: 2,
    finishVarianceDays: 1,
  });
  expect(calculateBaselineVariance(current, null, weekdayCalendar).state).toBe(
    "added",
  );
});

it("groups free-text assignments and flags range overlap", () => {
  const lanes = buildResourceLanes([
    assignment(" Alex Smith ", "2026-09-10", "2026-09-12"),
    assignment("alex  smith", "2026-09-12", "2026-09-14"),
  ], weekdayCalendar);
  expect(lanes).toHaveLength(1);
  expect(lanes[0]?.displayName).toBe("Alex Smith");
  expect(lanes[0]?.potentialOverlapCount).toBe(1);
});
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
npx vitest run \
  src/db/schema.test.ts \
  src/lib/ops/project-schedule-planning.test.ts \
  src/lib/ops/project-schedule-graph.test.ts
```

Expected: FAIL because schema and planning functions do not exist.

- [ ] **Step 3: Add migration and schema**

Implement the four tables and project calendar foreign key exactly as specified
in the design:

- `schedule_calendars`
- `schedule_calendar_exceptions`
- `project_schedule_baselines`
- `project_schedule_baseline_items`
- `projects.schedule_calendar_id`

Add actor/timestamp columns used by the specification, unique indexes on
calendar date and baseline entity, and indexes on project/baseline foreign
keys. Add journal index `8` with tag `0008_schedule_planning`.

Seed one default calendar only through an idempotent store command, not a
hard-coded UUID in the migration.

- [ ] **Step 4: Implement the planning module**

Export:

```ts
export function isWorkingDay(
  date: string,
  calendar: ResolvedWorkingCalendar,
): boolean;

export function addWorkingDays(
  date: string,
  delta: number,
  calendar: ResolvedWorkingCalendar,
): string;

export function workingDayDifference(
  from: string,
  to: string,
  calendar: ResolvedWorkingCalendar,
): number;

export function calculateBaselineVariance(
  current: ScheduleDates | null,
  baseline: ScheduleDates | null,
  calendar: ResolvedWorkingCalendar,
): BaselineVariance;

export function buildResourceLanes(
  assignments: readonly ScheduleAssignment[],
  calendar: ResolvedWorkingCalendar,
): ResourceLane[];
```

Rules:

- Resolve dates in `calendar.timeZone`; never use server-local date boundaries.
- A date exception overrides `weekendDays`.
- `addWorkingDays` preserves direction and skips non-working dates.
- Baseline state is `unchanged | changed | added | removed | not-baselined`.
- Normalize resource keys with trim, collapsed whitespace, and lowercase.
- Detect overlaps with a sorted sweep per resource, not an all-pairs scan.
- Due-only milestones do not count as overlaps.

- [ ] **Step 5: Make graph and shifting calendar-aware**

Pass `ResolvedWorkingCalendar` into:

- `calculateCriticalPath`
- `validateDependencyDates`
- `shiftScheduleDates`

Count duration and lag in working days. Dragging one visible working column
calls `addWorkingDays(..., 1, calendar)`. Add tests proving a Friday move by one
working day lands Monday unless Monday is a closure.

- [ ] **Step 6: Run checks and commit**

```bash
npx vitest run \
  src/db/schema.test.ts \
  src/lib/ops/project-schedule-planning.test.ts \
  src/lib/ops/project-schedule-graph.test.ts \
  src/lib/ops/project-schedule.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Commit:

```text
Add Schedule baseline and working calendar foundations.
```

---

### Task 13: Add baseline and working-calendar commands

**Files:**
- Modify: `src/lib/ops/store.ts`
- Modify: `src/lib/ops/demo-store.ts`
- Modify: `src/lib/ops/demo-data.ts`
- Modify: `src/lib/ops/demo-store.test.ts`
- Modify: `src/app/app/projects/actions.ts`
- Create: `src/components/ops/schedule-baseline-controls.tsx`
- Create: `src/components/ops/schedule-calendar-dialog.tsx`
- Modify: `src/components/ops/project-schedule.tsx`
- Modify: `src/app/app/projects/[id]/page.tsx`

- [ ] **Step 1: Add failing store tests**

Cover:

- Baseline capture includes every current job/task and its nullable schedule
  dates in one snapshot.
- Updating a baseline item is impossible because no update command exists.
- Soft-removing a baseline preserves items, `capturedBy`, `deletedBy`, and
  timestamps.
- A project calendar falls back to the default.
- A dated exception overrides the weekend rule.
- Duplicate calendar dates update through an authorized upsert and retain audit
  values.

- [ ] **Step 2: Implement baseline persistence**

Add:

```ts
listProjectScheduleBaselines(projectId)
getProjectScheduleBaseline(projectId, baselineId)
captureProjectScheduleBaseline({ projectId, name, actor })
removeProjectScheduleBaseline({ projectId, baselineId, actor })
```

`captureProjectScheduleBaseline` must run in a database transaction:

1. Confirm the project exists.
2. Insert baseline header.
3. Read all project jobs and tasks.
4. Insert one immutable item per job/task with current planned/due values.
5. Commit only when every insert succeeds.

Use the same behavior in demo state. Do not expose any baseline-item update
function.

- [ ] **Step 3: Implement calendar persistence**

Add:

```ts
resolveProjectScheduleCalendar(projectId)
setProjectScheduleCalendar({ projectId, calendarId, actor })
upsertScheduleCalendarException({
  calendarId,
  date,
  name,
  isWorkingDay,
  actor,
})
removeScheduleCalendarException({ calendarId, exceptionId, actor })
```

Create the default Saturday/Sunday calendar if none exists. Validate IANA time
zone, weekend integers `0..6`, unique exception dates, and ISO date-only input.
Calendar changes do not update jobs, tasks, dependencies, or baselines.

- [ ] **Step 4: Add server actions**

Add authenticated actions:

```ts
captureProjectScheduleBaseline
removeProjectScheduleBaseline
saveProjectScheduleCalendar
saveScheduleCalendarException
removeScheduleCalendarException
```

All actions validate `projectId`, use safe `returnTo`, revalidate the project
page, and return ActionState notices. Baseline removal and exception deletion
use ConfirmForm.

- [ ] **Step 5: Build baseline controls**

`ScheduleBaselineControls` provides:

- **Baseline: None / {name}** select.
- **Capture baseline** dialog with required name and item-count preview.
- Selected baseline metadata (`Captured Sep 19 by …`).
- Signed start/finish variance in chart rows and the accessible table.
- Thin neutral baseline outlines behind current bars.
- Explicit **Added**, **Removed**, and **Not baselined** states.
- Confirmed soft-remove for authorized managers.

Keep baseline selection in the URL (`scheduleBaseline={id}`) so it is
shareable and survives reload.

- [ ] **Step 6: Build the working-calendar dialog**

`ScheduleCalendarDialog` provides:

- Calendar name and IANA time zone.
- Seven weekday toggles.
- Exception table with date, name, and Working/Closed state.
- Add/edit exception dialog.
- Confirmed remove.
- Explanatory text: `Calendar changes update calculations; stored dates do not
  move.`

After an action succeeds, refresh chart geometry, dependency warnings, critical
path, variance, and reschedule previews from the same resolved calendar.

- [ ] **Step 7: Run checks and commit**

```bash
npx vitest run \
  src/lib/ops/project-schedule-planning.test.ts \
  src/lib/ops/project-schedule-graph.test.ts \
  src/lib/ops/demo-store.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Commit:

```text
Add Schedule baselines and calendar management.
```

---

### Task 14: Add assignment resource overlay

**Files:**
- Modify: `src/lib/ops/project-schedule-planning.ts`
- Modify: `src/lib/ops/project-schedule-planning.test.ts`
- Create: `src/components/ops/project-resource-schedule.tsx`
- Modify: `src/components/ops/project-schedule.tsx`
- Modify: `src/app/app/projects/[id]/page.tsx`

- [ ] **Step 1: Add failing resource projection tests**

Test that:

- Job project manager, job foreman, and task assignee become separate typed
  assignments.
- Case/whitespace variants group into one lane.
- The first non-empty source value remains the display name.
- Two ranges sharing a working day create one potential-overlap warning.
- Weekend-only intersection does not create an overlap.
- Due-only milestones render but do not create overlap.
- Unassigned records remain available in an **Unassigned** group.

- [ ] **Step 2: Implement bounded resource projection**

Build `ScheduleAssignment[]` from already-fetched project data. Do not add
another per-job query. A job may appear in both project-manager and foreman
lanes; task assignment comes only from `task.assignee`.

Sort each lane once by start/end and use a sweep to mark overlapping range
IDs. Return:

```ts
type ResourceLane = {
  key: string;
  displayName: string;
  roles: ("Project manager" | "Foreman" | "Task assignee")[];
  assignments: ProjectedAssignment[];
  potentialOverlapCount: number;
};
```

- [ ] **Step 3: Build resource view**

Add **Work | Resources** to the Schedule toolbar. `ProjectResourceSchedule`
uses the same timeline window, calendar, baseline selection, status semantics,
and source links as Work view.

Each lane shows:

- Person display name and role badges.
- Scheduled job/task bars.
- Due-only milestones.
- `Potential overlap` badge with accessible conflict list.
- Unscheduled assignments in an explicit group.

The accessible table includes resource, role, source item, dates, baseline
variance, and overlap state. It must not show hours, utilization percentage, or
capacity.

- [ ] **Step 4: Browser-test and commit**

Verify at desktop and 375px that resource lanes scroll with the same date
header, overlap labels do not rely on color, source links work, and Work view
state is preserved when switching views.

```bash
npx vitest run src/lib/ops/project-schedule-planning.test.ts
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

Commit:

```text
Add the project Schedule resource overlay.
```

---

### Task 15: Final browser verification and documentation traceability

**Files:**
- Modify if implementation differs: `docs/superpowers/specs/2026-09-19-project-schedule-gantt-design.md`
- Modify if requirements changed: `docs/strongfoam-crm-erp-prd.md`

- [ ] **Step 1: Run the complete verification matrix**

```bash
npm test
npm run lint -- --max-warnings=0
npx tsc --noEmit
npm run build
```

Expected: all pass.

- [ ] **Step 2: Browser-verify desktop behavior**

Use a demo project containing:

- Two jobs with date ranges.
- One one-sided job date.
- One undated job.
- Open, done, overdue, and undated tasks.
- One task range outside its job range.
- One blocked job.
- A valid dependency chain crossing two jobs.
- A parallel non-critical scheduled task.
- One dependency with a one-day lag.
- One named baseline with both positive and negative variance.
- Project manager, foreman, and task assignee values with one overlap.
- One closure and one weekend working-day exception.

Verify every acceptance criterion in the design specification. Capture one
full Schedule screenshot and one short recording covering expansion, filters,
week/month, dependency editing, critical-path highlighting, confirmed drag,
keyboard rescheduling, baseline comparison, resource view, calendar exceptions,
and the accessible table.

- [ ] **Step 3: Browser-verify mobile and keyboard behavior**

At 375px:

- Controls wrap without overlap.
- Label pane remains readable.
- Timeline scrolls horizontally.
- Touch targets remain at least 44px.
- Task and job links work.
- Drag opens a confirmation preview without saving immediately.

Keyboard-only:

- Tab reaches all controls in logical order.
- Expand/collapse reports `aria-expanded`.
- Focus indicators are visible.
- Table can be opened and navigated.
- **Manage dependencies** and **Reschedule** are usable without pointer input.
- Reschedule opens the same before/after preview as drag.

- [ ] **Step 4: Verify data mutation behavior**

1. Edit task planned start/end.
2. Confirm the task changes from milestone to bar.
3. Put a task outside the job range and see the warning.
4. Complete the task and verify actual completion is set.
5. Reopen and verify actual completion is cleared.
6. Confirm job activity records each status change.
7. Add a dependency and verify its connector, predecessor text, and event.
8. Attempt a circular dependency and verify it is rejected without mutation.
9. Verify the documented dependency chain is labelled critical and the
   parallel shorter task is not.
10. Drag a task by two days, inspect before/after dates, cancel, and verify no
    mutation.
11. Repeat and confirm; verify duration is preserved and activity records the
    accepted move.
12. Attempt a dependency-violating move and verify the named conflict.
13. Open a stale second session, reschedule in the first, and verify the second
    receives the refresh-and-retry error.
14. Reschedule from the keyboard action and verify behavior matches drag.
15. Capture a baseline, move one item, and verify signed variance while the
    baseline values stay unchanged.
16. Switch to Resources and verify the known overlap appears as **Potential
    overlap** without hours or utilization.
17. Add a closure and verify geometry, dependency lag, critical path, and drag
    all skip the date.
18. Mark a weekend date working and verify all four calculations include it.
19. Confirm calendar edits did not rewrite stored schedule or baseline dates.

- [ ] **Step 5: Self-review spec coverage**

Map SCH-001 through SCH-021 to:

- Domain tests.
- Store tests.
- UI behavior.
- Browser evidence.

If implementation changes a requirement, update the PRD version, decision log,
and spec before commit. Do not silently change behavior only in code.

- [ ] **Step 6: Commit any final documentation corrections**

Stage only changed documentation and source files.

Commit message:

```text
Finalize project Schedule acceptance coverage.
```

- [ ] **Step 7: Push and open/update the pull request**

```bash
git push -u origin cursor/project-gantt-037e
```

Create or update the PR with:

- Requirement IDs SCH-001 through SCH-021.
- Phase A, Phase B, Phase C, and Phase D summary.
- Migration details.
- Full verification commands.
- Screenshot and recording artifacts.

## Definition of done

- PRD and implementation trace to SCH-001 through SCH-021.
- Every project job/task is represented or explicitly unscheduled.
- Job bars and task milestone/bar semantics are truthful.
- Progress formulas match the PRD.
- Filters preserve hierarchy and global totals.
- Table alternative contains the same facts.
- No project task N+1 query exists.
- Task planned dates and actual completion persist in demo and PostgreSQL paths.
- Completion/reopen timestamps and activity are correct.
- Finish-to-start dependencies persist in demo and PostgreSQL paths.
- Self, duplicate, cross-project, and circular dependencies are rejected.
- Critical-path labels match the documented graph algorithm.
- Drag and keyboard rescheduling share exact preview, validation, command, and
  audit behavior.
- Stale and dependency-violating moves do not mutate schedule data.
- Baseline items are immutable and variance uses the resolved working calendar.
- Resource overlays group existing assignments and label potential overlaps
  without invented capacity.
- Weekend and dated exceptions affect every schedule calculation consistently
  without rewriting stored dates.
- Unit, store, schema, lint, type, build, desktop, mobile, and keyboard checks
  pass.
