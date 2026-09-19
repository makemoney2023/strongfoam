"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import {
  SCHEDULE_FILTERS,
  createScheduleWindow,
  filterScheduleJobs,
  getJobScheduleState,
  getTaskProgress,
  getTaskScheduleState,
  hideCompletedScheduleRows,
  moveScheduleAnchor,
  positionInWindow,
  type ProjectScheduleJob,
  type ProjectScheduleTask,
  type ScheduleFilter,
  type ScheduleState,
  type ScheduleWindow,
  type ScheduleZoom,
} from "@/lib/ops/project-schedule";
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
}: {
  href: string;
  label: string;
  start: string | null;
  end: string | null;
  window: ScheduleWindow;
  state: ScheduleState;
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
          state === "complete"
            ? "border-primary bg-primary"
            : state === "blocked" || state === "overdue"
              ? "border-destructive bg-destructive"
              : "border-primary bg-card",
        )}
        style={{ left: `${position}%` }}
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
        state === "complete"
          ? "border-primary bg-primary text-primary-foreground"
          : state === "blocked" || state === "overdue"
            ? "border-destructive bg-destructive/10 text-destructive"
            : "border-primary/40 bg-primary/15 text-foreground",
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={dateRangeLabel(start, end)}
    >
      {STATE_LABELS[state]}
    </Link>
  );
}

function TaskMark({
  task,
  window,
  state,
}: {
  task: ProjectScheduleTask;
  window: ScheduleWindow;
  state: ScheduleState;
}) {
  const href = `/app/jobs/${task.jobId}#task-${task.id}`;
  if (task.plannedStartAt || task.plannedEndAt) {
    return (
      <RangeMark
        href={href}
        label={task.title}
        start={task.plannedStartAt}
        end={task.plannedEndAt}
        window={window}
        state={state}
      />
    );
  }
  if (!task.dueAt) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        Unscheduled
      </span>
    );
  }
  const position = positionInWindow(task.dueAt, window);
  if (position === null) return null;
  return (
    <Link
      href={href}
      aria-label={`${task.title}: due ${formatDate(task.dueAt)}`}
      className={cn(
        "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        state === "complete"
          ? "border-primary bg-primary"
          : state === "overdue"
            ? "border-destructive bg-destructive"
            : "border-primary bg-card",
      )}
      style={{ left: `${position}%` }}
      title={`Due ${formatDate(task.dueAt)}`}
    />
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
      <div className="relative flex min-h-11 items-center px-2">
        <TimelineBackdrop window={window} today={today} />
        <div className="relative z-10 min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

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
  const [hideCompleted, setHideCompleted] = useState(false);
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

  function toggleJob(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
                        </div>
                        <Badge variant={statusVariant(jobState)}>
                          {STATE_LABELS[jobState]}
                        </Badge>
                      </div>
                    }
                  >
                    <RangeMark
                      href={`/app/jobs/${job.id}`}
                      label={`${job.number} ${job.name}`}
                      start={job.plannedStartAt}
                      end={job.plannedEndAt}
                      window={window}
                      state={jobState}
                    />
                  </ChartRow>

                  {isExpanded
                    ? job.tasks.map((task) => {
                        const taskState = getTaskScheduleState(task, today);
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
                                </div>
                              </div>
                            }
                          >
                            <TaskMark
                              task={task}
                              window={window}
                              state={taskState}
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
                <TableHead>Warning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleJobs.flatMap((job) => {
                const progress = getTaskProgress(job.tasks);
                const jobState = getJobScheduleState(job, today);
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
                      {progress.percent === null
                        ? "No tasks"
                        : `${progress.completed} / ${progress.total} (${progress.percent}%)`}
                    </TableCell>
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
                          {!task.plannedStartAt &&
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
    </div>
  );
}
