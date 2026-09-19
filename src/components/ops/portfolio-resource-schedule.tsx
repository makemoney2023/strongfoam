"use client";

import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
  getPortfolioBaselineState,
  getPortfolioJobScheduleState,
  getPortfolioResourceGeometry,
  getPortfolioTaskScheduleState,
  getPortfolioWorkingDayGradient,
  portfolioCalendarDate,
  type PortfolioBaselineState,
  type PortfolioScheduleCalendar,
  type PortfolioScheduleAssignment,
  type ProjectedPortfolioProject,
} from "@/lib/ops/portfolio-schedule";
import {
  type ScheduleState,
  type ScheduleWindow,
} from "@/lib/ops/project-schedule";
import {
  calculateBaselineVariance,
  type ResolvedWorkingCalendar,
  type ScheduleDates,
} from "@/lib/ops/project-schedule-planning";
import { cn } from "@/lib/utils";

type ProjectedPortfolioAssignment = PortfolioScheduleAssignment & {
  hasPotentialOverlap: boolean;
};

export const PORTFOLIO_RESOURCE_PAGE_SIZE = 200;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatDate(
  value: string | null | undefined,
  calendar: PortfolioScheduleCalendar,
): string {
  if (!value) return "—";
  const localDate = portfolioCalendarDate(value, calendar);
  if (!localDate) return "—";
  const [year, month, day] = localDate.split("-").map(Number);
  const monthLabel = MONTH_LABELS[month! - 1];
  return monthLabel ? `${monthLabel} ${day}, ${year}` : "—";
}

function scheduleDateLabel(
  dates: ScheduleDates,
  calendar: PortfolioScheduleCalendar,
): string {
  if (dates.plannedStartAt && dates.plannedEndAt) {
    return `${formatDate(dates.plannedStartAt, calendar)} – ${formatDate(dates.plannedEndAt, calendar)}`;
  }
  const plannedMilestone = dates.plannedStartAt ?? dates.plannedEndAt;
  if (plannedMilestone) {
    return `Milestone ${formatDate(plannedMilestone, calendar)}`;
  }
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

function portfolioBaselineVariance(
  assignment: PortfolioScheduleAssignment,
  state: PortfolioBaselineState,
): ReturnType<typeof calculateBaselineVariance> | null {
  if (state.kind !== "scheduled" && state.kind !== "added") return null;
  return calculateBaselineVariance(
    assignment,
    state.kind === "scheduled" ? state.dates : null,
    assignment.calendar as ResolvedWorkingCalendar,
  );
}

function baselineStateLabel(
  state: PortfolioBaselineState,
  variance: ReturnType<typeof calculateBaselineVariance> | null,
): string {
  if (state.kind === "none") return "None selected";
  if (state.kind === "not-baselined") return "Not baselined";
  if (state.kind === "invalid") return "Invalid baseline date";
  return variance ? varianceLabel(variance) : "Not baselined";
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
  const geometry = getPortfolioResourceGeometry(
    assignment,
    assignment.calendar,
    window,
  );
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
          aria-hidden="true"
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-muted-foreground bg-transparent"
          style={{ left: `${geometry.position}%` }}
        />
      );
    }
    return (
      <Link
        href={assignment.href}
        aria-label={`${assignment.label}: ${scheduleDateLabel(assignment, assignment.calendar)}`}
        className={cn(
          "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          state === "complete"
            ? "border-primary bg-primary"
            : state === "blocked" || state === "overdue"
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
        aria-hidden="true"
        className="absolute top-1 h-1 overflow-hidden rounded-sm border border-muted-foreground bg-transparent"
        style={{
          left: `${geometry.left}%`,
          width: `${Math.max(geometry.width, 0.8)}%`,
        }}
      />
    );
  }
  return (
    <Link
      href={assignment.href}
      aria-label={`${assignment.label}: ${scheduleDateLabel(assignment, assignment.calendar)}`}
      className={cn(
        "absolute top-2 bottom-2 rounded-sm border px-2 text-xs leading-7 whitespace-nowrap before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-full before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        state === "complete"
          ? "border-primary bg-primary text-primary-foreground"
          : state === "blocked" || state === "overdue"
            ? "border-destructive bg-destructive/10 text-destructive"
            : "border-primary/40 bg-primary/15",
      )}
      style={{
        left: `${geometry.left}%`,
        width: `${Math.max(geometry.width, 0.8)}%`,
      }}
    >
      <span className="block overflow-hidden text-ellipsis">
        {assignment.label}
      </span>
    </Link>
  );
}

function AssignmentTimelineBackdrop({
  window,
  now,
  calendar,
  gradient,
}: {
  window: ScheduleWindow;
  now: string;
  calendar: PortfolioScheduleCalendar;
  gradient: string;
}) {
  const todayGeometry = getPortfolioResourceGeometry(
    { dueAt: now },
    calendar,
    window,
  );
  const todayPosition =
    todayGeometry?.kind === "milestone"
      ? todayGeometry.position
      : null;
  return (
    <>
      <div
        data-resource-backdrop="true"
        className="pointer-events-none absolute inset-0 grid"
        style={{
          backgroundImage: gradient,
        }}
        aria-hidden="true"
      />
      {todayPosition !== null ? (
        <span
          className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-primary"
          style={{ left: `${todayPosition}%` }}
          role="img"
          aria-label={`Today, ${formatDate(now, calendar)}`}
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
  const lanes = useMemo(
    () =>
      buildPortfolioResourceLanes(
        buildPortfolioScheduleAssignments(projects),
      ),
    [projects],
  );
  const entries = useMemo(
    () =>
      lanes.flatMap((lane) =>
        lane.assignments.map((assignment) => ({ lane, assignment })),
      ),
    [lanes],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(entries.length / PORTFOLIO_RESOURCE_PAGE_SIZE),
  );
  const [pagination, setPagination] = useState({
    projects,
    page: 0,
  });
  const requestedPage =
    pagination.projects === projects ? pagination.page : 0;
  const page = Math.min(requestedPage, pageCount - 1);
  const pageEntries = useMemo(
    () =>
      entries.slice(
        page * PORTFOLIO_RESOURCE_PAGE_SIZE,
        (page + 1) * PORTFOLIO_RESOURCE_PAGE_SIZE,
      ),
    [entries, page],
  );
  const pagedLanes = useMemo(() => {
    const pageLaneMap = new Map<
      string,
      (typeof lanes)[number]
    >();
    for (const { lane, assignment } of pageEntries) {
      const existing = pageLaneMap.get(lane.key);
      if (existing) existing.assignments.push(assignment);
      else pageLaneMap.set(lane.key, { ...lane, assignments: [assignment] });
    }
    return [...pageLaneMap.values()];
  }, [pageEntries]);
  const [tableOpen, setTableOpen] = useState(false);
  const firstVisible =
    entries.length === 0 ? 0 : page * PORTFOLIO_RESOURCE_PAGE_SIZE + 1;
  const lastVisible = Math.min(
    entries.length,
    (page + 1) * PORTFOLIO_RESOURCE_PAGE_SIZE,
  );
  const gradients = new Map<PortfolioScheduleCalendar, string>();
  const gradientFor = (calendar: PortfolioScheduleCalendar): string => {
    const existing = gradients.get(calendar);
    if (existing) return existing;
    const gradient = getPortfolioWorkingDayGradient(
      window,
      calendar,
    );
    gradients.set(calendar, gradient);
    return gradient;
  };
  const projectsById = new Map(projects.map((project) => [project.id, project]));
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
    if (assignment.entityType === "job") {
      const source = jobsById.get(
        `${assignment.projectId}:job:${assignment.entityId}`,
      );
      return source
        ? getPortfolioJobScheduleState(
            {
              ...source,
              plannedStartAt: assignment.plannedStartAt ?? null,
              plannedEndAt: assignment.plannedEndAt ?? null,
            },
            now,
            assignment.calendar,
          )
        : "unscheduled";
    }
    const source = tasksById.get(
      `${assignment.projectId}:task:${assignment.entityId}`,
    );
    return source
      ? getPortfolioTaskScheduleState(
          {
            ...source,
            plannedStartAt: assignment.plannedStartAt ?? null,
            plannedEndAt: assignment.plannedEndAt ?? null,
            dueAt: assignment.dueAt ?? null,
          },
          now,
          assignment.calendar,
        )
      : "unscheduled";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <p className="text-sm" aria-live="polite">
          Showing {firstVisible}–{lastVisible} of {entries.length} assignments.
          {" "}
          {lanes.length} resource {lanes.length === 1 ? "lane" : "lanes"}.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous resource assignments page"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page === 0}
            onClick={() =>
              setPagination({
                projects,
                page: Math.max(0, page - 1),
              })
            }
          >
            Previous
          </button>
          <span className="min-w-20 text-center text-sm">
            Page {page + 1} of {pageCount}
          </span>
          <button
            type="button"
            aria-label="Next resource assignments page"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= pageCount - 1}
            onClick={() =>
              setPagination({
                projects,
                page: Math.min(pageCount - 1, page + 1),
              })
            }
          >
            Next
          </button>
        </div>
      </div>
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

          {pagedLanes.map((lane) => (
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
                const baselineState = getPortfolioBaselineState(
                  baseline,
                  projectsById.get(assignment.projectId)?.latestBaseline ??
                    null,
                  baselineItem,
                );
                const variance = portfolioBaselineVariance(
                  assignment,
                  baselineState,
                );
                return (
                  <div
                    key={`${assignment.projectId}:${assignment.id}`}
                    data-resource-assignment-row="true"
                    data-assignment-key={`${assignment.projectId}:${assignment.id}`}
                    className="grid min-h-14 grid-cols-[minmax(18rem,24rem)_minmax(48rem,1fr)] border-t"
                  >
                    <div className="sticky left-0 z-20 min-w-0 border-r bg-card px-3 py-2 pl-8">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={assignment.href}
                            aria-label={`Open source ${assignment.entityType} ${assignment.label}`}
                            className="inline-flex min-h-11 min-w-11 max-w-full items-center px-2 text-sm hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            <span className="truncate">
                              {assignment.label}
                            </span>
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            <Link
                              href={`/app/projects/${assignment.projectId}`}
                              aria-label={`Open project ${assignment.projectName}`}
                              className="inline-flex min-h-11 min-w-11 items-center px-2 align-middle hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                              {assignment.projectName}
                            </Link>{" "}
                            ·{" "}
                            {scheduleDateLabel(
                              assignment,
                              assignment.calendar,
                            )}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge
                              variant="outline"
                              aria-label={`Assignment role: ${assignment.role}`}
                            >
                              {assignment.role}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {baselineStateLabel(
                                baselineState,
                                variance,
                              )}
                            </span>
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
                    <div className="relative flex min-h-14 items-center">
                      <AssignmentTimelineBackdrop
                        window={window}
                        now={now}
                        calendar={assignment.calendar}
                        gradient={gradientFor(assignment.calendar)}
                      />
                      <div className="relative z-10 min-w-0 flex-1">
                        {baselineState.kind === "scheduled" ? (
                          <AssignmentMark
                            assignment={{
                              ...assignment,
                              ...baselineState.dates,
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

      <section className="rounded-lg border">
        <button
          type="button"
          aria-expanded={tableOpen}
          aria-controls="portfolio-resource-table"
          className="flex min-h-11 min-w-11 w-full cursor-pointer items-center px-4 py-3 text-left text-sm font-medium"
          onClick={() => setTableOpen((open) => !open)}
        >
          {tableOpen ? "Hide" : "View"} current assignment page as table
        </button>
        {tableOpen ? (
          <div
            id="portfolio-resource-table"
            className="overflow-x-auto border-t"
          >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Source item</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Baseline variance</TableHead>
                <TableHead>Overlap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedLanes.flatMap((lane) =>
                lane.assignments.map((assignment) => {
                  const baselineItem = baselineByEntity.get(
                    `${assignment.projectId}:${assignment.entityType}:${assignment.entityId}`,
                  );
                  const baselineState = getPortfolioBaselineState(
                    baseline,
                    projectsById.get(assignment.projectId)?.latestBaseline ??
                      null,
                    baselineItem,
                  );
                  const variance = portfolioBaselineVariance(
                    assignment,
                    baselineState,
                  );
                  return (
                    <TableRow
                      key={`${assignment.projectId}:${assignment.id}`}
                      data-assignment-key={`${assignment.projectId}:${assignment.id}`}
                    >
                      <TableCell>{lane.displayName}</TableCell>
                      <TableCell
                        aria-label={`Assignment role: ${assignment.role}`}
                      >
                        {assignment.role}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/app/projects/${assignment.projectId}`}
                          aria-label={`Open project ${assignment.projectName}`}
                          className="inline-flex min-h-11 min-w-11 items-center px-2 align-middle hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {assignment.projectName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={assignment.href}
                          aria-label={`Open source ${assignment.entityType} ${assignment.label}`}
                          className="inline-flex min-h-11 min-w-11 items-center px-2 align-middle hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          {assignment.label}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {scheduleDateLabel(
                          assignment,
                          assignment.calendar,
                        )}
                      </TableCell>
                      <TableCell>
                        {baselineStateLabel(baselineState, variance)}
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
        ) : null}
      </section>
    </div>
  );
}
