"use client";

import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getJobScheduleState,
  getTaskScheduleState,
  positionInWindow,
  type ProjectScheduleBaselineItem,
  type ProjectScheduleJob,
  type ScheduleState,
  type ScheduleWindow,
} from "@/lib/ops/project-schedule";
import {
  buildResourceLanes,
  buildScheduleAssignments,
  calculateBaselineVariance,
  isWorkingDay,
  type ProjectedAssignment,
  type ResolvedWorkingCalendar,
} from "@/lib/ops/project-schedule-planning";
import { cn } from "@/lib/utils";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(date);
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

function clampedPosition(value: string, window: ScheduleWindow): number {
  const date = new Date(value);
  if (date <= window.start) return 0;
  if (date >= window.end) return 100;
  return positionInWindow(value, window) ?? 0;
}

function AssignmentMark({
  assignment,
  window,
  state,
  baseline = false,
}: {
  assignment: Pick<
    ProjectedAssignment,
    "href" | "label" | "plannedStartAt" | "plannedEndAt" | "dueAt"
  >;
  window: ScheduleWindow;
  state: ScheduleState;
  baseline?: boolean;
}) {
  const start = assignment.plannedStartAt;
  const end = assignment.plannedEndAt;
  const milestone = start ?? end ?? assignment.dueAt;
  if (!milestone) {
    return baseline ? null : (
      <span className="text-xs font-medium text-muted-foreground">
        Unscheduled
      </span>
    );
  }
  if (!start || !end) {
    const position = positionInWindow(milestone, window);
    if (position === null) return null;
    return (
      <Link
        href={assignment.href}
        aria-label={`${assignment.label}: ${formatDate(milestone)}`}
        className={cn(
          "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          baseline
            ? "size-4 border-muted-foreground bg-transparent"
            : state === "complete"
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
  if (endDate < window.start || startDate > window.end) return null;
  const left = clampedPosition(start, window);
  const right = clampedPosition(end, window);
  return (
    <Link
      href={assignment.href}
      aria-label={`${assignment.label}: ${formatDate(start)} – ${formatDate(end)}`}
      className={cn(
        "absolute top-2 bottom-2 overflow-hidden rounded-sm border px-2 text-xs leading-7 whitespace-nowrap focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        baseline
          ? "top-1 bottom-auto h-1 border-muted-foreground bg-transparent p-0 text-transparent"
          : state === "complete"
            ? "border-primary bg-primary text-primary-foreground"
            : state === "blocked" || state === "overdue"
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-primary/40 bg-primary/15",
      )}
      style={{ left: `${left}%`, width: `${Math.max(right - left, 0.8)}%` }}
    >
      {assignment.label}
    </Link>
  );
}

function ResourceTimelineBackdrop({
  window,
  today,
  calendar,
}: {
  window: ScheduleWindow;
  today: Date;
  calendar: ResolvedWorkingCalendar;
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
        {window.columns.map((column) => {
          const working =
            window.columns.length !== 42 ||
            isWorkingDay(column.start.toISOString(), calendar);
          return (
            <span
              key={column.key}
              className={cn(
                "border-l first:border-l-0",
                !working && "bg-muted/50",
              )}
            />
          );
        })}
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

export function ProjectResourceSchedule({
  jobs,
  window,
  now,
  calendar,
  selectedBaselineId,
  selectedBaselineItems,
}: {
  jobs: ProjectScheduleJob[];
  window: ScheduleWindow;
  now: string;
  calendar: ResolvedWorkingCalendar;
  selectedBaselineId: string | null;
  selectedBaselineItems: ProjectScheduleBaselineItem[];
}) {
  const today = new Date(now);
  const lanes = buildResourceLanes(buildScheduleAssignments(jobs), calendar);
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const tasksById = new Map(
    jobs.flatMap((job) => job.tasks.map((task) => [task.id, task] as const)),
  );
  const baselineByEntity = new Map(
    selectedBaselineItems.map((item) => [
      `${item.entityType}:${item.entityId}`,
      item,
    ]),
  );
  const stateFor = (assignment: ProjectedAssignment): ScheduleState => {
    if (assignment.entityType === "job") {
      const job = jobsById.get(assignment.entityId);
      return job ? getJobScheduleState(job, today) : "unscheduled";
    }
    const task = tasksById.get(assignment.entityId);
    return task ? getTaskScheduleState(task, today) : "unscheduled";
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <div className="min-w-[64rem]">
          <div className="grid min-h-14 grid-cols-[minmax(16rem,22rem)_minmax(48rem,1fr)]">
            <div className="sticky left-0 z-30 flex items-end border-r bg-muted/60 px-3 py-2 text-sm font-medium">
              Resources
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

          {lanes.map((lane) => {
            const conflicts = lane.assignments
              .filter((assignment) => assignment.hasPotentialOverlap)
              .map((assignment) => assignment.label);
            const scheduled = lane.assignments.filter(
              (assignment) =>
                assignment.plannedStartAt ||
                assignment.plannedEndAt ||
                assignment.dueAt,
            );
            const unscheduled = lane.assignments.filter(
              (assignment) =>
                !assignment.plannedStartAt &&
                !assignment.plannedEndAt &&
                !assignment.dueAt,
            );
            return (
              <div key={lane.key}>
                <div className="grid min-h-11 grid-cols-[minmax(16rem,22rem)_minmax(48rem,1fr)] border-t bg-muted/10">
                  <div className="sticky left-0 z-20 border-r bg-card px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{lane.displayName}</span>
                      {lane.roles.map((role) => (
                        <Badge key={role} variant="outline">
                          {role}
                        </Badge>
                      ))}
                      {lane.potentialOverlapCount > 0 ? (
                        <Badge variant="destructive">Potential overlap</Badge>
                      ) : null}
                    </div>
                    {conflicts.length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Conflicts: {conflicts.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="relative">
                    <ResourceTimelineBackdrop
                      window={window}
                      today={today}
                      calendar={calendar}
                    />
                  </div>
                </div>

                {[...scheduled, ...unscheduled].map((assignment) => {
                  const state = stateFor(assignment);
                  const baseline = baselineByEntity.get(
                    `${assignment.entityType}:${assignment.entityId}`,
                  );
                  const variance = selectedBaselineId
                    ? calculateBaselineVariance(
                        assignment,
                        baseline ?? null,
                        calendar,
                      )
                    : null;
                  return (
                    <div
                      key={assignment.id}
                      className="grid min-h-11 grid-cols-[minmax(16rem,22rem)_minmax(48rem,1fr)] border-t"
                    >
                      <div className="sticky left-0 z-20 flex min-w-0 items-center gap-2 border-r bg-card px-3 py-2 pl-8">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={assignment.href}
                            className="block truncate text-sm hover:underline"
                          >
                            {assignment.label}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {assignment.role}
                            {variance ? ` · ${varianceLabel(variance)}` : ""}
                          </p>
                        </div>
                        {assignment.hasPotentialOverlap ? (
                          <AlertTriangleIcon
                            className="size-4 shrink-0 text-destructive"
                            aria-label="Potential overlap"
                          />
                        ) : null}
                        {!assignment.plannedStartAt &&
                        !assignment.plannedEndAt &&
                        !assignment.dueAt ? (
                          <Badge variant="outline">Unscheduled</Badge>
                        ) : null}
                      </div>
                      <div className="relative flex min-h-11 items-center px-2">
                        <ResourceTimelineBackdrop
                          window={window}
                          today={today}
                          calendar={calendar}
                        />
                        <div className="relative z-10 min-w-0 flex-1">
                          {baseline ? (
                            <AssignmentMark
                              assignment={{
                                ...assignment,
                                plannedStartAt: baseline.plannedStartAt,
                                plannedEndAt: baseline.plannedEndAt,
                                dueAt: baseline.dueAt,
                              }}
                              window={window}
                              state="remaining"
                              baseline
                            />
                          ) : null}
                          <AssignmentMark
                            assignment={assignment}
                            window={window}
                            state={state}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <details className="rounded-lg border">
        <summary className="min-h-11 cursor-pointer px-4 py-3 font-medium">
          View resources as table
        </summary>
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Source item</TableHead>
                <TableHead>Planned start</TableHead>
                <TableHead>Planned completion</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Baseline variance</TableHead>
                <TableHead>Overlap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lanes.flatMap((lane) =>
                lane.assignments.map((assignment) => {
                  const baseline = baselineByEntity.get(
                    `${assignment.entityType}:${assignment.entityId}`,
                  );
                  const variance = selectedBaselineId
                    ? calculateBaselineVariance(
                        assignment,
                        baseline ?? null,
                        calendar,
                      )
                    : null;
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>{lane.displayName}</TableCell>
                      <TableCell>{assignment.role}</TableCell>
                      <TableCell>
                        <Link
                          href={assignment.href}
                          className="hover:underline"
                        >
                          {assignment.label}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {formatDate(assignment.plannedStartAt)}
                      </TableCell>
                      <TableCell>
                        {formatDate(assignment.plannedEndAt)}
                      </TableCell>
                      <TableCell>{formatDate(assignment.dueAt)}</TableCell>
                      <TableCell>
                        {variance ? varianceLabel(variance) : "None selected"}
                      </TableCell>
                      <TableCell>
                        {assignment.hasPotentialOverlap
                          ? "Potential overlap"
                          : "No overlap detected"}
                      </TableCell>
                    </TableRow>
                  );
                }),
              )}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}
