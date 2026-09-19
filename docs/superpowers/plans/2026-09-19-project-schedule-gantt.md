# Project Schedule Roll-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-level Schedule that rolls up every job and job task into an accessible Gantt-style view, then add task duration and actual-completion data without introducing drag scheduling or dependencies.

**Architecture:** Keep schedule rules in a pure domain module, fetch jobs and tasks with bounded project-scoped reads, and pass serialized data into one focused client component. Phase A renders existing job date bars and task due-date milestones with no migration. Phase B adds task planned dates and `completedAt`, updates the existing task command path, and upgrades scheduled tasks to duration bars.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM/PostgreSQL, Vitest, Tailwind 4, existing shadcn/ui components, Lucide icons.

---

## Source requirements

- PRD: `docs/strongfoam-crm-erp-prd.md`, SCH-001 through SCH-015.
- Design: `docs/superpowers/specs/2026-09-19-project-schedule-gantt-design.md`.
- Next.js guidance: read
  `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
  before implementing the client boundary.

## Global constraints

- Use the visible product label **Schedule**.
- Phase A is read-only and must not invent task duration.
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
| `src/components/ops/project-schedule.tsx` | Interactive, read-only chart and accessible table |
| `src/lib/ops/store.ts` | Bounded project task query and database task date persistence |
| `src/lib/ops/demo-store.ts` | Demo parity for project task reads and task date persistence |
| `src/lib/ops/demo-store.test.ts` | Demo project schedule/store behavior |
| `src/app/app/projects/[id]/page.tsx` | Project Schedule card integration |
| `src/app/app/jobs/[id]/page.tsx` | Stable task anchors |
| `src/db/schema.ts` | Phase B task schedule columns and constraint |
| `drizzle/0006_job_task_schedule.sql` | Additive task schedule migration |
| `drizzle/meta/_journal.json` | Migration journal entry |
| `src/lib/ops/job-workspace.ts` | Job task input propagation |
| `src/app/app/jobs/workspace-fields.tsx` | Planned task date fields |
| `src/app/app/jobs/actions.ts` | Planned task date form input |

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

### Task 9: Final browser verification and documentation traceability

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

Verify every acceptance criterion in the design specification. Capture one
full Schedule screenshot and one short recording covering expansion, filters,
week/month, and the accessible table.

- [ ] **Step 3: Browser-verify mobile and keyboard behavior**

At 375px:

- Controls wrap without overlap.
- Label pane remains readable.
- Timeline scrolls horizontally.
- Touch targets remain at least 44px.
- Task and job links work.

Keyboard-only:

- Tab reaches all controls in logical order.
- Expand/collapse reports `aria-expanded`.
- Focus indicators are visible.
- Table can be opened and navigated.

- [ ] **Step 4: Verify data mutation behavior**

1. Edit task planned start/end.
2. Confirm the task changes from milestone to bar.
3. Put a task outside the job range and see the warning.
4. Complete the task and verify actual completion is set.
5. Reopen and verify actual completion is cleared.
6. Confirm job activity records each status change.

- [ ] **Step 5: Self-review spec coverage**

Map SCH-001 through SCH-015 to:

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

- Requirement IDs SCH-001 through SCH-015.
- Phase A and Phase B summary.
- Migration details.
- Full verification commands.
- Screenshot and recording artifacts.

## Definition of done

- PRD and implementation trace to SCH-001 through SCH-015.
- Every project job/task is represented or explicitly unscheduled.
- Job bars and task milestone/bar semantics are truthful.
- Progress formulas match the PRD.
- Filters preserve hierarchy and global totals.
- Table alternative contains the same facts.
- No project task N+1 query exists.
- Task planned dates and actual completion persist in demo and PostgreSQL paths.
- Completion/reopen timestamps and activity are correct.
- Unit, store, schema, lint, type, build, desktop, mobile, and keyboard checks
  pass.
- Dependencies, critical path, and drag scheduling remain out of scope.
