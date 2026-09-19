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
  buildPortfolioResourceLanes,
  buildPortfolioScheduleAssignments,
  type PortfolioScheduleAssignment,
  type ProjectedPortfolioProject,
} from "@/lib/ops/portfolio-schedule";
import {
  getJobScheduleState,
  getTaskScheduleState,
  positionInWindow,
  type ScheduleState,
  type ScheduleWindow,
} from "@/lib/ops/project-schedule";
import {
  calculateBaselineVariance,
  calendarDate,
  isWorkingDay,
  type ResolvedWorkingCalendar,
  type ScheduleDates,
} from "@/lib/ops/project-schedule-planning";
import { cn } from "@/lib/utils";

type ProjectedPortfolioAssignment = PortfolioScheduleAssignment & {
  hasPotentialOverlap: boolean;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(date);
}

function scheduleDateLabel(dates: ScheduleDates): string {
  if (dates.plannedStartAt && dates.plannedEndAt) {
    return `${formatDate(dates.plannedStartAt)} – ${formatDate(dates.plannedEndAt)}`;
  }
  const plannedMilestone = dates.plannedStartAt ?? dates.plannedEndAt;
  if (plannedMilestone) {
    return `Milestone ${formatDate(plannedMilestone)}`;
  }
  if (dates.dueAt) return `Due ${formatDate(dates.dueAt)}`;
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

function localWindowValue(
  value: string,
  calendar: ResolvedWorkingCalendar,
): Date | null {
  const localDate = calendarDate(value, calendar);
  if (!localDate) return null;
  const parsed = new Date(`${localDate}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function assignmentPosition(
  value: string,
  window: ScheduleWindow,
  calendar: ResolvedWorkingCalendar,
): number | null {
  return positionInWindow(localWindowValue(value, calendar), window);
}

function clampedAssignmentPosition(
  value: string,
  window: ScheduleWindow,
  calendar: ResolvedWorkingCalendar,
): number {
  const date = localWindowValue(value, calendar);
  if (!date || date <= window.start) return 0;
  if (date >= window.end) return 100;
  return positionInWindow(date, window) ?? 0;
}

function AssignmentMark({
  assignment,
  window,
  state,
  baseline = false,
}: {
  assignment: Pick<
    PortfolioScheduleAssignment,
    | "href"
    | "label"
    | "plannedStartAt"
    | "plannedEndAt"
    | "dueAt"
    | "calendar"
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
    const position = assignmentPosition(
      milestone,
      window,
      assignment.calendar,
    );
    if (position === null) return null;
    return (
      <Link
        href={assignment.href}
        aria-label={`${assignment.label}: ${scheduleDateLabel(assignment)}`}
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
  const localStart = localWindowValue(start, assignment.calendar);
  const localEnd = localWindowValue(end, assignment.calendar);
  if (
    !localStart ||
    !localEnd ||
    localEnd < window.start ||
    localStart > window.end
  ) {
    return null;
  }
  const left = clampedAssignmentPosition(start, window, assignment.calendar);
  const right = clampedAssignmentPosition(end, window, assignment.calendar);
  return (
    <Link
      href={assignment.href}
      aria-label={`${assignment.label}: ${scheduleDateLabel(assignment)}`}
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

function AssignmentTimelineBackdrop({
  window,
  now,
  calendar,
}: {
  window: ScheduleWindow;
  now: string;
  calendar: ResolvedWorkingCalendar;
}) {
  const todayPosition = assignmentPosition(now, window, calendar);
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
          aria-label={`Today, ${formatDate(now)}`}
        />
      ) : null}
    </>
  );
}

export function PortfolioResourceSchedule({
  projects,
  window,
  now,
  baseline,
}: {
  projects: ProjectedPortfolioProject[];
  window: ScheduleWindow;
  now: string;
  baseline: "latest" | "none";
}) {
  const lanes = buildPortfolioResourceLanes(
    buildPortfolioScheduleAssignments(projects),
  );
  const jobsById = new Map(
    projects.flatMap((project) =>
      project.jobs.map((job) => [`${project.id}:job:${job.id}`, job] as const),
    ),
  );
  const tasksById = new Map(
    projects.flatMap((project) =>
      project.jobs.flatMap((job) =>
        job.tasks.map(
          (task) => [`${project.id}:task:${task.id}`, task] as const,
        ),
      ),
    ),
  );
  const baselineByEntity = new Map(
    baseline === "latest"
      ? projects.flatMap((project) =>
          (project.latestBaseline?.items ?? []).map(
            (item) =>
              [
                `${project.id}:${item.entityType}:${item.entityId}`,
                item,
              ] as const,
          ),
        )
      : [],
  );
  const stateFor = (
    assignment: ProjectedPortfolioAssignment,
  ): ScheduleState => {
    const currentNow = new Date(now);
    if (assignment.entityType === "job") {
      const source = jobsById.get(
        `${assignment.projectId}:job:${assignment.entityId}`,
      );
      return source
        ? getJobScheduleState(
            {
              ...source,
              plannedStartAt: assignment.plannedStartAt ?? null,
              plannedEndAt: assignment.plannedEndAt ?? null,
            },
            currentNow,
          )
        : "unscheduled";
    }
    const source = tasksById.get(
      `${assignment.projectId}:task:${assignment.entityId}`,
    );
    return source
      ? getTaskScheduleState(
          {
            ...source,
            plannedStartAt: assignment.plannedStartAt ?? null,
            plannedEndAt: assignment.plannedEndAt ?? null,
            dueAt: assignment.dueAt ?? null,
          },
          currentNow,
        )
      : "unscheduled";
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <div className="min-w-[64rem]">
          <div className="grid min-h-14 grid-cols-[minmax(18rem,24rem)_minmax(48rem,1fr)]">
            <div className="sticky left-0 z-30 flex items-end border-r bg-muted/60 px-3 py-2 text-sm font-medium">
              Portfolio resources
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

          {lanes.map((lane) => (
            <div key={lane.key}>
              <div className="grid min-h-11 grid-cols-[minmax(18rem,24rem)_minmax(48rem,1fr)] border-t bg-muted/10">
                <div className="sticky left-0 z-20 border-r bg-card px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{lane.displayName}</span>
                    {lane.roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))}
                    {lane.potentialOverlapCount > 0 ? (
                      <Badge variant="destructive">
                        Potential overlap · {lane.potentialOverlapCount}{" "}
                        {lane.potentialOverlapCount === 1 ? "pair" : "pairs"}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="bg-muted/10" aria-hidden="true" />
              </div>

              {lane.assignments.map((assignment) => {
                const baselineItem = baselineByEntity.get(
                  `${assignment.projectId}:${assignment.entityType}:${assignment.entityId}`,
                );
                const baselineHasDates = Boolean(
                  baselineItem?.plannedStartAt ||
                    baselineItem?.plannedEndAt ||
                    baselineItem?.dueAt,
                );
                const variance =
                  baseline === "latest"
                    ? calculateBaselineVariance(
                        assignment,
                        baselineItem ?? null,
                        assignment.calendar,
                      )
                    : null;
                return (
                  <div
                    key={`${assignment.projectId}:${assignment.id}`}
                    className="grid min-h-14 grid-cols-[minmax(18rem,24rem)_minmax(48rem,1fr)] border-t"
                  >
                    <div className="sticky left-0 z-20 min-w-0 border-r bg-card px-3 py-2 pl-8">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={assignment.href}
                            className="block truncate text-sm hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            {assignment.label}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {assignment.projectName} ·{" "}
                            {scheduleDateLabel(assignment)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge variant="outline">{assignment.role}</Badge>
                            {variance ? (
                              <span className="text-xs text-muted-foreground">
                                {varianceLabel(variance)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {assignment.hasPotentialOverlap ? (
                          <Badge variant="destructive">
                            <AlertTriangleIcon aria-hidden="true" />
                            Potential overlap
                          </Badge>
                        ) : null}
                        {!assignment.plannedStartAt &&
                        !assignment.plannedEndAt &&
                        !assignment.dueAt ? (
                          <Badge variant="outline">Unscheduled</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="relative flex min-h-14 items-center px-2">
                      <AssignmentTimelineBackdrop
                        window={window}
                        now={now}
                        calendar={assignment.calendar}
                      />
                      <div className="relative z-10 min-w-0 flex-1">
                        {baselineHasDates && baselineItem ? (
                          <AssignmentMark
                            assignment={{
                              ...assignment,
                              plannedStartAt: baselineItem.plannedStartAt,
                              plannedEndAt: baselineItem.plannedEndAt,
                              dueAt: baselineItem.dueAt,
                            }}
                            window={window}
                            state="remaining"
                            baseline
                          />
                        ) : null}
                        <AssignmentMark
                          assignment={assignment}
                          window={window}
                          state={stateFor(assignment)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <details className="rounded-lg border">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 py-3 text-sm font-medium">
          View portfolio resources as table
        </summary>
        <div className="overflow-x-auto border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Source item</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Baseline variance</TableHead>
                <TableHead>Overlap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lanes.flatMap((lane) =>
                lane.assignments.map((assignment) => {
                  const baselineItem = baselineByEntity.get(
                    `${assignment.projectId}:${assignment.entityType}:${assignment.entityId}`,
                  );
                  const variance =
                    baseline === "latest"
                      ? calculateBaselineVariance(
                          assignment,
                          baselineItem ?? null,
                          assignment.calendar,
                        )
                      : null;
                  return (
                    <TableRow key={`${assignment.projectId}:${assignment.id}`}>
                      <TableCell>{lane.displayName}</TableCell>
                      <TableCell>{lane.roles.join(", ")}</TableCell>
                      <TableCell>{assignment.projectName}</TableCell>
                      <TableCell>
                        <Link
                          href={assignment.href}
                          className="hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {assignment.label}
                        </Link>
                      </TableCell>
                      <TableCell>{scheduleDateLabel(assignment)}</TableCell>
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
