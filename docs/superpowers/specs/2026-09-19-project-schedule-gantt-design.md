# Project Schedule Roll-Up — Design Specification

**Date:** 2026-09-19
**Product:** Strong Foam Operations Platform
**Status:** Draft, implementation-ready
**PRD requirements:** SCH-001 through SCH-021
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
timestamps so tasks with duration render as bars. The final implementation
phase adds finish-to-start dependencies, critical-path calculation, and
confirmed drag/keyboard rescheduling. The complete increment also includes
immutable baselines, assignment overlays, and a configurable working-day
calendar.

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
7. Compare the live schedule against an immutable manager-captured baseline.
8. Expose overlapping work from existing assignment values without inventing
   labor capacity.
9. Apply one working-day policy consistently across geometry, lag, critical
   path, and rescheduling.

## Non-goals

- Hour-based crew/resource capacity and automatic leveling.
- Automatic schedule optimization.
- Replacing the dispatch board or calendar.
- Inferring task duration from creation date, due date, status, or job dates.
- Cascading an entire dependency chain from one drag.

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

### Phase C — Dependency network and controlled rescheduling

Adds:

- Finish-to-start task dependencies across jobs in one project.
- Non-negative working-day dependency lag.
- Cycle, duplicate, self-reference, and cross-project rejection.
- Dependency connectors between visible scheduled tasks.
- Critical-path calculation from task duration, dependencies, and lag.
- Drag-to-reschedule for scheduled jobs and tasks.
- Keyboard-accessible reschedule dialog with the same preview and validation.
- Exact before/after confirmation, optimistic concurrency, and audit events.

### Phase D — Baseline, assignments, and working calendar

Adds:

- Named immutable project baselines with start/finish variance.
- A **Resources** view grouped by stable field user IDs for foremen,
  technicians, and task assignees. Project-manager strings remain
  informational until office identity migration is complete.
- Overlap warnings for concurrent assignments without fabricated hour/capacity
  values.
- A working calendar with Saturday/Sunday excluded by default.
- Authorized dated closures and working-day exceptions.
- Working-day-aware geometry, dependency lag, critical path, and rescheduling.

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

### Planning controls

- **Work | Resources** switches between job/task hierarchy and assignment
  groups without changing the visible date window.
- **Baseline** selects a captured baseline or **None**.
- **Capture baseline** asks for a name, previews the item count, and confirms
  one immutable project snapshot.
- **Working calendar** opens weekend and dated-exception management.
- Selecting a baseline adds baseline outlines and signed start/finish variance
  to the chart and table.
- Resource view lists each stable assigned user, their role labels, scheduled
  items, and potential overlap count. Legacy field labels remain unassigned.

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
- In Phases A/B, graphical bars and milestones are links, not drag handles.
- In Phase C, a dedicated grip on a scheduled bar/milestone starts a drag;
  clicking its label still opens the source record.
- A completed task may be rescheduled only through the same confirmed command;
  completion state and `completedAt` do not change.
- Dragging a task shifts both planned dates by the same visible working-day
  delta and preserves duration. Dragging a due-only milestone changes only
  `dueAt`.
- Dragging a job shifts both planned dates by the same visible working-day
  delta and preserves duration; attached task dates do not move automatically.
- Dropping opens a preview with old dates, proposed dates, and dependency or
  out-of-job-range warnings. No mutation occurs before confirmation.
- Each draggable row also has a **Reschedule** menu action that opens the same
  preview for keyboard and assistive-technology users.
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

### Phase C dependency table

```sql
CREATE TABLE "job_task_dependencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "predecessor_task_id" uuid NOT NULL
    REFERENCES "job_tasks"("id") ON DELETE CASCADE,
  "successor_task_id" uuid NOT NULL
    REFERENCES "job_tasks"("id") ON DELETE CASCADE,
  "lag_days" integer DEFAULT 0 NOT NULL,
  "created_by" text NOT NULL,
  CONSTRAINT "job_task_dependencies_unique"
    UNIQUE ("predecessor_task_id", "successor_task_id"),
  CONSTRAINT "job_task_dependencies_no_self"
    CHECK ("predecessor_task_id" <> "successor_task_id"),
  CONSTRAINT "job_task_dependencies_lag_nonnegative"
    CHECK ("lag_days" >= 0)
);

CREATE INDEX "job_task_dependencies_project_idx"
  ON "job_task_dependencies" ("project_id");
CREATE INDEX "job_task_dependencies_successor_idx"
  ON "job_task_dependencies" ("successor_task_id");
```

The command layer must prove both tasks belong to `project_id`; database
foreign keys alone do not enforce that relationship.

### Phase D baseline and calendar tables

```sql
CREATE TABLE "schedule_calendars" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "time_zone" text NOT NULL,
  "weekend_days" integer[] DEFAULT '{0,6}' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL
);

CREATE TABLE "schedule_calendar_exceptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "calendar_id" uuid NOT NULL
    REFERENCES "schedule_calendars"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "name" text NOT NULL,
  "is_working_day" boolean DEFAULT false NOT NULL,
  UNIQUE ("calendar_id", "date")
);

ALTER TABLE "projects"
  ADD COLUMN "schedule_calendar_id" uuid
  REFERENCES "schedule_calendars"("id");

CREATE TABLE "project_schedule_baselines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "captured_at" timestamptz DEFAULT now() NOT NULL,
  "captured_by" text NOT NULL,
  "deleted_at" timestamptz,
  "deleted_by" text
);

CREATE TABLE "project_schedule_baseline_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "baseline_id" uuid NOT NULL
    REFERENCES "project_schedule_baselines"("id") ON DELETE CASCADE,
  "entity_type" text NOT NULL CHECK ("entity_type" IN ('job', 'task')),
  "entity_id" uuid NOT NULL,
  "planned_start_at" timestamptz,
  "planned_end_at" timestamptz,
  "due_at" timestamptz,
  UNIQUE ("baseline_id", "entity_type", "entity_id")
);
```

Baseline capture writes one immutable item for every current project job and
task in a transaction. Baselines have no update command. Removal is an
explicit confirmed soft-delete that preserves capture data and actor. An item
absent from the baseline is
**Added since baseline**; a baseline item whose source record no longer exists
is **Removed since baseline**.

The default calendar excludes Sunday (`0`) and Saturday (`6`). A dated
exception overrides the weekly rule. Project calendar falls back to the one
default calendar. Calendar changes affect calculations only; they never rewrite
stored job/task timestamps or baseline values.

## Dependency and critical-path rules

The included dependency type is finish-to-start:

```text
successor earliest start
  = predecessor earliest finish + lagDays
```

Rules:

- A task cannot depend on itself.
- The same edge cannot be added twice.
- Both tasks must belong to jobs in the same project.
- Adding an edge that creates a cycle is rejected before persistence.
- `lagDays` is a whole number greater than or equal to zero.
- Dependencies may cross jobs within the project.
- Deleting a task removes its dependency edges through cascade.
- Removing an edge does not change task dates automatically.

Critical-path calculation uses scheduled tasks that have both planned dates and
the project's resolved working calendar:

1. Duration is inclusive working days, minimum one.
2. Topologically sort the valid dependency graph.
3. Forward pass calculates earliest start/finish using working-day dependency
   lag.
4. Project finish is the maximum earliest finish across scheduled tasks.
5. Backward pass calculates latest start/finish from that project finish.
6. Total float is `latestStart - earliestStart`.
7. A task is critical when total float is zero.

Unscheduled tasks are excluded and labelled **Not calculated — add planned
dates**. A cycle must never reach calculation because edge creation rejects it;
defensive calculation returns an explicit invalid-graph result if corrupted
data is encountered.

## Baseline variance rules

For each current item and selected baseline:

- Start variance is signed working days from baseline start to current start.
- Finish variance is signed working days from baseline end/due to current
  end/due.
- Positive variance means later; negative means earlier; zero means unchanged.
- Missing baseline dates remain **Not baselined**, not zero variance.
- New and removed items use explicit labels rather than synthetic dates.
- Baseline bars render as a thin neutral outline behind current bars.

## Resource overlay rules

Field resource keys come from structured identity:

- Job `job_assignments.user_id` with role `foreman` → `Foreman`.
- Job `job_assignments.user_id` with role `technician` → `Technician`.
- Task `assignee_user_id` → `Task assignee`.

Project-manager strings are normalized only for the informational office lane:
trim, collapse internal whitespace, and compare case-insensitively. Free-text
foreman and task-assignee values do not grant Field access and render as
unassigned until linked to a user. A person has a potential overlap when two
scheduled ranges assigned to the same stable user ID share at least one working
day. Due-only milestones appear but do not create overlap warnings. The UI says
**Potential overlap**, never **Overallocated**, because no hour or capacity
model exists.

## Application data contract

The client schedule receives serializable data:

```ts
export type ProjectScheduleTask = {
  id: string;
  jobId: string;
  title: string;
  assignee: string | null;
  assigneeUserId: string | null;
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

export type ProjectScheduleDependency = {
  id: string;
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  lagDays: number;
};

export type ProjectScheduleData = {
  jobs: ProjectScheduleJob[];
  dependencies: ProjectScheduleDependency[];
  baselines: ProjectScheduleBaseline[];
  calendar: ResolvedWorkingCalendar;
  truncated: boolean;
};
```

The server owns date serialization. The client must not receive Drizzle rows
with `Date` objects.

## Query design

The project page must use a bounded project-scoped read:

1. Verify the project is authorized and exists.
2. Fetch jobs for the project.
3. Fetch all job tasks for those job IDs in one query.
4. Fetch all project dependency edges in one query.
5. Fetch baseline headers, selected baseline items, and the resolved project
   calendar/exceptions with bounded project-scoped reads.
6. Group tasks by job in application code.
7. Bound the initial task query at 1,001 rows, render the first 1,000, and show
   a bounded-result warning when the extra row proves the project exceeds the
   rendering contract.
8. Bound dependency reads at 2,001 edges, render the first 2,000, and use the
   same warning behavior.

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

Dependency commands validate task existence, same-project membership,
non-negative integer lag, duplicate edge, self-reference, and cycle creation.

Reschedule commands accept the entity ID, exact proposed dates, and
`expectedUpdatedAt`. The server reloads the entity and dependencies, rejects a
stale version, validates date order and finish-to-start constraints, then
returns either a field/conflict error or a confirmed result.

## Activity and audit

- Task create/update events include planned date fields in event payloads.
- Task completion sets `completedAt` and records `task_completed`.
- Task reopen clears `completedAt` and records `task_reopened`.
- Dependency create/remove events include both task IDs and lag.
- Every job/task reschedule event includes before/after dates, actor,
  `expectedUpdatedAt`, and the accepted entity version.
- Drag and keyboard rescheduling call the same server command.
- Baselines retain capture/removal actor and timestamps.
- Calendar exception changes retain actor, before/after values, and timestamp.

## UI implementation direction

- Use existing shadcn Card, Button, Badge, Progress, Select/native select, and
  Table components.
- Use Lucide icons.
- Build the schedule geometry as pure functions in
  `src/lib/ops/project-schedule.ts`.
- Build dependency validation and critical-path calculation as pure functions
  in `src/lib/ops/project-schedule-graph.ts`.
- Build working-day, variance, and assignment-overlap rules as pure functions
  in `src/lib/ops/project-schedule-planning.ts`.
- Build the chart as a focused client component in
  `src/components/ops/project-schedule.tsx`.
- Use SVG connectors only as a visual enhancement; dependency facts must also
  appear in task labels and the accessible table.
- Use pointer events for drag interaction and the same reschedule dialog for
  keyboard operation.
- Use CSS Grid and bounded columns; do not add a third-party Gantt dependency.
- Use semantic tokens for status; do not hard-code arbitrary status colors.

## Performance requirements

- Pure schedule projection must be linear in jobs plus tasks plus dependency
  edges.
- Do not render collapsed task rows.
- Keep visible timeline columns bounded to 42 days or six months.
- Use one project jobs query, one project tasks query, and one dependency query.
- Initial server render should not require client-side data fetching.
- A project with 100 jobs and 1,000 tasks must remain filterable and expandable
  without a full page navigation.
- Dependency validation and critical-path calculation must support 2,000 edges.
- Baseline and resource projections must remain linear in visible schedule
  items; do not compare every assignment to every other assignment.

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
- Duplicate, self, cross-project, and circular dependency rejection.
- Critical-path forward/backward passes and float calculation.
- Drag delta preserves duration.
- Stale and dependency-violating reschedules are rejected.
- Working-day arithmetic honors weekend rules and dated overrides.
- Baseline variance handles changed, new, removed, and unbaselined items.
- Resource normalization and sweep-line overlap detection.

### Store

- Project task query returns only tasks under the requested project.
- Demo and database adapters return the same shape.
- Bounds are enforced.
- Completion/reopen updates `completedAt`.
- Dependency CRUD is project-scoped and attributable.
- Reschedule uses `expectedUpdatedAt` and records before/after dates.
- Baseline capture is transactional and baseline items are immutable.
- Calendar exception CRUD is authorized and project calendar resolution falls
  back to the default.

### Browser

- Project with multiple jobs displays job bars and task milestones.
- Expand/collapse works by keyboard.
- Filters and density controls preserve correct rows.
- Job/task links reach their source records.
- Accessible table matches the chart.
- 375px view scrolls horizontally without clipped controls.
- Empty, no-task, and unscheduled states are understandable.
- Dependency connectors and predecessor labels agree.
- Critical labels agree with the tabular alternative.
- Drag and keyboard rescheduling produce the same preview and result.
- Stale and dependency-conflicting moves show actionable errors.
- Baseline capture and comparison show correct signed variance.
- Resource view flags overlaps but does not claim hour-based capacity.
- A closure and working-day exception update geometry and critical labels.

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
12. Valid finish-to-start dependencies may cross jobs in the same project.
13. Self, duplicate, cross-project, and circular dependencies are rejected.
14. Critical-path labels match the documented working-day algorithm.
15. Drag and keyboard moves preserve duration and require before/after
    confirmation.
16. Stale or dependency-violating moves do not mutate data.
17. Every accepted dependency and reschedule creates an attributable event.
18. A named baseline is immutable and displays signed current-date variance.
19. New, removed, and unbaselined items use explicit baseline states.
20. Resource view groups stable user assignments and flags overlapping
    working-day ranges; legacy free-text field labels remain unassigned.
21. Resource view does not present invented hours, utilization, or capacity.
22. Weekend and dated exceptions affect geometry, lag, critical path, and
    rescheduling consistently.
23. Calendar changes do not rewrite stored schedule or baseline timestamps.
24. The same job/task user IDs drive resource lanes, Field authorization, and
    realtime schedule delivery.
24. Lint, typecheck, unit tests, production build, and browser checks pass.

## Prioritization

### Must

- SCH-001 through SCH-021.
- Project/job/task hierarchy.
- Truthful bars/milestones/unscheduled rows.
- Progress, status, filters, navigation, drill-through, and accessible table.
- Task duration fields, actual completion, and range warnings.
- Finish-to-start dependencies and cycle rejection.
- Critical-path calculation and accessible labels.
- Confirmed drag and keyboard rescheduling.
- Immutable baseline capture and variance.
- Assignment/resource overlay with potential-overlap warnings.
- Working-day calendars and dated exceptions.

### Should

- Persisted expand/filter preferences.
- Export current schedule table.
- Schedule exceptions on the Home dashboard.

### Could

- Dependency types beyond finish-to-start.
- Hour-based resource capacity and automatic leveling.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Due dates are mistaken for task duration | Render due-only tasks as milestone diamonds and label the date source |
| Missing dates make rows disappear | Dedicated unscheduled groups and filter |
| Chart is inaccessible | Equivalent semantic table, text/icon statuses, keyboard links |
| N+1 task reads slow large projects | One project-scoped task query and bounds |
| Progress conflicts with job status | Show both; never derive one from the other |
| Drag edits create accidental schedule changes | Exact before/after preview and explicit confirmation before the server command |
| Existing done tasks lack completion history | Leave `completedAt` null; never invent a timestamp |
| Time zones move milestones to another day | Normalize and label using organization time zone |
| Dependency cycles invalidate schedule math | Validate with a topological cycle check before insert and fail closed during calculation |
| Drag conflicts with another manager's edit | Require `expectedUpdatedAt` and reject stale commands |
| Drag violates a predecessor or successor | Validate the affected edge set server-side and name the conflict |
| Critical path is mistaken for a promise | Label it as calculated from current planned dates and dependencies |
| A later calendar edit appears to rewrite history | Keep baseline timestamps immutable and recompute only displayed working-day variance |
| Free-text names split one person into several lanes | Normalize case and whitespace for grouping while preserving display values |
| Overlap is mistaken for proven over-capacity | Label it potential overlap and omit hours/utilization until capacity data exists |

## Open product decisions

These do not block the included phases:

1. Dependency types beyond finish-to-start.
2. Whether the schedule needs PDF/CSV export.
