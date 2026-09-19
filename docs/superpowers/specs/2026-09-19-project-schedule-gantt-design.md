# Project Schedule Roll-Up — Design Specification

**Date:** 2026-09-19
**Product:** Strong Foam Operations Platform
**Status:** Draft, implementation-ready
**PRD requirements:** SCH-001 through SCH-015
**Primary surface:** `/app/projects/[id]`

## Executive summary

Project managers need one place to understand what is complete, what remains,
what is blocked, and what has no schedule. The current project page lists jobs,
but it requires opening each job to inspect tasks and dates.

Add a **Schedule** card to the project detail page. It rolls up every project
job and its tasks into an expandable, accessible Gantt-style timeline. The
first usable release is read-only: job bars use existing planned start/end
dates and task milestones use existing due dates. A subsequent data-model
enhancement adds task planned start, planned completion, and actual completion
timestamps so tasks with duration render as bars.

The product label is **Schedule**, not “Gantt,” because managers need the
outcome rather than the chart terminology.

## Problem

The project detail page currently answers “which jobs exist?” but not:

- Which job is happening now?
- What has been completed across all jobs?
- What task is due next?
- Which work is overdue or blocked?
- Which jobs or tasks have no usable schedule?
- Does a task fall outside its parent job window?

Managers must open jobs one at a time and mentally combine dates and task
statuses. That is slow and makes missing dates easy to overlook.

## Goals

1. Show every project job and job task in one hierarchy.
2. Make complete, remaining, blocked, overdue, and unscheduled work obvious.
3. Preserve truthful scheduling: do not invent duration from a task due date.
4. Provide fast drill-through to the underlying job or task.
5. Keep the same schedule facts available to keyboard and screen-reader users.
6. Establish the data model required for task duration and actual completion.

## Non-goals

- Drag-to-reschedule in the initial release.
- Dependency arrows, critical-path calculation, or baseline variance.
- Crew/resource leveling.
- Automatic schedule optimization.
- Holiday or working-time calculations.
- Replacing the dispatch board or calendar.
- Inferring task duration from creation date, due date, status, or job dates.
- Editing records directly inside the graphical timeline.

## Users and primary stories

### Project manager

> As a project manager, I want to see all jobs and tasks on one timeline so I
> can identify completed, remaining, late, and unscheduled work without opening
> every job.

### Operations manager

> As an operations manager, I want blocked and overdue work to stand out so I
> can intervene before the project slips further.

### Coordinator

> As a coordinator, I want to see missing dates and schedule warnings so I can
> fix planning data through the existing job and task edit dialogs.

## Delivery phases

### Phase A — Read-only roll-up

Uses existing data only:

- Job `plannedStartAt` and `plannedEndAt` render as a bar or milestone.
- Task `dueAt` renders as a milestone.
- Open/done task status drives task progress.
- Job status identifies blocked, complete, and closed jobs.
- Undated jobs and tasks remain visible in unscheduled groups.
- Schedule controls provide density, filters, navigation, expansion, and an
  accessible table.

Phase A has no database migration.

### Phase B — Task schedule foundation

Adds nullable task fields:

- `plannedStartAt`
- `plannedEndAt`
- `completedAt`

Task forms accept planned start and planned completion. Tasks with both planned
dates render as bars. Completion/reopen actions set or clear `completedAt`.
Tasks outside the parent job range show a warning, but are not rejected.

### Deferred enhancements

- Task dependencies.
- Critical path.
- Baseline schedule and variance.
- Drag-to-reschedule.
- Crew/resource overlays.
- Holiday calendars.

These require separate validation because they introduce mutation, conflict,
and planning-policy decisions.

## Information architecture

The project page order becomes:

1. Project header and actions.
2. Project details.
3. **Schedule** roll-up.
4. Existing Jobs list.
5. Remove project.

The existing Jobs list remains. It is the compact record list and add-job
surface; Schedule is the operational roll-up.

## Schedule anatomy

```text
┌ Schedule ───────────────────────────────────────────────────────────┐
│ 7 / 12 tasks complete     [All ▼] [Week | Month] [‹] [Today] [›] │
├───────────────────────┬────────────────────────────────────────────┤
│ Work                  │ Sep 14   Sep 21   Sep 28   Oct 5          │
│ ▼ JOB-123 · Podium    │     ███████████████                       │
│   ○ Prep north wall   │              ◆                            │
│   ✓ Install closed... │        ◆                                  │
│ ▶ JOB-456 · Roof      │                    █████████████           │
│ Unscheduled (2)       │                                            │
├───────────────────────┴────────────────────────────────────────────┤
│ [View schedule as table]                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Left pane

The frozen label pane contains:

- Expand/collapse control.
- Job number and job name, or task title.
- Status text/icon.
- Job progress (`3 / 5 tasks`).
- Task assignee when present.
- Warning icon and accessible text for overdue, unscheduled, or out-of-range.

### Timeline pane

- Week density: 42 consecutive days, grouped and labelled by week.
- Month density: six consecutive calendar months, grouped and labelled by
  month.
- Previous/next moves by one visible window.
- Today resets the window so today is visible.
- The today marker is labelled for assistive technology.
- The left pane remains readable while the timeline scrolls horizontally.

### Job rows

| Dates | Rendering |
|---|---|
| Start and end | Bar spanning inclusive dates |
| Start only | Milestone at start |
| End only | Milestone at end |
| Neither | Unscheduled group |

The bar label contains the job status. Complete/closed jobs use completed
styling, blocked jobs use blocked styling, and other jobs use planned styling.

### Task rows

Phase A:

| Data | Rendering |
|---|---|
| `dueAt` | Milestone |
| No `dueAt` | Unscheduled beneath parent job |

Phase B:

| Data | Rendering |
|---|---|
| Planned start and end | Duration bar |
| One planned date | Milestone at that date |
| No planned dates, `dueAt` present | Due-date milestone |
| No planned dates or due date | Unscheduled beneath parent job |

The source date remains visible in the row/table so a planned-date milestone is
not confused with a due-date milestone.

## Progress rules

### Job progress

```text
done tasks for job ÷ all tasks for job
```

- Show `No tasks` when denominator is zero.
- Round visual percentage to the nearest whole number.
- Always show the fraction so rounding does not hide the underlying count.
- Do not derive job status from task progress.

### Project progress

```text
done tasks across all project jobs ÷ all tasks across all project jobs
```

- Jobs with no tasks do not add synthetic tasks to either side.
- Filtering or collapsing rows does not change the numerator or denominator.
- Show `No tasks` when the project has no tasks.

## Schedule-state rules

Rules are evaluated in organization-local calendar days.

### Task

- **Complete:** `status === "done"`.
- **Overdue:** status is open and the task due/planned completion date is
  before today.
- **Remaining:** status is open.
- **Unscheduled:** no planned start, planned completion, or due date.
- **Out of job range:** any planned task date is before the job planned start
  or after the job planned end.

Complete takes precedence over overdue.

### Job

- **Complete:** status is `complete` or `closed`.
- **Blocked:** status is `blocked`.
- **Overdue:** not complete/closed and planned end is before today.
- **Remaining:** any other non-complete status.
- **Unscheduled:** neither planned start nor planned end is present.

Blocked takes precedence over overdue in the primary badge; both facts remain
available in accessible text and the table.

## Filters

| Filter | Includes |
|---|---|
| All | Every job and task |
| Remaining | Non-complete jobs and open tasks |
| Complete | Complete/closed jobs and done tasks |
| Blocked | Blocked jobs and their tasks |
| Overdue | Overdue jobs and overdue tasks |
| Unscheduled | Undated jobs and undated tasks |

Job hierarchy is preserved. If a task matches, its parent job row remains
visible even when the job itself does not match. Progress totals remain global
and do not change with the filter.

## Interaction rules

- Job rows are expanded by default when the project has ten or fewer jobs.
- With more than ten jobs, rows are collapsed by default.
- Expand/collapse state is local UI state; it need not persist in Phase A.
- Job row click navigates to `/app/jobs/{jobId}`.
- Task row click navigates to `/app/jobs/{jobId}#task-{taskId}`.
- Task list items on the job page receive matching stable anchor IDs.
- Graphical bars and milestones are links, not drag handles.
- Hover may reveal detail, but all required actions and facts remain available
  by focus and in the table.

## Responsive behavior

### Desktop, 1024px and wider

- Frozen work pane target width: 20–24rem.
- Timeline fills remaining width.
- Toolbar stays on one line when space permits.

### Tablet

- Toolbar wraps.
- Work pane target width: 16rem.
- Timeline scrolls horizontally.

### Mobile, 375px

- Summary and controls stack.
- Work pane and timeline share a minimum total width inside one horizontal
  scroll container.
- Row height remains at least 44px.
- The table alternative is immediately below the chart.
- No label is reduced below 12px.

## Accessible table alternative

An expandable **View schedule as table** control renders a semantic table with:

- Type.
- Job/task.
- Status.
- Assignee.
- Planned start.
- Planned completion.
- Due date.
- Actual completion.
- Progress.
- Warning.

The table contains the same filtered rows as the graphical schedule. Links use
the same job/task destinations. Color is never the only status signal.

## Empty and incomplete states

| State | Message/action |
|---|---|
| No jobs | “Add the first job to build this project schedule.” + Add job |
| Jobs, no tasks | Show job bars plus `No tasks`; do not show 0% |
| No dates anywhere | Show all records in Unscheduled and prompt managers to edit dates |
| Filter has no matches | “No schedule rows match this filter.” + Show all |
| One-sided job/task dates | Show milestone and “Add the other planned date” warning |

## Data model

### Existing fields used in Phase A

```text
jobs.planned_start_at timestamptz null
jobs.planned_end_at   timestamptz null
jobs.status           text not null

job_tasks.due_at      timestamptz null
job_tasks.status      text not null
```

### Phase B additions

```sql
ALTER TABLE "job_tasks"
  ADD COLUMN "planned_start_at" timestamptz,
  ADD COLUMN "planned_end_at" timestamptz,
  ADD COLUMN "completed_at" timestamptz,
  ADD CONSTRAINT "job_tasks_planned_date_order"
    CHECK (
      "planned_start_at" IS NULL
      OR "planned_end_at" IS NULL
      OR "planned_end_at" >= "planned_start_at"
    );

CREATE INDEX "job_tasks_job_schedule_idx"
  ON "job_tasks" ("job_id", "planned_start_at", "planned_end_at");
```

`completedAt` is set on transition to done and cleared on reopen. Existing done
tasks are not assigned a fabricated historical completion time; they remain
done with `completedAt = null` until a future audited backfill policy exists.

## Application data contract

The client schedule receives serializable data:

```ts
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
```

The server owns date serialization. The client must not receive Drizzle rows
with `Date` objects.

## Query design

The project page must use a bounded project-scoped read:

1. Verify the project is authorized and exists.
2. Fetch jobs for the project.
3. Fetch all job tasks for those job IDs in one query.
4. Group tasks by job in application code.
5. Bound the initial task query at 1,001 rows, render the first 1,000, and show
   a bounded-result warning when the extra row proves the project exceeds the
   rendering contract.

Do not add one task query per job. The demo adapter must return the same shape
as the database adapter.

## Validation

Job-task form parsing adds:

```ts
plannedStartAt?: Date | null
plannedEndAt?: Date | null
```

Validation rules:

- Empty values become null.
- Invalid dates return field-specific errors.
- Planned end before planned start returns an error on `plannedEndAt`.
- A date outside the parent job range is accepted and represented as a warning.
- `dueAt` remains supported for deadline semantics.

## Activity and audit

- Task create/update events include planned date fields in event payloads.
- Task completion sets `completedAt` and records `task_completed`.
- Task reopen clears `completedAt` and records `task_reopened`.
- Later drag rescheduling must use a server command, validate the exact payload,
  and record before/after dates. It is not part of this implementation.

## UI implementation direction

- Use existing shadcn Card, Button, Badge, Progress, Select/native select, and
  Table components.
- Use Lucide icons.
- Build the schedule geometry as pure functions in
  `src/lib/ops/project-schedule.ts`.
- Build the chart as a focused client component in
  `src/components/ops/project-schedule.tsx`.
- Use CSS Grid and bounded columns for Phase A/B; do not add a third-party Gantt
  dependency before interaction needs justify it.
- Use semantic tokens for status; do not hard-code arbitrary status colors.

## Performance requirements

- Pure schedule projection must be linear in jobs plus tasks.
- Do not render collapsed task rows.
- Keep visible timeline columns bounded to 42 days or six months.
- Use one project jobs query and one project tasks query.
- Initial server render should not require client-side data fetching.
- A project with 100 jobs and 1,000 tasks must remain filterable and expandable
  without a full page navigation.

## Test strategy

### Unit

- Date window generation for week and month density.
- Job bar, job milestone, task bar, task milestone, and unscheduled projection.
- Progress with zero tasks and mixed open/done tasks.
- Status precedence for complete, blocked, overdue, and unscheduled.
- Filters preserve required parent jobs.
- Planned date validation.
- Completion timestamp set/clear.
- Out-of-job-range warning.

### Store

- Project task query returns only tasks under the requested project.
- Demo and database adapters return the same shape.
- Bounds are enforced.
- Completion/reopen updates `completedAt`.

### Browser

- Project with multiple jobs displays job bars and task milestones.
- Expand/collapse works by keyboard.
- Filters and density controls preserve correct rows.
- Job/task links reach their source records.
- Accessible table matches the chart.
- 375px view scrolls horizontally without clipped controls.
- Empty, no-task, and unscheduled states are understandable.

## Acceptance criteria

1. Every project job is present in Schedule, including undated jobs.
2. Every job task is present when its job is expanded, including undated tasks.
3. Jobs with two planned dates are bars; tasks with only due dates are
   milestones.
4. Progress fractions and percentages follow the documented formula.
5. Completed, remaining, blocked, overdue, and unscheduled filters follow the
   documented semantics.
6. Today, previous, next, week, and month controls update the visible window.
7. Job and task links reach the underlying record and task anchor.
8. The table alternative exposes the same facts.
9. Task planned dates validate end-after-start.
10. Completing/reopening a task sets/clears `completedAt`.
11. Dates outside a parent job window create a warning, not data loss.
12. Lint, typecheck, unit tests, production build, and browser checks pass.

## Prioritization

### Must

- SCH-001 through SCH-010 and SCH-015.
- Project/job/task hierarchy.
- Truthful bars/milestones/unscheduled rows.
- Progress, status, filters, navigation, drill-through, and accessible table.

### Should

- SCH-011 through SCH-013.
- Task duration fields, actual completion, and range warnings.

### Could

- Persisted expand/filter preferences.
- Export current schedule table.
- Schedule exceptions on the Home dashboard.

### Not in this implementation

- SCH-014 dependency graph and drag scheduling.
- Critical path, baseline variance, and resource leveling.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Due dates are mistaken for task duration | Render due-only tasks as milestone diamonds and label the date source |
| Missing dates make rows disappear | Dedicated unscheduled groups and filter |
| Chart is inaccessible | Equivalent semantic table, text/icon statuses, keyboard links |
| N+1 task reads slow large projects | One project-scoped task query and bounds |
| Progress conflicts with job status | Show both; never derive one from the other |
| Drag edits create accidental schedule changes | Read-only chart; edits remain in validated dialogs |
| Existing done tasks lack completion history | Leave `completedAt` null; never invent a timestamp |
| Time zones move milestones to another day | Normalize and label using organization time zone |

## Open product decisions

These do not block Phase A or B:

1. Dependency types beyond finish-to-start.
2. Organization holiday/non-working-day behavior.
3. Whether future drag rescheduling applies changes immediately or requires a
   preview/confirmation.
4. Whether the schedule needs PDF/CSV export.
