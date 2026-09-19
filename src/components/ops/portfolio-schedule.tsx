"use client";

import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GanttChartIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { PortfolioResourceSchedule } from "@/components/ops/portfolio-resource-schedule";
import { NativeSelect } from "@/components/ops/native-select";
import { StatusBadge } from "@/components/ops/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildPortfolioProjects,
  buildPortfolioResourceLanes,
  buildPortfolioScheduleAssignments,
  countPortfolioAttentionItems,
  filterPortfolioProjects,
  getPortfolioBaselineState,
  getPortfolioJobScheduleState,
  getPortfolioResourceGeometry,
  getPortfolioTaskScheduleState,
  getPortfolioWorkingDayGradient,
  localScheduleDateKey,
  portfolioCalendarDate,
  type PortfolioBaselineState,
  type PortfolioResourceLane,
  type PortfolioScheduleCalendar,
  type PortfolioScheduleData,
  type ProjectedPortfolioProject,
} from "@/lib/ops/portfolio-schedule";
import {
  portfolioScheduleHref,
  type PortfolioScheduleQuery,
} from "@/lib/ops/portfolio-schedule-query";
import {
  createScheduleWindow,
  getTaskProgress,
  isTaskOutsideJobRange,
  moveScheduleAnchor,
  type ProjectScheduleJob,
  type ProjectScheduleTask,
  type ScheduleState,
  type ScheduleWindow,
} from "@/lib/ops/project-schedule";
import {
  calculateBaselineVariance,
  type ResolvedWorkingCalendar,
  type ScheduleDates,
} from "@/lib/ops/project-schedule-planning";
import { JOB_STATUS_LABELS } from "@/lib/ops/jobs";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
} from "@/lib/ops/records";
import { cn } from "@/lib/utils";

export const PORTFOLIO_WORK_PAGE_SIZE = 200;
export const PORTFOLIO_WORK_CONTEXT_OVERHEAD = 2;

const STATE_LABELS: Record<ScheduleState, string> = {
  remaining: "Remaining",
  complete: "Complete",
  blocked: "Blocked",
  overdue: "Overdue",
  unscheduled: "Unscheduled",
};

const STATE_OPTIONS = [
  ["all", "All schedule states"],
  ["remaining", "Remaining"],
  ["complete", "Complete"],
  ["blocked", "Blocked"],
  ["overdue", "Overdue"],
  ["unscheduled", "Unscheduled"],
] as const;

const ATTENTION_OPTIONS = [
  ["all", "All attention states"],
  ["overdue-tasks", "Overdue tasks"],
  ["unscheduled-active-work", "Unscheduled active work"],
  ["behind-baseline", "Behind latest baseline"],
  ["resource-overlap", "Potential resource overlap"],
] as const;

const TRUNCATION_COPY: Array<
  [keyof PortfolioScheduleData["truncation"], string, string]
> = [
  [
    "projects",
    "Project results are partial",
    "The project limit was reached. Project and state totals may be partial.",
  ],
  [
    "jobs",
    "Job results are partial",
    "The job limit was reached. Job and state totals may be partial.",
  ],
  [
    "tasks",
    "Task results are partial",
    "The task limit was reached. Task, progress, and state totals may be partial.",
  ],
  [
    "dependencies",
    "Dependency results are partial",
    "The dependency limit was reached. Critical-path results may be partial.",
  ],
  [
    "calendarExceptions",
    "Calendar exception results are partial",
    "The calendar exception limit was reached. Working-day shading and date calculations may be partial.",
  ],
  [
    "baselineItems",
    "Baseline item results are partial",
    "The baseline item limit was reached. Baseline comparisons may be partial.",
  ],
];

type PortfolioWorkRow = {
  key: string;
  kind: "project" | "job" | "task";
  project: ProjectedPortfolioProject;
  job: ProjectScheduleJob | null;
  task: ProjectScheduleTask | null;
  label: string;
  href: string;
  state: ScheduleState;
  dates: Required<ScheduleDates>;
  progress: ReturnType<typeof getTaskProgress>;
  critical: boolean;
  criticalCount: number | null;
  criticalUnavailable: boolean;
  baselineState: PortfolioBaselineState;
  baselineVariance: ReturnType<typeof calculateBaselineVariance> | null;
  baselinePartial: boolean;
  warning: string;
  context?: true;
};

type PortfolioDisplayCompleteness = {
  baselineItemsComplete: boolean;
  criticalPathComplete: boolean;
};

export function getPortfolioOverlapCounts(
  lanes: readonly PortfolioResourceLane[],
): Map<string, number> {
  const assignmentIdsByProject = new Map<string, Set<string>>();
  for (const lane of lanes) {
    for (const assignment of lane.assignments) {
      if (!assignment.hasPotentialOverlap) continue;
      const assignmentIds =
        assignmentIdsByProject.get(assignment.projectId) ?? new Set<string>();
      assignmentIds.add(assignment.id);
      assignmentIdsByProject.set(assignment.projectId, assignmentIds);
    }
  }
  return new Map(
    [...assignmentIdsByProject.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([projectId, assignmentIds]) => [
        projectId,
        assignmentIds.size,
      ]),
  );
}

export function portfolioControlHref(
  query: PortfolioScheduleQuery,
  patch: Partial<PortfolioScheduleQuery>,
): string {
  return portfolioScheduleHref({ ...query, ...patch });
}

export function applyPortfolioQueryPatch(
  query: PortfolioScheduleQuery,
  patch: Partial<PortfolioScheduleQuery>,
): PortfolioScheduleQuery {
  return { ...query, ...patch };
}

export function reconcilePortfolioOptimisticQuery(
  previousServer: PortfolioScheduleQuery,
  optimistic: PortfolioScheduleQuery,
  nextServer: PortfolioScheduleQuery,
): PortfolioScheduleQuery {
  const next = { ...nextServer };
  for (const key of Object.keys(optimistic) as Array<
    keyof PortfolioScheduleQuery
  >) {
    if (
      optimistic[key] !== previousServer[key] &&
      nextServer[key] === previousServer[key]
    ) {
      Object.assign(next, { [key]: optimistic[key] });
    }
  }
  return next;
}

export function reconcilePortfolioSearchDraft(
  previousServerQ: string,
  draft: string,
  nextServerQ: string,
): string {
  return nextServerQ === previousServerQ ? draft : nextServerQ;
}

export function defaultPortfolioExpansion(
  projects: readonly ProjectedPortfolioProject[] | readonly PortfolioScheduleData["projects"][number][],
): { projects: Set<string>; jobs: Set<string> } {
  return {
    projects: new Set(
      projects.length <= 10 ? projects.map((project) => project.id) : [],
    ),
    jobs: new Set(
      projects.flatMap((project) =>
        project.jobs.length <= 10
          ? project.jobs.map((job) => `${project.id}:${job.id}`)
          : [],
      ),
    ),
  };
}

function normalizedDates(dates: ScheduleDates): Required<ScheduleDates> {
  return {
    plannedStartAt: dates.plannedStartAt ?? null,
    plannedEndAt: dates.plannedEndAt ?? null,
    dueAt: dates.dueAt ?? null,
  };
}

function baselineVariance(
  dates: ScheduleDates,
  baselineState: PortfolioBaselineState,
  calendar: ResolvedWorkingCalendar,
): ReturnType<typeof calculateBaselineVariance> | null {
  if (baselineState.kind !== "scheduled" && baselineState.kind !== "added") {
    return null;
  }
  return calculateBaselineVariance(
    dates,
    baselineState.kind === "scheduled" ? baselineState.dates : null,
    calendar,
  );
}

function taskWarning(
  task: ProjectScheduleTask,
  job: ProjectScheduleJob,
): string {
  if (isTaskOutsideJobRange(task, job)) return "Outside job dates";
  if (!task.plannedStartAt && !task.plannedEndAt && !task.dueAt) {
    return "Unscheduled";
  }
  if (task.plannedStartAt && !task.plannedEndAt) {
    return "Add planned completion";
  }
  if (!task.plannedStartAt && task.plannedEndAt) return "Add planned start";
  return "—";
}

export function buildPortfolioWorkRows(
  projects: readonly ProjectedPortfolioProject[],
  expandedProjects: ReadonlySet<string>,
  expandedJobs: ReadonlySet<string>,
  now: string,
  baseline: "latest" | "none",
  overlapCountsByProject: ReadonlyMap<string, number> = new Map(),
  completeness: PortfolioDisplayCompleteness = {
    baselineItemsComplete: true,
    criticalPathComplete: true,
  },
): PortfolioWorkRow[] {
  return projects.flatMap((project) => {
    const criticalIds = project.criticalTaskIds;
    const baselineItems = new Map(
      (project.latestBaseline?.items ?? []).map((item) => [
        `${item.entityType}:${item.entityId}`,
        item,
      ]),
    );
    const projectBaselineState: PortfolioBaselineState =
      baseline === "none"
        ? { kind: "none" }
        : { kind: "not-baselined" };
    const overlapCount = overlapCountsByProject.get(project.id) ?? 0;
    const warnings = [
      project.warningCounts.blocked
        ? `${project.warningCounts.blocked} blocked`
        : "",
      project.warningCounts.overdue
        ? `${project.warningCounts.overdue} overdue`
        : "",
      project.warningCounts.unscheduled
        ? `${project.warningCounts.unscheduled} unscheduled`
        : "",
      !completeness.criticalPathComplete
        ? "Critical path unavailable—partial data"
        : project.warningCounts.critical
        ? `${project.warningCounts.critical} critical`
        : "",
      overlapCount ? `${overlapCount} potential overlaps` : "",
    ].filter(Boolean);
    const rows: PortfolioWorkRow[] = [
      {
        key: `${project.id}:project`,
        kind: "project",
        project,
        job: null,
        task: null,
        label: project.name,
        href: `/app/projects/${project.id}`,
        state: project.state,
        dates: normalizedDates({
          plannedStartAt: project.range.start,
          plannedEndAt: project.range.finish,
        }),
        progress: project.progress,
        critical: false,
        criticalCount: completeness.criticalPathComplete
          ? project.warningCounts.critical
          : null,
        criticalUnavailable: !completeness.criticalPathComplete,
        baselineState: projectBaselineState,
        baselineVariance: null,
        baselinePartial:
          baseline === "latest" &&
          Boolean(project.latestBaseline) &&
          !completeness.baselineItemsComplete,
        warning: warnings.join(" · ") || "—",
      },
    ];

    if (!expandedProjects.has(project.id)) return rows;

    for (const job of project.jobs) {
      const state = getPortfolioJobScheduleState(
        job,
        now,
        project.calendar,
      );
      const dates = normalizedDates(job);
      const item = baselineItems.get(`job:${job.id}`);
      const stateAtBaseline = getPortfolioBaselineState(
        baseline,
        project.latestBaseline,
        item,
        {
          baselineItemsComplete: completeness.baselineItemsComplete,
        },
      );
      const criticalCount = completeness.criticalPathComplete
        ? job.tasks.filter((task) => criticalIds.has(task.id)).length
        : null;
      rows.push({
        key: `${project.id}:job:${job.id}`,
        kind: "job",
        project,
        job,
        task: null,
        label: `${job.number} · ${job.name}`,
        href: `/app/jobs/${job.id}`,
        state,
        dates,
        progress: getTaskProgress(job.tasks),
        critical: criticalCount !== null && criticalCount > 0,
        criticalCount,
        criticalUnavailable: !completeness.criticalPathComplete,
        baselineState: stateAtBaseline,
        baselineVariance: baselineVariance(
          dates,
          stateAtBaseline,
          project.calendar,
        ),
        baselinePartial:
          baseline === "latest" &&
          Boolean(project.latestBaseline) &&
          !completeness.baselineItemsComplete,
        warning:
          job.tasks.length === 0
            ? "No tasks"
            : !job.plannedStartAt && !job.plannedEndAt
              ? "Unscheduled"
              : !job.plannedStartAt || !job.plannedEndAt
                ? "Add the other planned date"
                : "—",
      });

      if (!expandedJobs.has(`${project.id}:${job.id}`)) continue;
      for (const task of job.tasks) {
        const stateAtBaseline = getPortfolioBaselineState(
          baseline,
          project.latestBaseline,
          baselineItems.get(`task:${task.id}`),
          {
            baselineItemsComplete: completeness.baselineItemsComplete,
          },
        );
        const dates = normalizedDates(task);
        rows.push({
          key: `${project.id}:task:${task.id}`,
          kind: "task",
          project,
          job,
          task,
          label: task.title,
          href: `/app/jobs/${job.id}#task-${task.id}`,
          state: getPortfolioTaskScheduleState(
            task,
            now,
            project.calendar,
          ),
          dates,
          progress: getTaskProgress([task]),
          critical:
            completeness.criticalPathComplete && criticalIds.has(task.id),
          criticalCount: completeness.criticalPathComplete
            ? criticalIds.has(task.id)
              ? 1
              : 0
            : null,
          criticalUnavailable: !completeness.criticalPathComplete,
          baselineState: stateAtBaseline,
          baselineVariance: baselineVariance(
            dates,
            stateAtBaseline,
            project.calendar,
          ),
          baselinePartial:
            baseline === "latest" &&
            Boolean(project.latestBaseline) &&
            !completeness.baselineItemsComplete,
          warning: taskWarning(task, job),
        });
      }
    }
    return rows;
  });
}

export function paginatePortfolioWorkRows(
  rows: readonly PortfolioWorkRow[],
  page: number,
  pageSize = PORTFOLIO_WORK_PAGE_SIZE,
): PortfolioWorkRow[] {
  const start = Math.max(0, page) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  const first = slice[0];
  if (!first || first.kind === "project") return slice;

  const priorRows = rows.slice(0, start);
  const contexts: PortfolioWorkRow[] = [];
  const projectRow = [...priorRows]
    .reverse()
    .find(
      (row) =>
        row.kind === "project" && row.project.id === first.project.id,
    );
  if (projectRow) contexts.push({ ...projectRow, context: true });
  if (first.kind === "task" && first.job) {
    const jobRow = [...priorRows]
      .reverse()
      .find(
        (row) =>
          row.kind === "job" &&
          row.project.id === first.project.id &&
          row.job?.id === first.job?.id,
      );
    if (jobRow) contexts.push({ ...jobRow, context: true });
  }
  return [...contexts.slice(0, PORTFOLIO_WORK_CONTEXT_OVERHEAD), ...slice];
}

function formatDate(
  value: string | null | undefined,
  calendar: PortfolioScheduleCalendar,
): string {
  if (!value) return "—";
  const date = portfolioCalendarDate(value, calendar);
  if (!date) return "—";
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year!, month! - 1, day!)));
}

function dateRangeLabel(
  dates: ScheduleDates,
  calendar: PortfolioScheduleCalendar,
): string {
  if (dates.plannedStartAt && dates.plannedEndAt) {
    return `${formatDate(dates.plannedStartAt, calendar)} – ${formatDate(dates.plannedEndAt, calendar)}`;
  }
  const milestone = dates.plannedStartAt ?? dates.plannedEndAt;
  if (milestone) return `Milestone ${formatDate(milestone, calendar)}`;
  if (dates.dueAt) return `Due ${formatDate(dates.dueAt, calendar)}`;
  return "Unscheduled";
}

function varianceLabel(
  variance: ReturnType<typeof calculateBaselineVariance>,
): string {
  if (variance.state === "added") return "Added since baseline";
  if (variance.state === "removed") return "Removed since baseline";
  if (variance.state === "not-baselined") return "Not baselined";
  if (variance.state === "unchanged") return "No baseline variance";
  const signed = (value: number | null) =>
    value === null ? "not baselined" : `${value > 0 ? "+" : ""}${value}d`;
  return `Start ${signed(variance.startVarianceDays)} · Finish ${signed(variance.finishVarianceDays)}`;
}

function baselineLabel(row: PortfolioWorkRow): string {
  if (row.kind === "project") {
    if (row.baselineState.kind === "none") return "None selected";
    if (!row.project.latestBaseline) return "Not baselined";
    return `${row.project.latestBaseline.name} · ${formatDate(
      row.project.latestBaseline.capturedAt,
      row.project.calendar,
    )}`;
  }
  if (row.baselineState.kind === "none") return "None selected";
  if (row.baselineState.kind === "not-baselined") return "Not baselined";
  if (row.baselineState.kind === "added") return "Added since baseline";
  if (row.baselineState.kind === "unavailable-partial") {
    return "Unavailable—partial data";
  }
  if (row.baselineState.kind === "invalid") return "Invalid baseline date";
  return row.project.latestBaseline
    ? `${row.project.latestBaseline.name} · ${formatDate(
        row.project.latestBaseline.capturedAt,
        row.project.calendar,
      )}`
    : "Not baselined";
}

function rowVarianceLabel(row: PortfolioWorkRow): string {
  if (row.baselinePartial && row.baselineState.kind !== "none") {
    return "Unavailable—partial data";
  }
  if (row.kind === "project") {
    const value = row.project.baselineFinishVarianceDays;
    if (row.baselineState.kind === "none") return "None selected";
    if (!row.project.latestBaseline) return "Not baselined";
    if (value === null) return "Finish variance unavailable";
    if (value === 0) return "No finish variance";
    return `Finish ${value > 0 ? "+" : ""}${value}d`;
  }
  if (row.baselineState.kind === "invalid") return "Invalid baseline date";
  return row.baselineVariance
    ? varianceLabel(row.baselineVariance)
    : baselineLabel(row);
}

function stateVariant(
  state: ScheduleState,
): "default" | "secondary" | "destructive" | "outline" {
  if (state === "complete") return "default";
  if (state === "blocked" || state === "overdue") return "destructive";
  if (state === "remaining") return "secondary";
  return "outline";
}

function TimelineBackdrop({
  row,
  window,
  now,
  gradient,
}: {
  row: PortfolioWorkRow;
  window: ScheduleWindow;
  now: string;
  gradient: string;
}) {
  const today = getPortfolioResourceGeometry(
    { dueAt: now },
    row.project.calendar,
    window,
  );
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: gradient }}
        data-work-backdrop="true"
        aria-hidden="true"
      />
      {today?.kind === "milestone" ? (
        <span
          className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-primary"
          style={{ left: `${today.position}%` }}
          role="img"
          aria-label={`Today, ${formatDate(now, row.project.calendar)}`}
        />
      ) : null}
    </>
  );
}

function TimelineMark({
  row,
  window,
  baseline = false,
}: {
  row: PortfolioWorkRow;
  window: ScheduleWindow;
  baseline?: boolean;
}) {
  const dates =
    baseline && row.baselineState.kind === "scheduled"
      ? row.baselineState.dates
      : row.dates;
  const geometry = getPortfolioResourceGeometry(
    dates,
    row.project.calendar,
    window,
  );
  if (baseline && row.baselineState.kind !== "scheduled") return null;
  if (geometry?.kind === "unscheduled") {
    return baseline ? null : (
      <span className="text-xs font-medium text-muted-foreground">
        Unscheduled
      </span>
    );
  }
  if (!geometry) return null;
  if (geometry.kind === "milestone") {
    if (baseline) {
      return (
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-muted-foreground"
          style={{ left: `${geometry.position}%` }}
          aria-hidden="true"
        />
      );
    }
    return (
      <Link
        href={row.href}
        aria-label={`${row.label}: ${dateRangeLabel(row.dates, row.project.calendar)}`}
        className={cn(
          "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          row.state === "complete"
            ? "border-primary bg-primary"
            : row.state === "blocked" || row.state === "overdue"
              ? "border-destructive bg-destructive"
              : "border-primary bg-card",
        )}
        style={{ left: `${geometry.position}%` }}
      />
    );
  }
  if (baseline) {
    return (
      <span
        className="absolute top-1 h-1 rounded-sm border border-muted-foreground"
        style={{
          left: `${geometry.left}%`,
          width: `${Math.max(geometry.width, 0.8)}%`,
        }}
        aria-hidden="true"
      />
    );
  }
  return (
    <Link
      href={row.href}
      aria-label={`${row.label}: ${dateRangeLabel(row.dates, row.project.calendar)}`}
      className={cn(
        "absolute top-2 bottom-2 overflow-hidden rounded-sm border px-2 text-xs leading-7 whitespace-nowrap before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-full before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        row.state === "complete"
          ? "border-primary bg-primary text-primary-foreground"
          : row.state === "blocked" || row.state === "overdue"
            ? "border-destructive bg-destructive/10 text-destructive"
            : "border-primary/40 bg-primary/15",
        row.critical && "ring-2 ring-destructive ring-offset-1",
      )}
      style={{
        left: `${geometry.left}%`,
        width: `${Math.max(geometry.width, 0.8)}%`,
      }}
    >
      <span className="block overflow-hidden text-ellipsis">
        {STATE_LABELS[row.state]}
      </span>
    </Link>
  );
}

function RowLabel({
  row,
  expandedProjects,
  expandedJobs,
  onToggleProject,
  onToggleJob,
}: {
  row: PortfolioWorkRow;
  expandedProjects: ReadonlySet<string>;
  expandedJobs: ReadonlySet<string>;
  onToggleProject: (id: string) => void;
  onToggleJob: (projectId: string, jobId: string) => void;
}) {
  const projectExpanded = expandedProjects.has(row.project.id);
  const jobExpanded =
    row.job !== null &&
    expandedJobs.has(`${row.project.id}:${row.job.id}`);
  if (row.kind === "project") {
    const project = row.project;
    return (
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="size-11 shrink-0"
          aria-expanded={projectExpanded}
          aria-label={`${projectExpanded ? "Collapse" : "Expand"} project ${project.name}`}
          onClick={() => onToggleProject(project.id)}
        >
          <ChevronDownIcon
            className={cn("transition-transform", !projectExpanded && "-rotate-90")}
            aria-hidden="true"
          />
        </Button>
        <div className="min-w-0 flex-1 py-1">
          <Link
            href={row.href}
            className="inline-flex min-h-11 min-w-11 max-w-full items-center font-medium hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="truncate">{project.name}</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            {project.projectManager ?? "Unassigned"} ·{" "}
            {dateRangeLabel(row.dates, project.calendar)}
          </p>
          <p className="text-xs text-muted-foreground">
            {project.progress.percent === null
              ? "No tasks"
              : `${project.progress.completed}/${project.progress.total} tasks · ${project.progress.percent}%`}
            {" · "}
            {project.jobs.length} {project.jobs.length === 1 ? "job" : "jobs"}
          </p>
          <p className="text-xs text-muted-foreground">
            {baselineLabel(row)} · {rowVarianceLabel(row)}
          </p>
          {row.criticalCount !== null && row.criticalCount > 0 ? (
            <p className="text-xs font-medium text-destructive">
              {row.criticalCount} critical{" "}
              {row.criticalCount === 1 ? "task" : "tasks"}
            </p>
          ) : null}
          {row.warning !== "—" ? (
            <p className="text-xs font-medium text-destructive">
              {row.warning}
            </p>
          ) : null}
          {project.jobs.length === 0 ? (
            <p className="text-xs font-medium">No jobs</p>
          ) : null}
          <Link
            href={`/app/projects/${project.id}#schedule`}
            className="inline-flex min-h-11 min-w-11 items-center text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Open project Schedule
          </Link>
        </div>
        <div className="flex flex-col items-end gap-1 py-1">
          <StatusBadge
            status={project.status}
            label={
              PROJECT_STATUS_LABELS[
                project.status as keyof typeof PROJECT_STATUS_LABELS
              ] ?? project.status
            }
          />
          <Badge variant={stateVariant(row.state)}>
            {STATE_LABELS[row.state]}
          </Badge>
        </div>
      </div>
    );
  }

  if (row.kind === "job" && row.job) {
    return (
      <div className="flex min-w-0 flex-1 items-start gap-2 pl-6">
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="size-11 shrink-0"
          aria-expanded={jobExpanded}
          aria-label={`${jobExpanded ? "Collapse" : "Expand"} job ${row.label}`}
          onClick={() => onToggleJob(row.project.id, row.job!.id)}
        >
          <ChevronDownIcon
            className={cn("transition-transform", !jobExpanded && "-rotate-90")}
            aria-hidden="true"
          />
        </Button>
        <div className="min-w-0 flex-1 py-1">
          <Link
            href={row.href}
            className="inline-flex min-h-11 min-w-11 max-w-full items-center text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="truncate">{row.label}</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            {JOB_STATUS_LABELS[row.job.status]} ·{" "}
            {row.progress.percent === null
              ? "No tasks"
              : `${row.progress.completed}/${row.progress.total} tasks · ${row.progress.percent}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            {baselineLabel(row)} · {rowVarianceLabel(row)}
          </p>
          {row.job.tasks.length === 0 ? (
            <p className="text-xs font-medium">No tasks</p>
          ) : null}
        </div>
        <Badge variant={stateVariant(row.state)}>
          {STATE_LABELS[row.state]}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2 py-1 pl-20">
      <div className="min-w-0 flex-1">
        <Link
          href={row.href}
          className="inline-flex min-h-11 min-w-11 max-w-full items-center text-sm hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="truncate">{row.label}</span>
        </Link>
        <p className="text-xs text-muted-foreground">
          {row.task?.assignee ?? "Unassigned"} ·{" "}
          {dateRangeLabel(row.dates, row.project.calendar)}
        </p>
        <p className="text-xs text-muted-foreground">
          {baselineLabel(row)} · {rowVarianceLabel(row)}
        </p>
        {row.warning !== "—" ? (
          <p className="text-xs font-medium text-destructive">{row.warning}</p>
        ) : null}
      </div>
      {row.criticalUnavailable ? (
        <Badge variant="outline">Critical path unavailable—partial data</Badge>
      ) : row.critical ? (
        <Badge variant="destructive">Critical</Badge>
      ) : null}
      <Badge variant={stateVariant(row.state)}>{STATE_LABELS[row.state]}</Badge>
    </div>
  );
}

function WorkTableRow({ row }: { row: PortfolioWorkRow }) {
  const managerOrAssignee =
    row.kind === "task"
      ? row.task?.assignee ?? "Unassigned"
      : row.kind === "job"
        ? row.job?.projectManager ?? "Unassigned"
      : row.project.projectManager ?? "Unassigned";
  const progress =
    row.progress.percent === null
      ? row.kind === "task"
        ? row.task?.status === "done"
          ? "Complete"
          : "Open"
        : "No tasks"
      : `${row.progress.completed}/${row.progress.total} (${row.progress.percent}%)`;
  return (
    <TableRow
      data-work-row-id={row.key}
      data-context-row={row.context ? "true" : undefined}
    >
      <TableCell className="capitalize">
        {row.kind}
        {row.context ? " (context)" : ""}
      </TableCell>
      <TableCell>
        <Link
          href={`/app/projects/${row.project.id}`}
          className="inline-flex min-h-11 min-w-11 items-center font-medium hover:underline"
        >
          {row.project.name}
        </Link>
      </TableCell>
      <TableCell>
        {row.kind === "project" ? (
          "Portfolio summary"
        ) : (
          <Link
            href={row.href}
            className="inline-flex min-h-11 min-w-11 items-center hover:underline"
          >
            {row.label}
          </Link>
        )}
      </TableCell>
      <TableCell>{STATE_LABELS[row.state]}</TableCell>
      <TableCell>{managerOrAssignee}</TableCell>
      <TableCell>
        {formatDate(row.dates.plannedStartAt, row.project.calendar)}
      </TableCell>
      <TableCell>
        {formatDate(row.dates.plannedEndAt, row.project.calendar)}
      </TableCell>
      <TableCell>{formatDate(row.dates.dueAt, row.project.calendar)}</TableCell>
      <TableCell>{progress}</TableCell>
      <TableCell>
        {row.criticalUnavailable
          ? "Critical path unavailable—partial data"
          : row.kind === "project"
          ? `${row.criticalCount} critical tasks`
          : row.kind === "job"
            ? `${row.criticalCount} critical tasks`
            : row.critical
              ? "Critical"
              : row.dates.plannedStartAt && row.dates.plannedEndAt
                ? "Not critical"
                : "Not calculated — add planned dates"}
      </TableCell>
      <TableCell>{baselineLabel(row)}</TableCell>
      <TableCell>{rowVarianceLabel(row)}</TableCell>
      <TableCell>{row.warning}</TableCell>
    </TableRow>
  );
}

function Controls({
  data,
  query,
  now,
}: {
  data: PortfolioScheduleData;
  query: PortfolioScheduleQuery;
  now: string;
}) {
  const router = useRouter();
  const [optimisticQuery, setOptimisticQuery] = useState(query);
  const optimisticQueryRef = useRef(query);
  const serverQueryRef = useRef(query);
  const [searchDraft, setSearchDraft] = useState(query.q);
  const searchServerQRef = useRef(query.q);
  useEffect(() => {
    const next = reconcilePortfolioOptimisticQuery(
      serverQueryRef.current,
      optimisticQueryRef.current,
      query,
    );
    serverQueryRef.current = query;
    optimisticQueryRef.current = next;
    setOptimisticQuery(next);
    const previousServerQ = searchServerQRef.current;
    searchServerQRef.current = query.q;
    setSearchDraft((current) =>
      reconcilePortfolioSearchDraft(
        previousServerQ,
        current,
        query.q,
      ),
    );
  }, [query]);
  const managers = [
    ...new Set(
      [
        optimisticQuery.projectManager,
        ...data.projects.map((project) => project.projectManager ?? ""),
      ].filter(Boolean),
    ),
  ].sort();
  const navigate = (patch: Partial<PortfolioScheduleQuery>) => {
    const next = applyPortfolioQueryPatch(
      optimisticQueryRef.current,
      patch,
    );
    optimisticQueryRef.current = next;
    setOptimisticQuery(next);
    router.push(portfolioScheduleHref(next), { scroll: false });
  };
  const anchor = optimisticQuery.anchor
    ? new Date(`${optimisticQuery.anchor}T12:00:00`)
    : new Date(now);
  const move = (direction: -1 | 1) => {
    const next = moveScheduleAnchor(
      anchor,
      optimisticQuery.zoom,
      direction,
    );
    navigate({ anchor: localScheduleDateKey(next) });
  };

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ q: searchDraft });
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <form
        action="/app/projects/schedule"
        method="get"
        className="flex flex-wrap items-end gap-2"
        onSubmit={submitSearch}
      >
        <label className="grid min-w-56 flex-1 gap-1 text-xs font-medium">
          <span>Search projects</span>
          <Input
            name="q"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Project or manager"
            className="h-11"
          />
        </label>
        <Button type="submit" className="min-h-11">
          Search
        </Button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-xs font-medium">
          <span>Project status</span>
          <NativeSelect
            aria-label="Project status"
            className="h-11"
            value={optimisticQuery.projectStatus}
            onChange={(event) =>
              navigate({ projectStatus: event.target.value })
            }
          >
            <option value="all">All statuses</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          <span>Manager</span>
          <NativeSelect
            aria-label="Project manager"
            className="h-11"
            value={optimisticQuery.projectManager}
            onChange={(event) =>
              navigate({ projectManager: event.target.value })
            }
          >
            <option value="">All managers</option>
            {managers.map((manager) => (
              <option key={manager} value={manager}>
                {manager}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          <span>Schedule state</span>
          <NativeSelect
            aria-label="Schedule state"
            className="h-11"
            value={optimisticQuery.state}
            onChange={(event) =>
              navigate({
                state: event.target
                  .value as PortfolioScheduleQuery["state"],
              })
            }
          >
            {STATE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          <span>Attention</span>
          <NativeSelect
            aria-label="Attention"
            className="h-11"
            value={optimisticQuery.attention}
            onChange={(event) =>
              navigate({
                attention: event.target
                  .value as PortfolioScheduleQuery["attention"],
              })
            }
          >
            {ATTENTION_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-h-11 items-center rounded-lg border p-1">
          {(["work", "resources"] as const).map((view) => (
            <Button
              key={view}
              type="button"
              variant={optimisticQuery.view === view ? "secondary" : "ghost"}
              aria-pressed={optimisticQuery.view === view}
              className="min-h-11"
              onClick={() => navigate({ view })}
            >
              {view === "work" ? "Work" : "Resources"}
            </Button>
          ))}
        </div>
        <div className="flex min-h-11 items-center rounded-lg border p-1">
          {(["week", "month"] as const).map((zoom) => (
            <Button
              key={zoom}
              type="button"
              variant={optimisticQuery.zoom === zoom ? "secondary" : "ghost"}
              aria-pressed={optimisticQuery.zoom === zoom}
              className="min-h-11"
              onClick={() => navigate({ zoom })}
            >
              {zoom === "week" ? "Week" : "Month"}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11"
          aria-label="Previous schedule window"
          onClick={() => move(-1)}
        >
          <ChevronLeftIcon aria-hidden="true" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => navigate({ anchor: null })}
        >
          Today
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11"
          aria-label="Next schedule window"
          onClick={() => move(1)}
        >
          Next
          <ChevronRightIcon aria-hidden="true" />
        </Button>
        <label className="grid gap-1 text-xs font-medium">
          <span>Baseline</span>
          <NativeSelect
            aria-label="Baseline"
            className="h-11 min-w-40"
            value={optimisticQuery.baseline}
            onChange={(event) =>
              navigate({
                baseline: event.target
                  .value as PortfolioScheduleQuery["baseline"],
              })
            }
          >
            <option value="latest">Latest baseline</option>
            <option value="none">None</option>
          </NativeSelect>
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm">
          <input
            type="checkbox"
            checked={optimisticQuery.hideCompleted}
            onChange={(event) =>
              navigate({ hideCompleted: event.target.checked })
            }
            className="size-4 accent-primary"
          />
          Hide completed
        </label>
        <label className="grid gap-1 text-xs font-medium">
          <span>From</span>
          <Input
            type="date"
            aria-label="From date"
            className="h-11 w-40"
            value={optimisticQuery.from ?? ""}
            onChange={(event) =>
              navigate({ from: event.target.value || null })
            }
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          <span>To</span>
          <Input
            type="date"
            aria-label="To date"
            className="h-11 w-40"
            value={optimisticQuery.to ?? ""}
            onChange={(event) =>
              navigate({ to: event.target.value || null })
            }
          />
        </label>
        <Button
          render={<Link href={portfolioScheduleHref({})} />}
          nativeButton={false}
          variant="outline"
          className="min-h-11"
        >
          Reset filters
        </Button>
      </div>
    </div>
  );
}

export function PortfolioSchedule({
  data,
  query,
  now,
}: {
  data: PortfolioScheduleData;
  query: PortfolioScheduleQuery;
  now: string;
}) {
  const projected = useMemo(
    () => buildPortfolioProjects(data.projects, new Date(now)),
    [data.projects, now],
  );
  const resourceLanes = useMemo(
    () =>
      buildPortfolioResourceLanes(
        buildPortfolioScheduleAssignments(projected),
      ),
    [projected],
  );
  const overlapProjectIds = useMemo(
    () =>
      new Set(
        resourceLanes.flatMap((lane) =>
          lane.assignments
            .filter((assignment) => assignment.hasPotentialOverlap)
            .map((assignment) => assignment.projectId),
        ),
      ),
    [resourceLanes],
  );
  const overlapCountsByProject = useMemo(
    () => getPortfolioOverlapCounts(resourceLanes),
    [resourceLanes],
  );
  const visibleProjects = useMemo(
    () =>
      filterPortfolioProjects(
        projected,
        {
          state: query.state,
          attention: query.attention,
          from: query.from,
          to: query.to,
          hideCompleted: query.hideCompleted,
          overlapProjectIds,
          baselineItemsComplete: !data.truncation.baselineItems,
        },
        new Date(now),
      ),
    [
      projected,
      query.state,
      query.attention,
      query.from,
      query.to,
      query.hideCompleted,
      overlapProjectIds,
      data.truncation.baselineItems,
      now,
    ],
  );
  const visibleKey = visibleProjects
    .map((project) => `${project.id}:${project.jobs.map((job) => job.id).join(",")}`)
    .join("|");
  const paginationFilterKey = JSON.stringify({
    q: query.q,
    projectStatus: query.projectStatus,
    projectManager: query.projectManager,
    state: query.state,
    attention: query.attention,
    from: query.from,
    to: query.to,
    hideCompleted: query.hideCompleted,
  });
  const initialExpansion = () => defaultPortfolioExpansion(visibleProjects);
  const [expandedProjects, setExpandedProjects] = useState(
    () => initialExpansion().projects,
  );
  const [expandedJobs, setExpandedJobs] = useState(
    () => initialExpansion().jobs,
  );
  useEffect(() => {
    const next = defaultPortfolioExpansion(visibleProjects);
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setExpandedProjects(next.projects);
        setExpandedJobs(next.jobs);
      }
    });
    return () => {
      cancelled = true;
    };
    // The deterministic collection key intentionally resets disclosure state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  const rows = useMemo(
    () =>
      buildPortfolioWorkRows(
        visibleProjects,
        expandedProjects,
        expandedJobs,
        now,
        query.baseline,
        overlapCountsByProject,
        {
          baselineItemsComplete: !data.truncation.baselineItems,
          criticalPathComplete:
            !data.truncation.tasks && !data.truncation.dependencies,
        },
      ),
    [
      visibleProjects,
      expandedProjects,
      expandedJobs,
      now,
      query.baseline,
      overlapCountsByProject,
      data.truncation.baselineItems,
      data.truncation.tasks,
      data.truncation.dependencies,
    ],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(rows.length / PORTFOLIO_WORK_PAGE_SIZE),
  );
  const [requestedPage, setRequestedPage] = useState(0);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setRequestedPage(0);
    });
    return () => {
      cancelled = true;
    };
  }, [data, paginationFilterKey]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setRequestedPage((current) =>
          Math.min(current, pageCount - 1),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pageCount]);
  const page = Math.min(requestedPage, pageCount - 1);
  const pageRows = useMemo(
    () => paginatePortfolioWorkRows(rows, page),
    [rows, page],
  );
  const firstVisible =
    rows.length === 0 ? 0 : page * PORTFOLIO_WORK_PAGE_SIZE + 1;
  const lastVisible = Math.min(
    rows.length,
    (page + 1) * PORTFOLIO_WORK_PAGE_SIZE,
  );
  const [tableOpen, setTableOpen] = useState(false);
  const tableId = useId();
  const anchor = query.anchor
    ? new Date(`${query.anchor}T12:00:00`)
    : new Date(now);
  const window = createScheduleWindow(query.zoom, anchor);
  const gradients = new Map<PortfolioScheduleCalendar, string>();
  const gradientFor = (calendar: PortfolioScheduleCalendar) => {
    const current = gradients.get(calendar);
    if (current) return current;
    const next = getPortfolioWorkingDayGradient(window, calendar);
    gradients.set(calendar, next);
    return next;
  };
  const totals = visibleProjects.reduce(
    (result, project) => ({
      projects: result.projects + 1,
      jobs: result.jobs + project.jobs.length,
      tasks:
        result.tasks +
        project.jobs.reduce((count, job) => count + job.tasks.length, 0),
    }),
    { projects: 0, jobs: 0, tasks: 0 },
  );
  const partial = (value: number, flag: boolean) =>
    `${value}${flag ? " (partial)" : ""}`;
  const matchingAttentionItems =
    query.attention === "overdue-tasks" ||
    query.attention === "unscheduled-active-work"
      ? countPortfolioAttentionItems(
          visibleProjects,
          query.attention,
          new Date(now),
        )
      : null;
  const matchingAttentionPartial =
    matchingAttentionItems !== null &&
    (data.truncation.projects ||
      data.truncation.jobs ||
      data.truncation.tasks);
  const unscheduled = visibleProjects
    .flatMap((project) => {
      const entries: string[] = [];
      if (project.jobs.length === 0) {
        entries.push(`${project.name} — No jobs`);
      } else if (!project.range.start && !project.range.finish) {
        entries.push(`${project.name} — No scheduled dates`);
      }
      for (const job of project.jobs) {
        if (job.tasks.length === 0) {
          entries.push(`${project.name} · ${job.number} — No tasks`);
        }
        if (!job.plannedStartAt && !job.plannedEndAt) {
          entries.push(`${project.name} · ${job.number} — Unscheduled job`);
        }
        for (const task of job.tasks) {
          if (!task.plannedStartAt && !task.plannedEndAt && !task.dueAt) {
            entries.push(
              `${project.name} · ${job.number} · ${task.title} — Unscheduled task`,
            );
          }
        }
      }
      return entries;
    });
  const boundedUnscheduled = unscheduled.slice(0, 50);
  const defaultActiveEmpty =
    data.projects.length === 0 &&
    query.projectStatus === "active" &&
    !query.q &&
    !query.projectManager;
  const behindBaselineUnavailable =
    query.attention === "behind-baseline" &&
    data.truncation.baselineItems;

  function toggleProject(id: string) {
    setExpandedProjects((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleJob(projectId: string, jobId: string) {
    const key = `${projectId}:${jobId}`;
    setExpandedJobs((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {TRUNCATION_COPY.map(([flag, title, description]) =>
        data.truncation[flag] ? (
          <Alert key={flag}>
            <AlertTriangleIcon aria-hidden="true" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
          </Alert>
        ) : null,
      )}

      <Controls data={data} query={query} now={now} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium" aria-live="polite">
          {partial(totals.projects, data.truncation.projects)} projects ·{" "}
          {partial(totals.jobs, data.truncation.jobs)} jobs ·{" "}
          {partial(totals.tasks, data.truncation.tasks)} tasks
          {data.truncation.tasks ? " · Partial task count" : ""}
          {matchingAttentionItems === null
            ? ""
            : ` · ${matchingAttentionItems} matching attention items${matchingAttentionPartial ? " (partial)" : ""}`}
        </p>
        {visibleProjects.length > 0 &&
        visibleProjects.every(
          (project) => !project.range.start && !project.range.finish,
        ) ? (
          <Badge variant="outline">No scheduled dates</Badge>
        ) : null}
      </div>

      {behindBaselineUnavailable ? (
        <div
          className="rounded-lg border border-dashed px-4 py-10 text-center"
          role="status"
        >
          <p className="font-medium">
            Behind-baseline filter unavailable—partial baseline data.
          </p>
        </div>
      ) : defaultActiveEmpty ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center">
          <GanttChartIcon className="mx-auto mb-3 size-8" aria-hidden="true" />
          <p className="font-medium">No active projects have schedule work.</p>
          <Button
            render={
              <Link
                href={portfolioControlHref(query, {
                  projectStatus: "all",
                })}
              />
            }
            nativeButton={false}
            variant="outline"
            className="mt-3 min-h-11 min-w-11"
          >
            View all projects
          </Button>
        </div>
      ) : data.projects.length === 0 || visibleProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center">
          <p className="font-medium">
            No portfolio schedule rows match these filters.
          </p>
          <Button
            render={<Link href={portfolioScheduleHref({})} />}
            nativeButton={false}
            variant="link"
            className="mt-2 min-h-11"
          >
            Reset filters
          </Button>
        </div>
      ) : query.view === "resources" ? (
        <PortfolioResourceSchedule
          projects={visibleProjects}
          resourceLanes={resourceLanes}
          window={window}
          now={now}
          baseline={query.baseline}
          baselineItemsTruncated={data.truncation.baselineItems}
          showOnlyOverlappingAssignments={
            query.attention === "resource-overlap"
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <p className="text-sm" aria-live="polite">
              Showing {firstVisible}–{lastVisible} of {rows.length} rows
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 min-w-11"
                aria-label="Previous work rows page"
                disabled={page === 0}
                onClick={() => setRequestedPage(Math.max(0, page - 1))}
              >
                Previous
              </Button>
              <span className="min-w-20 text-center text-sm">
                Page {page + 1} of {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 min-w-11"
                aria-label="Next work rows page"
                disabled={page >= pageCount - 1}
                onClick={() =>
                  setRequestedPage(Math.min(pageCount - 1, page + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>

          <div
            className="overflow-x-auto rounded-lg border"
            data-portfolio-chart-scroller="true"
          >
            <div className="min-w-[72rem]">
              <div className="grid min-h-14 grid-cols-[minmax(18rem,24rem)_minmax(48rem,1fr)]">
                <div className="sticky left-0 z-30 flex items-end border-r bg-muted/60 px-3 py-2 text-sm font-medium">
                  Project → Job → Task
                </div>
                <div
                  className="grid bg-muted/60"
                  style={{
                    gridTemplateColumns: `repeat(${window.columns.length}, minmax(0, 1fr))`,
                  }}
                >
                  {(window.columns.length === 42
                    ? window.columns.filter((_, index) => index % 7 === 0)
                    : window.columns
                  ).map((column) => (
                    <div
                      key={column.key}
                      className="flex items-end border-l px-1 py-2 text-xs font-medium first:border-l-0"
                      style={
                        window.columns.length === 42
                          ? { gridColumn: "span 7" }
                          : undefined
                      }
                    >
                      {window.columns.length === 42
                        ? `Week of ${column.label}`
                        : column.label}
                    </div>
                  ))}
                </div>
              </div>

              {pageRows.map((row) => (
                <div
                  key={row.key}
                  data-work-row-id={row.key}
                  data-context-row={row.context ? "true" : undefined}
                  className={cn(
                    "grid min-h-14 grid-cols-[minmax(18rem,24rem)_minmax(48rem,1fr)] border-t",
                    row.kind === "project" && "bg-muted/10",
                  )}
                >
                  <div className="sticky left-0 z-20 flex min-w-0 items-center border-r bg-card px-2 py-1">
                    {row.context ? (
                      <Badge variant="outline" className="mr-1 shrink-0">
                        Context
                      </Badge>
                    ) : null}
                    <RowLabel
                      row={row}
                      expandedProjects={expandedProjects}
                      expandedJobs={expandedJobs}
                      onToggleProject={toggleProject}
                      onToggleJob={toggleJob}
                    />
                  </div>
                  <div className="relative flex min-h-14 items-center">
                    <TimelineBackdrop
                      row={row}
                      window={window}
                      now={now}
                      gradient={gradientFor(row.project.calendar)}
                    />
                    <div className="relative z-10 min-w-0 flex-1">
                      <TimelineMark row={row} window={window} baseline />
                      <TimelineMark row={row} window={window} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="rounded-lg border">
            <button
              type="button"
              aria-expanded={tableOpen}
              aria-controls={tableOpen ? tableId : undefined}
              aria-label="Toggle current work page table"
              className="flex min-h-11 min-w-11 w-full items-center px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => setTableOpen((open) => !open)}
            >
              {tableOpen ? "Hide" : "View"} current work page as table
            </button>
            {tableOpen ? (
              <div id={tableId} className="overflow-x-auto border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Job / task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Manager / assignee</TableHead>
                      <TableHead>Planned start</TableHead>
                      <TableHead>Planned completion</TableHead>
                      <TableHead>Due date</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Critical path</TableHead>
                      <TableHead>Latest baseline</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Warning</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((row) => (
                      <WorkTableRow key={row.key} row={row} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </section>
        </>
      )}

      {unscheduled.length > 0 ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-medium">Unscheduled work</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Items without enough dates to place truthfully on the timeline.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {boundedUnscheduled.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ul>
          {unscheduled.length > boundedUnscheduled.length ? (
            <p className="mt-2 text-sm text-muted-foreground">
              And {unscheduled.length - boundedUnscheduled.length} more
              unscheduled items.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
