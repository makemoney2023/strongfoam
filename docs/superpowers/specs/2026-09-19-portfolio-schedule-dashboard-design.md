# Portfolio Schedule and Dashboard Widgets — Design Specification

**Date:** 2026-09-19  
**Product:** Strong Foam Operations Platform  
**Status:** Approved, implementation-ready  
**PRD requirements:** SCH-022 through SCH-031  
**Primary surface:** `/app/projects/schedule`

## Executive summary

The project Schedule answers what is happening inside one project. Operations
managers also need one bounded view across the portfolio so they can identify
late, blocked, unscheduled, and overlapping work without opening every project.

Add a dedicated **Portfolio Schedule** at `/app/projects/schedule`. It uses the
same schedule facts and pure planning rules as the project Schedule, but adds a
top hierarchy level:

```text
Portfolio
  → Project
      → Job
          → Job task
```

The portfolio view is read-only. Schedule mutations remain on the project
Schedule because dependencies, calendars, baselines, and optimistic versions
belong to a project. Home dashboard widgets use the same bounded portfolio
projection and link to shareable filtered portfolio views.

## Goals

1. Show schedule health across active projects in one workspace.
2. Preserve project-specific working calendars, critical paths, and baselines.
3. Make overdue, blocked, unscheduled, baseline-late, and resource-conflict
   work directly actionable.
4. Keep dashboard counts consistent with the full portfolio Schedule.
5. Avoid per-project query loops and unbounded initial rendering.
6. Preserve the accessibility and responsive guarantees of the project
   Schedule.

## Non-goals

- Cross-project dependency edges or one portfolio-wide critical path.
- Cross-project schedule editing, drag rescheduling, baseline capture, or
  calendar administration.
- Automatic resource leveling or inferred labor capacity.
- Replacing the Projects record list.
- Loading every historical closed project by default.

## Information architecture

### Projects navigation

The Projects page keeps its existing record table and receives a labelled
**Portfolio Schedule** action linking to `/app/projects/schedule`.

### Portfolio Schedule

`/app/projects/schedule` is the primary all-project workspace. Its default
scope is projects with status `active`. A manager can include other statuses
through filters.

### Home dashboard

Add a **Schedule attention** section below the existing Needs attention cards:

1. **Overdue tasks** — open tasks whose planned completion or due date is
   before today.
2. **Unscheduled active work** — active-project jobs or open tasks with no
   usable schedule date.
3. **Projects behind baseline** — active projects whose latest baseline has a
   positive project finish variance.
4. **Potential resource overlaps** — normalized people with at least one
   overlapping scheduled range across active projects.

Add an **Upcoming schedule events** card listing the next five project starts,
job starts, task due dates, and project finishes in the next 14 calendar days.

Every card links to `/app/projects/schedule` with the corresponding URL filter.

## Portfolio Schedule controls

All control state is encoded in search parameters:

```text
q
projectStatus
projectManager
state = all | remaining | complete | blocked | overdue | unscheduled
view = work | resources
zoom = week | month
anchor = YYYY-MM-DD
baseline = latest | none
hideCompleted = 1
```

Defaults:

- `projectStatus=active`
- `state=all`
- `view=work`
- `zoom=week`
- `baseline=latest`
- completed rows visible

The page provides:

- Project/name/manager search.
- Project-status and schedule-state filters.
- Project-manager filter.
- Work/Resources switch.
- Week/Month density.
- Previous, Today, and Next window navigation.
- Latest baseline/None comparison.
- Hide completed.
- Expand/collapse by project and job.

## Hierarchy and row behavior

### Project rows

Each project row shows:

- Project name and manager.
- Project schedule state.
- Completed task fraction and percentage, or **No tasks**.
- Job and task counts.
- Earliest scheduled start and latest scheduled finish.
- Latest baseline name and signed finish variance when available.
- Counts for overdue, blocked, unscheduled, critical, and overlap warnings.
- Link to `/app/projects/{projectId}`.

Project rows are expanded by default when ten or fewer projects are visible.
With more than ten, project rows start collapsed. Job expansion follows the
existing project Schedule rule.

### Job and task rows

Job and task bars, milestones, states, warnings, and links follow the existing
project Schedule rules. Critical-path labels are calculated independently per
project. No task is called “portfolio critical.”

### Working calendars

Each project keeps its resolved calendar. Non-working-day shading is applied
within that project's rows. The global date header remains calendar-based so
projects with different calendars still align to the same dates.

### Baselines

`baseline=latest` selects the most recently captured non-deleted baseline for
each project independently. Rows label the baseline name and capture date.
Projects without a baseline show **Not baselined**. Baseline capture and
removal remain project-level actions.

## Resource overlay

The Resources view groups existing:

- Job project manager.
- Job foreman.
- Task assignee.

Names use the existing trim, whitespace-collapse, and case-insensitive grouping
rule. The first stored value remains the display value.

A cross-project **Potential overlap** exists when two ranges assigned to the
same normalized person share a date that both projects treat as a working day.
Due-only milestones remain visible but do not create overlap warnings.

Each resource lane lists source project, role, job/task, dates, overlap state,
and source link. The UI never displays hours, utilization, allocation
percentage, or capacity.

## Schedule-state and portfolio-health rules

Existing task and job state precedence remains unchanged.

Project state is derived in this order:

1. **Complete** when project status is `closed`.
2. **Blocked** when any non-complete job is blocked.
3. **Overdue** when any open task is overdue or any non-complete job is overdue.
4. **Unscheduled** when the project has work but no job/task schedule dates.
5. **Remaining** otherwise.

Project date range is the earliest scheduled job/task start or milestone and
the latest scheduled job/task completion or due date. The system does not
invent project duration when no child dates exist.

Project baseline finish variance compares the current project finish with the
latest baseline's latest job/task finish or due date, using that project's
resolved working calendar.

## Application data contract

```ts
export type PortfolioScheduleProject = {
  id: string;
  name: string;
  status: string;
  projectManager: string | null;
  calendar: ResolvedWorkingCalendar;
  latestBaseline: {
    id: string;
    name: string;
    capturedAt: string;
    items: ProjectScheduleBaselineItem[];
  } | null;
  jobs: ProjectScheduleJob[];
  dependencies: ProjectScheduleDependency[];
};

export type PortfolioScheduleData = {
  projects: PortfolioScheduleProject[];
  truncated: {
    projects: boolean;
    jobs: boolean;
    tasks: boolean;
    dependencies: boolean;
    baselineItems: boolean;
  };
};
```

All dates are serialized by the server. Client components do not receive
Drizzle rows or `Date` objects.

## Query design

The initial request uses bounded set-based reads:

1. Fetch at most 251 matching projects; render 250.
2. Fetch at most 2,001 jobs for those project IDs; render 2,000.
3. Fetch at most 5,001 tasks by joining jobs to the selected projects; render
   5,000.
4. Fetch at most 10,001 dependency edges for the selected projects; render
   10,000.
5. Fetch project calendars and exceptions in one query each.
6. Fetch the latest non-deleted baseline header per project in one query.
7. Fetch at most 5,001 items for those baseline IDs; render 5,000.
8. Group projects, jobs, tasks, dependencies, calendars, and baselines in
   linear application passes.

No query runs once per project. Any exceeded bound produces a visible warning
and disables misleading aggregate counts for the truncated entity type.

Dashboard widgets call the same store projection with active-project scope and
summary-only output. They do not issue independent per-widget schedule reads.

## Components and modules

| Path | Responsibility |
|---|---|
| `src/lib/ops/portfolio-schedule.ts` | Pure project state, ranges, filters, baseline roll-up, portfolio resource projection, and dashboard summaries |
| `src/lib/ops/portfolio-schedule.test.ts` | Portfolio domain and summary tests |
| `src/lib/ops/store.ts` | Bounded database portfolio schedule query |
| `src/lib/ops/demo-store.ts` | Demo adapter with the same data contract |
| `src/lib/ops/demo-store.test.ts` | Bounds, scoping, and adapter behavior |
| `src/components/ops/portfolio-schedule.tsx` | Portfolio controls, hierarchy, timeline, warnings, and table |
| `src/components/ops/portfolio-resource-schedule.tsx` | Cross-project resource lanes and overlap table |
| `src/app/app/projects/schedule/page.tsx` | Authorized server page, URL parsing, serialization, and projection |
| `src/app/app/projects/page.tsx` | Portfolio Schedule entry action |
| `src/app/app/page.tsx` | Schedule attention widgets and upcoming events |
| `src/lib/ops/home.ts` | Existing non-schedule home summary only; portfolio schedule summary remains in its own domain module |

## Accessibility and responsive behavior

- Project and job expand buttons expose `aria-expanded`.
- Every chart fact appears in a semantic table.
- Critical, overdue, blocked, unscheduled, baseline, and overlap states use
  text in addition to color.
- Controls remain keyboard reachable with visible focus.
- At 375px, controls stack, action targets remain at least 44px, and one
  contained horizontal scroller holds the frozen labels and timeline.
- No text is smaller than 12px.
- Dashboard cards expose descriptive labels and counts, not color alone.

## Empty, incomplete, and truncated states

| State | Message/action |
|---|---|
| No active projects | “No active projects have schedule work.” + View all projects |
| Projects but no jobs | Keep project rows visible with **No jobs** |
| No dates | Keep records under **Unscheduled** |
| No resource names | Show the **Unassigned** lane |
| No latest baseline | Show **Not baselined** |
| Filter has no matches | “No portfolio schedule rows match these filters.” + Reset filters |
| Query bound reached | Name the truncated entity and explain that totals are partial |

## Performance requirements

- Projection is linear in projects, jobs, tasks, dependencies, baseline items,
  and resource assignments.
- Collapsed projects do not render job/task rows.
- Collapsed jobs do not render task rows.
- Timeline columns remain bounded to 42 days or six months.
- Resource overlap uses a sorted sweep per normalized person.
- Initial server render performs no client-side fetching.
- The active portfolio remains usable with 250 projects, 2,000 jobs, 5,000
  tasks, and 10,000 dependency edges, with explicit truncation above those
  bounds.

## Test strategy

### Unit

- Project state precedence.
- Project date-range and progress roll-up.
- Latest-baseline selection and project finish variance.
- URL filter semantics and hierarchy preservation.
- Per-project critical-path isolation.
- Cross-project resource normalization and overlap using both calendars.
- Summary counts and 14-day upcoming-event ordering.
- Truncated input suppresses misleading totals.

### Store

- Project/status/manager scope is enforced.
- Jobs, tasks, dependencies, calendars, and baselines do not leak outside the
  selected projects.
- Every entity bound is enforced.
- Database and demo adapters return the same serializable shape.
- Query count does not grow with project count.

### Browser

- Active projects appear by default and other statuses can be included.
- Search, state, manager, view, density, and date-window controls update the
  shareable URL.
- Project/job expansion works by pointer and keyboard.
- Source links reach the project, job, and task.
- Work and Resources tables contain the same facts as their charts.
- Latest baseline labels and per-project critical labels are correct.
- Cross-project overlaps are labelled **Potential overlap**.
- Dashboard cards and upcoming events link to matching filtered results.
- 375px layout has no page-level overflow and keeps 44px targets.

## Delivery phases

### Phase A — Portfolio data and domain

- Add pure portfolio projection and summary rules.
- Add one bounded database/demo data contract.
- Prove project calendar, critical path, baseline, and resource isolation.

### Phase B — Portfolio Schedule workspace

- Add the dedicated route and Projects entry action.
- Build Work and Resources views, filters, hierarchy, tables, and warnings.
- Keep all mutations as drill-through actions.

### Phase C — Dashboard integration and acceptance

- Add schedule attention stat cards and upcoming events.
- Verify count-to-filter consistency.
- Complete desktop, 375px, keyboard, and production-build checks.

## Acceptance criteria

1. Active projects appear by default in one Portfolio Schedule.
2. Managers can include other project statuses and filter by manager or
   schedule state.
3. Every selected project remains visible even when it has no jobs or dates.
4. Project, job, and task hierarchy preserves global project/task progress.
5. Bars, milestones, unscheduled states, warnings, and links remain truthful.
6. Critical paths are calculated and labelled per project, never portfolio-wide.
7. Each project uses its own working calendar and latest baseline.
8. Portfolio schedule mutations drill into the owning project.
9. Resources group normalized names across projects and flag only overlapping
   working dates as **Potential overlap**.
10. Dashboard schedule counts come from the same projection as the full page.
11. Every dashboard widget links to a matching filtered portfolio view.
12. Upcoming events show the next five events within 14 days in chronological
    order.
13. Bounds and partial-result warnings prevent misleading totals.
14. Chart and table facts agree.
15. Desktop, keyboard, and 375px behavior meet the documented accessibility
    requirements.
16. Unit tests, store tests, lint, typecheck, production build, and browser
    checks pass.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Different project calendars make one global workday axis misleading | Keep a calendar-date axis and apply non-working shading per project row |
| One global critical path implies dependencies across projects | Calculate and label critical paths independently per project |
| “Latest baseline” is mistaken for an approved portfolio baseline | Display each baseline name and capture date; do not call it approved |
| Dashboard counts drift from the full page | Derive widgets and page filters from one portfolio projection and test count-to-link parity |
| Large portfolios overload the server or browser | Bounded set queries, collapsed rendering, linear projections, and explicit truncation |
| Resource overlap is mistaken for over-capacity | Use **Potential overlap** and omit hours, utilization, and capacity |
| Cross-project editing applies the wrong calendar or version | Keep portfolio view read-only and drill into the project Schedule for mutations |
