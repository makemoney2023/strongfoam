"use client";

import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
  GripVerticalIcon,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NativeSelect } from "@/components/ops/native-select";
import { ScheduleBaselineControls } from "@/components/ops/schedule-baseline-controls";
import { ScheduleCalendarDialog } from "@/components/ops/schedule-calendar-dialog";
import { ProjectResourceSchedule } from "@/components/ops/project-resource-schedule";
import {
  ScheduleRescheduleDialog,
  type ReschedulePreview,
} from "@/components/ops/schedule-reschedule-dialog";
import { TaskDependencyEditor } from "@/components/ops/task-dependency-editor";
import {
  SCHEDULE_FILTERS,
  createScheduleWindow,
  filterScheduleJobs,
  getJobScheduleState,
  getTaskGeometry,
  getTaskProgress,
  getTaskScheduleState,
  hideCompletedScheduleRows,
  isTaskOutsideJobRange,
  moveScheduleAnchor,
  positionInWindow,
  shiftScheduleDates,
  type ProjectScheduleJob,
  type ProjectScheduleBaseline,
  type ProjectScheduleBaselineItem,
  type ProjectScheduleDependency,
  type ProjectScheduleTask,
  type ScheduleFilter,
  type ScheduleState,
  type ScheduleWindow,
  type ScheduleZoom,
} from "@/lib/ops/project-schedule";
import {
  calculateCriticalPath,
  validateDependencyDates,
} from "@/lib/ops/project-schedule-graph";
import {
  calculateBaselineVariance,
  type ResolvedWorkingCalendar,
} from "@/lib/ops/project-schedule-planning";
import { JOB_STATUS_LABELS } from "@/lib/ops/jobs";
import { cn } from "@/lib/utils";

const FILTER_LABELS: Record<ScheduleFilter, string> = {
  all: "All work",
  remaining: "Remaining",
  complete: "Complete",
  blocked: "Blocked",
  overdue: "Overdue",
  unscheduled: "Unscheduled",
};

const STATE_LABELS: Record<ScheduleState, string> = {
  remaining: "Remaining",
  complete: "Complete",
  blocked: "Blocked",
  overdue: "Overdue",
  unscheduled: "Unscheduled",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(parsed);
}

function statusVariant(
  state: ScheduleState,
): "default" | "secondary" | "destructive" | "outline" {
  if (state === "complete") return "default";
  if (state === "blocked" || state === "overdue") return "destructive";
  if (state === "remaining") return "secondary";
  return "outline";
}

function StatusGlyph({ state }: { state: ScheduleState }) {
  if (state === "complete") {
    return <CheckCircle2Icon className="size-4 text-primary" aria-hidden="true" />;
  }
  if (state === "blocked" || state === "overdue") {
    return (
      <AlertTriangleIcon
        className="size-4 text-destructive"
        aria-hidden="true"
      />
    );
  }
  return <CircleIcon className="size-4 text-muted-foreground" aria-hidden="true" />;
}

function dateRangeLabel(start: string | null, end: string | null): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `Starts ${formatDate(start)}`;
  if (end) return `Ends ${formatDate(end)}`;
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

function timelinePosition(
  value: string,
  window: ScheduleWindow,
): number | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed < window.start) return 0;
  if (parsed > window.end) return 100;
  return positionInWindow(parsed, window);
}

function RangeMark({
  href,
  label,
  start,
  end,
  window,
  state,
  critical = false,
  highlightCritical = false,
  baseline = false,
}: {
  href: string;
  label: string;
  start: string | null;
  end: string | null;
  window: ScheduleWindow;
  state: ScheduleState;
  critical?: boolean;
  highlightCritical?: boolean;
  baseline?: boolean;
}) {
  if (!start && !end) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        Unscheduled
      </span>
    );
  }

  if (!start || !end) {
    const value = start ?? end;
    const position = value ? positionInWindow(value, window) : null;
    if (position === null) return null;
    return (
      <Link
        href={href}
        aria-label={`${label}: ${dateRangeLabel(start, end)}`}
        className={cn(
          "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          baseline && "size-4 border-muted-foreground bg-transparent",
          critical && highlightCritical && "ring-2 ring-destructive ring-offset-2",
          baseline
            ? "border-muted-foreground bg-transparent"
            : state === "complete"
              ? "border-primary bg-primary"
              : state === "blocked" || state === "overdue"
                ? "border-destructive bg-destructive"
                : "border-primary bg-card",
        )}
        style={{ left: `${position}%` }}
        data-critical={critical ? "true" : undefined}
      />
    );
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate < window.start ||
    startDate > window.end
  ) {
    return null;
  }
  const left = timelinePosition(start, window) ?? 0;
  const right = timelinePosition(end, window) ?? 100;
  const width = Math.max(right - left, 0.8);

  return (
    <Link
      href={href}
      aria-label={`${label}: ${dateRangeLabel(start, end)}`}
      className={cn(
        "absolute top-2 bottom-2 overflow-hidden rounded-sm border px-2 text-xs leading-7 font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        baseline &&
          "top-1 bottom-auto h-1 border-muted-foreground bg-transparent p-0 text-transparent",
        critical && highlightCritical && "ring-2 ring-destructive ring-offset-1",
        baseline
          ? "border-muted-foreground bg-transparent text-transparent"
          : state === "complete"
            ? "border-primary bg-primary text-primary-foreground"
            : state === "blocked" || state === "overdue"
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-primary/40 bg-primary/15 text-foreground",
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={dateRangeLabel(start, end)}
      data-critical={critical ? "true" : undefined}
    >
      {STATE_LABELS[state]}
    </Link>
  );
}

function TaskMark({
  task,
  window,
  state,
  critical,
  highlightCritical,
}: {
  task: ProjectScheduleTask;
  window: ScheduleWindow;
  state: ScheduleState;
  critical: boolean;
  highlightCritical: boolean;
}) {
  const href = `/app/jobs/${task.jobId}#task-${task.id}`;
  const geometry = getTaskGeometry(task);
  if (geometry.kind === "bar") {
    return (
      <RangeMark
        href={href}
        label={task.title}
        start={geometry.start}
        end={geometry.end}
        window={window}
        state={state}
        critical={critical}
        highlightCritical={highlightCritical}
      />
    );
  }
  if (geometry.kind === "unscheduled") {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        Unscheduled
      </span>
    );
  }
  const position = positionInWindow(geometry.date, window);
  if (position === null) return null;
  const sourceLabel = geometry.source === "due" ? "Due" : "Planned";
  return (
    <Link
      href={href}
      aria-label={`${task.title}: ${sourceLabel.toLowerCase()} ${formatDate(geometry.date)}`}
      className={cn(
        "absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs font-medium focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        critical && highlightCritical && "rounded-sm ring-2 ring-destructive",
        state === "complete"
          ? "text-primary"
          : state === "overdue"
            ? "text-destructive"
            : "text-foreground",
      )}
      style={{ left: `${position}%` }}
      title={`${sourceLabel} ${formatDate(geometry.date)}`}
      data-critical={critical ? "true" : undefined}
    >
      <span
        className={cn(
          "size-3 shrink-0 -translate-x-1/2 rotate-45 border",
          state === "complete"
            ? "border-primary bg-primary"
            : state === "overdue"
              ? "border-destructive bg-destructive"
              : "border-primary bg-card",
        )}
        aria-hidden="true"
      />
      <span className="-translate-x-1.5 rounded-sm bg-card/90 px-1">
        {sourceLabel}
      </span>
    </Link>
  );
}

function TimelineBackdrop({
  window,
  today,
}: {
  window: ScheduleWindow;
  today: Date;
}) {
  const todayPosition = positionInWindow(today, window);
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${window.columns.length}, minmax(0, 1fr))`,
        }}
        aria-hidden="true"
      >
        {window.columns.map((column) => (
          <span key={column.key} className="border-l first:border-l-0" />
        ))}
      </div>
      {todayPosition !== null ? (
        <span
          className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-primary"
          style={{ left: `${todayPosition}%` }}
          role="img"
          aria-label={`Today, ${formatDate(today.toISOString())}`}
        />
      ) : null}
    </>
  );
}

function ScheduleDragGrip({
  position,
  window,
  label,
  onShift,
}: {
  position: number | null;
  window: ScheduleWindow;
  label: string;
  onShift: (deltaDays: number) => void;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  if (position === null) return null;
  const daySpan = Math.max(
    1,
    Math.round(
      (window.end.getTime() - window.start.getTime()) / 86_400_000,
    ),
  );
  return (
    <button
      type="button"
      className="absolute top-1/2 z-20 flex size-7 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      style={{ left: `${position}%` }}
      aria-label={`Drag to reschedule ${label}`}
      aria-describedby="schedule-drag-instructions"
      onPointerDown={(event) => {
        const row = event.currentTarget.closest<HTMLElement>(
          "[data-timeline-row]",
        );
        drag.current = {
          x: event.clientX,
          width: row?.clientWidth ?? 1,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => {
        if (!drag.current) return;
        const deltaPixels = event.clientX - drag.current.x;
        const deltaDays = Math.round(
          (deltaPixels / drag.current.width) * daySpan,
        );
        drag.current = null;
        if (deltaDays !== 0) onShift(deltaDays);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") drag.current = null;
      }}
    >
      <GripVerticalIcon aria-hidden="true" />
    </button>
  );
}

function ChartRow({
  label,
  children,
  className,
  window,
  today,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  window: ScheduleWindow;
  today: Date;
}) {
  return (
    <div
      className={cn(
        "grid min-h-11 grid-cols-[minmax(16rem,22rem)_minmax(48rem,1fr)] border-t",
        className,
      )}
    >
      <div className="sticky left-0 z-20 flex min-w-0 items-center border-r bg-card px-3 py-2">
        {label}
      </div>
      <div
        className="relative flex min-h-11 items-center px-2"
        data-timeline-row
      >
        <TimelineBackdrop window={window} today={today} />
        <div className="relative z-10 min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function ProjectSchedule({
  projectId,
  jobs,
  dependencies,
  baselines,
  selectedBaselineId,
  selectedBaselineItems,
  calendar,
  now,
  truncated = false,
  dependenciesTruncated = false,
  returnTo,
}: {
  projectId: string;
  jobs: ProjectScheduleJob[];
  dependencies: ProjectScheduleDependency[];
  baselines: ProjectScheduleBaseline[];
  selectedBaselineId: string | null;
  selectedBaselineItems: ProjectScheduleBaselineItem[];
  calendar: ResolvedWorkingCalendar & {
    id: string;
    name: string;
    updatedAt: string;
    updatedBy: string;
  };
  now: string;
  truncated?: boolean;
  dependenciesTruncated?: boolean;
  returnTo: string;
}) {
  const [zoom, setZoom] = useState<ScheduleZoom>("week");
  const [view, setView] = useState<"work" | "resources">("work");
  const [filter, setFilter] = useState<ScheduleFilter>("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [highlightCritical, setHighlightCritical] = useState(true);
  const [reschedulePreview, setReschedulePreview] =
    useState<ReschedulePreview | null>(null);
  const [anchor, setAnchor] = useState(() => new Date(now));
  const [expanded, setExpanded] = useState(
    () => new Set(jobs.length <= 10 ? jobs.map((job) => job.id) : []),
  );

  const today = new Date(now);
  const window = createScheduleWindow(zoom, anchor);
  const filteredJobs = filterScheduleJobs(jobs, filter, today);
  const visibleJobs = hideCompleted
    ? hideCompletedScheduleRows(filteredJobs)
    : filteredJobs;
  const projectProgress = getTaskProgress(jobs.flatMap((job) => job.tasks));
  const allTasks = jobs.flatMap((job) => job.tasks);
  const criticalPath = calculateCriticalPath(allTasks, dependencies, calendar);
  const baselineByEntity = new Map(
    selectedBaselineItems.map((item) => [
      `${item.entityType}:${item.entityId}`,
      item,
    ]),
  );
  const currentEntityKeys = new Set([
    ...jobs.map((job) => `job:${job.id}`),
    ...allTasks.map((task) => `task:${task.id}`),
  ]);
  const removedBaselineItems = selectedBaselineItems.filter(
    (item) => !currentEntityKeys.has(`${item.entityType}:${item.entityId}`),
  );
  const taskOptions = jobs.flatMap((job) =>
    job.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      jobNumber: job.number,
    })),
  );
  const taskOptionById = new Map(
    taskOptions.map((option) => [option.id, option]),
  );
  const incomingByTask = new Map<string, ProjectScheduleDependency[]>();
  for (const edge of dependencies) {
    const bucket = incomingByTask.get(edge.successorTaskId) ?? [];
    bucket.push(edge);
    incomingByTask.set(edge.successorTaskId, bucket);
  }

  function toggleJob(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function proposeJobReschedule(
    job: ProjectScheduleJob,
    deltaDays = 0,
  ) {
    const before = {
      plannedStartAt: job.plannedStartAt,
      plannedEndAt: job.plannedEndAt,
      dueAt: null,
    };
    setReschedulePreview({
      entityType: "job",
      entityId: job.id,
      jobId: job.id,
      label: `${job.number} · ${job.name}`,
      expectedUpdatedAt: job.updatedAt ?? now,
      before,
      after: shiftScheduleDates(before, deltaDays, calendar),
      warnings: [
        "Attached task dates do not move automatically with the job.",
      ],
    });
  }

  function proposeTaskReschedule(
    task: ProjectScheduleTask,
    job: ProjectScheduleJob,
    deltaDays = 0,
  ) {
    const before = {
      plannedStartAt: task.plannedStartAt,
      plannedEndAt: task.plannedEndAt,
      dueAt: task.dueAt,
    };
    const after = shiftScheduleDates(before, deltaDays, calendar);
    const warnings: string[] = [];
    if (isTaskOutsideJobRange(after, job)) {
      warnings.push("The proposed task dates fall outside the parent job dates.");
    }
    const dependencyValidation = validateDependencyDates(
      allTasks.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        plannedStartAt:
          candidate.id === task.id
            ? after.plannedStartAt
            : candidate.plannedStartAt,
        plannedEndAt:
          candidate.id === task.id
            ? after.plannedEndAt
            : candidate.plannedEndAt,
      })),
      dependencies,
      calendar,
    );
    if (!dependencyValidation.ok) warnings.push(dependencyValidation.error);
    setReschedulePreview({
      entityType: "task",
      entityId: task.id,
      jobId: job.id,
      label: task.title,
      expectedUpdatedAt: task.updatedAt ?? now,
      before,
      after,
      warnings,
    });
  }

  return (
    <div className="space-y-4">
      {truncated ? (
        <Alert>
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>Schedule task limit reached</AlertTitle>
          <AlertDescription>
            Only the first 1,000 tasks are shown. Narrow this project or review
            jobs individually for the remaining tasks.
          </AlertDescription>
        </Alert>
      ) : null}
      {dependenciesTruncated ? (
        <Alert>
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>Schedule dependency limit reached</AlertTitle>
          <AlertDescription>
            Only the first 2,000 dependencies are shown. Review project scope
            before making additional schedule changes.
          </AlertDescription>
        </Alert>
      ) : null}
      {!criticalPath.ok ? (
        <Alert variant="destructive">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>Critical path is unavailable</AlertTitle>
          <AlertDescription>{criticalPath.error}</AlertDescription>
        </Alert>
      ) : null}
      <p id="schedule-drag-instructions" className="sr-only">
        Drag to propose new dates. Saving requires confirmation.
      </p>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-56 space-y-2">
          <p className="font-medium">
            {projectProgress.percent === null
              ? "No tasks"
              : `${projectProgress.completed} / ${projectProgress.total} tasks complete`}
          </p>
          {projectProgress.percent !== null ? (
            <Progress
              value={projectProgress.percent}
              aria-label="Project task completion"
            >
              <ProgressLabel>Project progress</ProgressLabel>
              <ProgressValue />
            </Progress>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add tasks to measure project progress.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-h-11 items-center rounded-lg border p-1">
            {(["work", "resources"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={view === option ? "secondary" : "ghost"}
                aria-pressed={view === option}
                className="min-h-9"
                onClick={() => setView(option)}
              >
                {option === "work" ? "Work" : "Resources"}
              </Button>
            ))}
          </div>
          <label className="grid gap-1 text-xs font-medium">
            <span>Show</span>
            <NativeSelect
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as ScheduleFilter)
              }
              aria-label="Filter schedule rows"
              className="h-11 min-w-40"
            >
              {SCHEDULE_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {FILTER_LABELS[option]}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(event) => setHideCompleted(event.target.checked)}
              className="size-4 accent-primary"
            />
            Hide completed
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm">
            <input
              type="checkbox"
              checked={highlightCritical}
              onChange={(event) => setHighlightCritical(event.target.checked)}
              className="size-4 accent-primary"
              disabled={!criticalPath.ok}
            />
            Highlight critical path
          </label>
          <div className="flex min-h-11 items-center rounded-lg border p-1">
            {(["week", "month"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={zoom === option ? "secondary" : "ghost"}
                aria-pressed={zoom === option}
                className="min-h-9"
                onClick={() => setZoom(option)}
              >
                {option === "week" ? "Week" : "Month"}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Previous schedule window"
            onClick={() =>
              setAnchor((current) => moveScheduleAnchor(current, zoom, -1))
            }
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setAnchor(new Date(now))}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Next schedule window"
            onClick={() =>
              setAnchor((current) => moveScheduleAnchor(current, zoom, 1))
            }
          >
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2 border-t pt-4">
        <ScheduleBaselineControls
          projectId={projectId}
          baselines={baselines}
          selectedBaselineId={selectedBaselineId}
          itemCount={jobs.length + allTasks.length}
          returnTo={returnTo}
        />
        <ScheduleCalendarDialog
          projectId={projectId}
          calendar={calendar}
          returnTo={returnTo}
        />
      </div>

      {removedBaselineItems.length > 0 ? (
        <Alert>
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>Removed since baseline</AlertTitle>
          <AlertDescription>
            {removedBaselineItems.length} baseline item
            {removedBaselineItems.length === 1 ? "" : "s"} no longer exists in
            the live schedule.
          </AlertDescription>
        </Alert>
      ) : null}

      {visibleJobs.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center">
          <p className="font-medium">No schedule rows match this filter.</p>
          <Button
            type="button"
            variant="link"
            className="mt-2"
            onClick={() => {
              setFilter("all");
              setHideCompleted(false);
            }}
          >
            Show all
          </Button>
        </div>
      ) : view === "resources" ? (
        <ProjectResourceSchedule
          jobs={visibleJobs}
          window={window}
          now={now}
          calendar={calendar}
          selectedBaselineId={selectedBaselineId}
          selectedBaselineItems={selectedBaselineItems}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <div className="min-w-[64rem]">
            <div className="grid min-h-14 grid-cols-[minmax(16rem,22rem)_minmax(48rem,1fr)]">
              <div className="sticky left-0 z-30 flex items-end border-r bg-muted/60 px-3 py-2 text-sm font-medium">
                Work
              </div>
              <div
                className="grid bg-muted/60"
                style={{
                  gridTemplateColumns: `repeat(${window.columns.length}, minmax(0, 1fr))`,
                }}
              >
                {window.columns.map((column) => (
                  <div
                    key={column.key}
                    className="flex items-end border-l px-1 py-2 text-xs font-medium first:border-l-0"
                  >
                    {column.label}
                  </div>
                ))}
              </div>
            </div>

            {visibleJobs.map((job) => {
              const jobState = getJobScheduleState(job, today);
              const jobProgress = getTaskProgress(job.tasks);
              const isExpanded = expanded.has(job.id);
              const jobGripPosition = positionInWindow(
                job.plannedStartAt ?? job.plannedEndAt,
                window,
              );
              const jobBaseline = baselineByEntity.get(`job:${job.id}`);
              const jobVariance = selectedBaselineId
                ? calculateBaselineVariance(
                    {
                      plannedStartAt: job.plannedStartAt,
                      plannedEndAt: job.plannedEndAt,
                    },
                    jobBaseline ?? null,
                    calendar,
                  )
                : null;
              return (
                <div key={job.id}>
                  <ChartRow
                    window={window}
                    today={today}
                    className="bg-muted/10"
                    label={
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${job.number} ${job.name}`}
                          onClick={() => toggleJob(job.id)}
                        >
                          <ChevronDownIcon
                            className={cn(
                              "transition-transform",
                              !isExpanded && "-rotate-90",
                            )}
                            aria-hidden="true"
                          />
                        </Button>
                        <StatusGlyph state={jobState} />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/app/jobs/${job.id}`}
                            className="block truncate text-sm font-medium hover:underline"
                          >
                            {job.number} · {job.name}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {JOB_STATUS_LABELS[job.status]} ·{" "}
                            {jobProgress.percent === null
                              ? "No tasks"
                              : `${jobProgress.completed} / ${jobProgress.total} tasks`}
                          </p>
                          {jobVariance ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {varianceLabel(jobVariance)}
                            </p>
                          ) : null}
                        </div>
                        <Badge variant={statusVariant(jobState)}>
                          {STATE_LABELS[jobState]}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          aria-label={`Reschedule ${job.number} ${job.name}`}
                          onClick={() => proposeJobReschedule(job)}
                        >
                          <CalendarClockIcon aria-hidden="true" />
                        </Button>
                      </div>
                    }
                  >
                    {jobBaseline ? (
                      <RangeMark
                        href={`/app/jobs/${job.id}`}
                        label={`${job.number} baseline`}
                        start={jobBaseline.plannedStartAt}
                        end={jobBaseline.plannedEndAt}
                        window={window}
                        state="remaining"
                        baseline
                      />
                    ) : null}
                    <RangeMark
                      href={`/app/jobs/${job.id}`}
                      label={`${job.number} ${job.name}`}
                      start={job.plannedStartAt}
                      end={job.plannedEndAt}
                      window={window}
                      state={jobState}
                    />
                    <ScheduleDragGrip
                      position={jobGripPosition}
                      window={window}
                      label={`${job.number} ${job.name}`}
                      onShift={(deltaDays) =>
                        proposeJobReschedule(job, deltaDays)
                      }
                    />
                  </ChartRow>

                  {isExpanded
                    ? job.tasks.map((task) => {
                        const taskState = getTaskScheduleState(task, today);
                        const outsideJobDates = isTaskOutsideJobRange(
                          task,
                          job,
                        );
                        const incoming = incomingByTask.get(task.id) ?? [];
                        const taskGeometry = getTaskGeometry(task);
                        const taskGripPosition =
                          taskGeometry.kind === "bar"
                            ? positionInWindow(taskGeometry.start, window)
                            : taskGeometry.kind === "milestone"
                              ? positionInWindow(taskGeometry.date, window)
                              : null;
                        const isCritical =
                          criticalPath.ok &&
                          criticalPath.criticalTaskIds.has(task.id);
                        const taskBaseline = baselineByEntity.get(
                          `task:${task.id}`,
                        );
                        const taskVariance = selectedBaselineId
                          ? calculateBaselineVariance(
                              {
                                plannedStartAt: task.plannedStartAt,
                                plannedEndAt: task.plannedEndAt,
                                dueAt: task.dueAt,
                              },
                              taskBaseline ?? null,
                              calendar,
                            )
                          : null;
                        return (
                          <ChartRow
                            key={task.id}
                            window={window}
                            today={today}
                            label={
                              <div className="flex min-w-0 flex-1 items-center gap-2 pl-10">
                                <StatusGlyph state={taskState} />
                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={`/app/jobs/${task.jobId}#task-${task.id}`}
                                    className="block truncate text-sm hover:underline"
                                  >
                                    {task.title}
                                  </Link>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {task.assignee ?? "Unassigned"} ·{" "}
                                    {task.plannedStartAt || task.plannedEndAt
                                      ? dateRangeLabel(
                                          task.plannedStartAt,
                                          task.plannedEndAt,
                                        )
                                      : task.dueAt
                                        ? `Due ${formatDate(task.dueAt)}`
                                        : "Unscheduled"}
                                  </p>
                                  {outsideJobDates ? (
                                    <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                                      <AlertTriangleIcon
                                        className="size-3"
                                        aria-hidden="true"
                                      />
                                      Outside job dates
                                    </p>
                                  ) : null}
                                  {incoming.length > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {incoming.length} predecessor
                                      {incoming.length === 1 ? "" : "s"}
                                    </p>
                                  ) : null}
                                  {taskVariance ? (
                                    <p className="text-xs text-muted-foreground">
                                      {varianceLabel(taskVariance)}
                                    </p>
                                  ) : null}
                                </div>
                                {isCritical ? (
                                  <Badge variant="destructive">Critical</Badge>
                                ) : null}
                                <TaskDependencyEditor
                                  projectId={projectId}
                                  task={{
                                    id: task.id,
                                    title: task.title,
                                    jobNumber: job.number,
                                  }}
                                  tasks={taskOptions}
                                  incoming={incoming}
                                  returnTo={returnTo}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-lg"
                                  aria-label={`Reschedule ${task.title}`}
                                  onClick={() =>
                                    proposeTaskReschedule(task, job)
                                  }
                                >
                                  <CalendarClockIcon aria-hidden="true" />
                                </Button>
                              </div>
                            }
                          >
                            {taskBaseline ? (
                              <RangeMark
                                href={`/app/jobs/${task.jobId}#task-${task.id}`}
                                label={`${task.title} baseline`}
                                start={taskBaseline.plannedStartAt}
                                end={
                                  taskBaseline.plannedEndAt ??
                                  (!taskBaseline.plannedStartAt
                                    ? taskBaseline.dueAt
                                    : null)
                                }
                                window={window}
                                state="remaining"
                                baseline
                              />
                            ) : null}
                            <TaskMark
                              task={task}
                              window={window}
                              state={taskState}
                              critical={isCritical}
                              highlightCritical={highlightCritical}
                            />
                            <ScheduleDragGrip
                              position={taskGripPosition}
                              window={window}
                              label={task.title}
                              onShift={(deltaDays) =>
                                proposeTaskReschedule(task, job, deltaDays)
                              }
                            />
                          </ChartRow>
                        );
                      })
                    : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "work" ? (
      <details className="rounded-lg border">
        <summary className="min-h-11 cursor-pointer px-4 py-3 font-medium">
          View schedule as table
        </summary>
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Job / task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Planned start</TableHead>
                <TableHead>Planned completion</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Actual completion</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Dependencies</TableHead>
                <TableHead>Critical path</TableHead>
                <TableHead>Baseline variance</TableHead>
                <TableHead>Warning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleJobs.flatMap((job) => {
                const progress = getTaskProgress(job.tasks);
                const jobState = getJobScheduleState(job, today);
                const jobBaseline = baselineByEntity.get(`job:${job.id}`);
                const jobVariance = selectedBaselineId
                  ? calculateBaselineVariance(
                      {
                        plannedStartAt: job.plannedStartAt,
                        plannedEndAt: job.plannedEndAt,
                      },
                      jobBaseline ?? null,
                      calendar,
                    )
                  : null;
                return [
                  <TableRow key={`job-${job.id}`}>
                    <TableCell>Job</TableCell>
                    <TableCell>
                      <Link
                        href={`/app/jobs/${job.id}`}
                        className="font-medium hover:underline"
                      >
                        {job.number} · {job.name}
                      </Link>
                    </TableCell>
                    <TableCell>{STATE_LABELS[jobState]}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{formatDate(job.plannedStartAt)}</TableCell>
                    <TableCell>{formatDate(job.plannedEndAt)}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      {jobVariance
                        ? varianceLabel(jobVariance)
                        : "None selected"}
                    </TableCell>
                    <TableCell>
                      {progress.percent === null
                        ? "No tasks"
                        : `${progress.completed} / ${progress.total} (${progress.percent}%)`}
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      {!job.plannedStartAt && !job.plannedEndAt
                        ? "Unscheduled"
                        : !job.plannedStartAt || !job.plannedEndAt
                          ? "Add the other planned date"
                          : "—"}
                    </TableCell>
                  </TableRow>,
                  ...job.tasks.map((task) => {
                    const taskState = getTaskScheduleState(task, today);
                    const outsideJobDates = isTaskOutsideJobRange(task, job);
                    const incoming = incomingByTask.get(task.id) ?? [];
                    const isCritical =
                      criticalPath.ok &&
                      criticalPath.criticalTaskIds.has(task.id);
                    const taskBaseline = baselineByEntity.get(
                      `task:${task.id}`,
                    );
                    const taskVariance = selectedBaselineId
                      ? calculateBaselineVariance(
                          {
                            plannedStartAt: task.plannedStartAt,
                            plannedEndAt: task.plannedEndAt,
                            dueAt: task.dueAt,
                          },
                          taskBaseline ?? null,
                          calendar,
                        )
                      : null;
                    return (
                      <TableRow key={`task-${task.id}`}>
                        <TableCell>Task</TableCell>
                        <TableCell>
                          <Link
                            href={`/app/jobs/${task.jobId}#task-${task.id}`}
                            className="hover:underline"
                          >
                            {task.title}
                          </Link>
                        </TableCell>
                        <TableCell>{STATE_LABELS[taskState]}</TableCell>
                        <TableCell>{task.assignee ?? "Unassigned"}</TableCell>
                        <TableCell>{formatDate(task.plannedStartAt)}</TableCell>
                        <TableCell>{formatDate(task.plannedEndAt)}</TableCell>
                        <TableCell>{formatDate(task.dueAt)}</TableCell>
                        <TableCell>{formatDate(task.completedAt)}</TableCell>
                        <TableCell>
                          {task.status === "done" ? "Complete" : "Open"}
                        </TableCell>
                        <TableCell>
                          {incoming.length === 0
                            ? "No predecessors"
                            : incoming
                                .map((edge) => {
                                  const predecessor = taskOptionById.get(
                                    edge.predecessorTaskId,
                                  );
                                  return predecessor
                                    ? `${predecessor.jobNumber} · ${predecessor.title} (${edge.lagDays}d lag)`
                                    : "Unknown predecessor";
                                })
                                .join("; ")}
                        </TableCell>
                        <TableCell>
                          {isCritical
                            ? "Critical"
                            : task.plannedStartAt && task.plannedEndAt
                              ? "Not critical"
                              : "Not calculated — add planned dates"}
                        </TableCell>
                        <TableCell>
                          {taskVariance
                            ? varianceLabel(taskVariance)
                            : "None selected"}
                        </TableCell>
                        <TableCell>
                          {outsideJobDates
                            ? "Outside job dates"
                            : !task.plannedStartAt &&
                          !task.plannedEndAt &&
                          !task.dueAt
                              ? "Unscheduled"
                              : task.plannedStartAt !== null &&
                                task.plannedEndAt === null
                                ? "Add planned completion"
                                : task.plannedStartAt === null &&
                                  task.plannedEndAt !== null
                                  ? "Add planned start"
                                  : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  }),
                ];
              })}
            </TableBody>
          </Table>
        </div>
      </details>
      ) : null}
      <ScheduleRescheduleDialog
        projectId={projectId}
        returnTo={returnTo}
        preview={reschedulePreview}
        onOpenChange={(open) => {
          if (!open) setReschedulePreview(null);
        }}
      />
    </div>
  );
}
