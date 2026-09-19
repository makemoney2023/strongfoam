import { calculateCriticalPath } from "@/lib/ops/project-schedule-graph";
import {
  getTaskProgress,
  hideCompletedScheduleRows,
  matchesScheduleFilter,
  type ProjectScheduleBaselineItem,
  type ProjectScheduleDependency,
  type ProjectScheduleJob,
  type ProjectScheduleTask,
  type ScheduleState,
  type ScheduleWindow,
} from "@/lib/ops/project-schedule";
import { formatJobNumber, isJobStatus } from "@/lib/ops/jobs";
import {
  DEFAULT_WORKING_CALENDAR,
  buildScheduleAssignments,
  calendarDate,
  workingDayDifference,
  type ResolvedWorkingCalendar,
  type ScheduleAssignment,
  type ScheduleAssignmentRole,
  type ScheduleDates,
  type WorkingCalendarException,
} from "@/lib/ops/project-schedule-planning";
import type { PortfolioScheduleStoreResult } from "@/lib/ops/store";

export type PortfolioScheduleBaseline = {
  id: string;
  name: string;
  capturedAt: string;
  items: ProjectScheduleBaselineItem[];
};

export type PortfolioScheduleProject = {
  id: string;
  name: string;
  status: string;
  projectManager: string | null;
  calendar: ResolvedWorkingCalendar;
  latestBaseline: PortfolioScheduleBaseline | null;
  jobs: ProjectScheduleJob[];
  dependencies: ProjectScheduleDependency[];
};

export type PortfolioScheduleData = {
  projects: PortfolioScheduleProject[];
  truncation: {
    projects: boolean;
    jobs: boolean;
    tasks: boolean;
    dependencies: boolean;
    calendarExceptions: boolean;
    baselineItems: boolean;
  };
};

export type PortfolioProjectRange = {
  start: string | null;
  finish: string | null;
};

export type ProjectedPortfolioProject = PortfolioScheduleProject & {
  state: ScheduleState;
  range: PortfolioProjectRange;
  progress: ReturnType<typeof getTaskProgress>;
  criticalTaskIds: ReadonlySet<string>;
  warningCounts: {
    blocked: number;
    overdue: number;
    unscheduled: number;
    critical: number;
  };
  baselineFinishVarianceDays: number | null;
};

export type PortfolioScheduleCalendar = Readonly<{
  id?: string;
  name?: string;
  timeZone: string;
  weekendDays: readonly number[];
  exceptions: readonly Readonly<WorkingCalendarException>[];
}>;

export type PortfolioScheduleAssignment = ScheduleAssignment & {
  readonly projectId: string;
  readonly projectName: string;
  readonly calendar: PortfolioScheduleCalendar;
};

export type PortfolioResourceLane = {
  key: string;
  displayName: string;
  roles: ScheduleAssignmentRole[];
  assignments: Array<
    PortfolioScheduleAssignment & { hasPotentialOverlap: boolean }
  >;
  /** The number of unique conflicting assignment pairs in this lane. */
  potentialOverlapCount: number;
};

export type PortfolioProjectionFilter = {
  state:
    | "all"
    | "remaining"
    | "complete"
    | "blocked"
    | "overdue"
    | "unscheduled";
  attention: "all" | "behind-baseline" | "resource-overlap";
  from: string | null;
  to: string | null;
  hideCompleted: boolean;
  overlapProjectIds: ReadonlySet<string>;
};

type RawCalendar = PortfolioScheduleStoreResult["calendars"][number];
type RawCalendarException =
  PortfolioScheduleStoreResult["calendarExceptions"][number];

// `draft` is the schema default and the least committed workflow state.
const SAFE_JOB_STATUS_FALLBACK: ProjectScheduleJob["status"] = "draft";

function appendToMap<T>(
  map: Map<string, T[]>,
  key: string,
  value: T,
): void {
  const values = map.get(key);
  if (values) values.push(value);
  else map.set(key, [value]);
}

function isoString(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function cloneResolvedCalendar(
  calendar: ResolvedWorkingCalendar,
): ResolvedWorkingCalendar {
  return {
    ...calendar,
    weekendDays: [...calendar.weekendDays],
    exceptions: calendar.exceptions.map((exception) => ({
      ...exception,
    })),
  };
}

function serializeCalendar(
  calendar: RawCalendar,
  exceptions: readonly RawCalendarException[],
): ResolvedWorkingCalendar {
  return {
    id: calendar.id,
    name: calendar.name,
    timeZone: calendar.timeZone,
    weekendDays: [...calendar.weekendDays],
    exceptions: exceptions.map((exception) => ({
      id: exception.id,
      date: exception.date,
      name: exception.name,
      isWorkingDay: exception.isWorkingDay,
    })),
  };
}

export function serializePortfolioSchedule(
  raw: PortfolioScheduleStoreResult,
): PortfolioScheduleData {
  const selectedProjectIds = new Set(
    raw.projects.map((project) => project.id),
  );
  const jobsByProject = new Map<
    string,
    PortfolioScheduleStoreResult["jobs"]
  >();
  const renderedJobIds = new Set<string>();
  for (const job of raw.jobs) {
    if (!job.projectId || !selectedProjectIds.has(job.projectId)) continue;
    appendToMap(jobsByProject, job.projectId, job);
    renderedJobIds.add(job.id);
  }

  const tasksByJob = new Map<
    string,
    PortfolioScheduleStoreResult["tasks"]
  >();
  for (const task of raw.tasks) {
    if (!renderedJobIds.has(task.jobId)) continue;
    appendToMap(tasksByJob, task.jobId, task);
  }

  const dependenciesByProject = new Map<
    string,
    PortfolioScheduleStoreResult["dependencies"]
  >();
  for (const dependency of raw.dependencies) {
    if (!selectedProjectIds.has(dependency.projectId)) continue;
    appendToMap(
      dependenciesByProject,
      dependency.projectId,
      dependency,
    );
  }

  const calendarsById = new Map(
    raw.calendars.map((calendar) => [calendar.id, calendar]),
  );
  const exceptionsByCalendar = new Map<
    string,
    PortfolioScheduleStoreResult["calendarExceptions"]
  >();
  for (const exception of raw.calendarExceptions) {
    if (!calendarsById.has(exception.calendarId)) continue;
    appendToMap(exceptionsByCalendar, exception.calendarId, exception);
  }
  const defaultCalendar = raw.calendars.find(
    (calendar) => calendar.isDefault,
  );
  const resolvedCalendarsById = new Map<string, ResolvedWorkingCalendar>();
  for (const calendar of raw.calendars) {
    resolvedCalendarsById.set(
      calendar.id,
      serializeCalendar(
        calendar,
        exceptionsByCalendar.get(calendar.id) ?? [],
      ),
    );
  }
  const resolvedDefaultCalendar = defaultCalendar
    ? resolvedCalendarsById.get(defaultCalendar.id)!
    : cloneResolvedCalendar(DEFAULT_WORKING_CALENDAR);

  const latestBaselineByProject = new Map<
    string,
    PortfolioScheduleStoreResult["baselines"][number]
  >();
  for (const baseline of raw.baselines) {
    if (!selectedProjectIds.has(baseline.projectId)) continue;
    latestBaselineByProject.set(baseline.projectId, baseline);
  }

  const baselineItemsByBaseline = new Map<
    string,
    PortfolioScheduleStoreResult["baselineItems"]
  >();
  for (const item of raw.baselineItems) {
    appendToMap(baselineItemsByBaseline, item.baselineId, item);
  }

  return {
    projects: raw.projects.map((project) => {
      const jobs = (jobsByProject.get(project.id) ?? []).map((job) => ({
        id: job.id,
        updatedAt: job.updatedAt.toISOString(),
        number: formatJobNumber(job.id),
        name: job.name,
        status: isJobStatus(job.status)
          ? job.status
          : SAFE_JOB_STATUS_FALLBACK,
        projectManager: job.projectManager,
        foreman: job.foreman,
        plannedStartAt: isoString(job.plannedStartAt),
        plannedEndAt: isoString(job.plannedEndAt),
        tasks: (tasksByJob.get(job.id) ?? []).map((task) => ({
          id: task.id,
          jobId: task.jobId,
          updatedAt: task.updatedAt.toISOString(),
          title: task.title,
          assignee: task.assignee,
          status:
            task.status === "done"
              ? ("done" as const)
              : ("open" as const),
          dueAt: isoString(task.dueAt),
          plannedStartAt: isoString(task.plannedStartAt),
          plannedEndAt: isoString(task.plannedEndAt),
          completedAt: isoString(task.completedAt),
        })),
      }));
      const dependencies = (
        dependenciesByProject.get(project.id) ?? []
      ).map((dependency) => ({
        id: dependency.id,
        projectId: dependency.projectId,
        predecessorTaskId: dependency.predecessorTaskId,
        successorTaskId: dependency.successorTaskId,
        lagDays: dependency.lagDays,
      }));
      const selectedCalendar =
        (project.scheduleCalendarId
          ? resolvedCalendarsById.get(project.scheduleCalendarId)
          : undefined) ?? resolvedDefaultCalendar;
      const baseline = latestBaselineByProject.get(project.id);
      const latestBaseline = baseline
        ? {
            id: baseline.id,
            name: baseline.name,
            capturedAt: baseline.capturedAt.toISOString(),
            items: (baselineItemsByBaseline.get(baseline.id) ?? []).map(
              (item) => ({
                id: item.id,
                baselineId: item.baselineId,
                entityType:
                  item.entityType === "job"
                    ? ("job" as const)
                    : ("task" as const),
                entityId: item.entityId,
                plannedStartAt: isoString(item.plannedStartAt),
                plannedEndAt: isoString(item.plannedEndAt),
                dueAt: isoString(item.dueAt),
              }),
            ),
          }
        : null;

      return {
        id: project.id,
        name: project.name,
        status: project.status,
        projectManager: project.projectManager,
        calendar: cloneResolvedCalendar(selectedCalendar),
        latestBaseline,
        jobs,
        dependencies,
      };
    }),
    truncation: { ...raw.truncation },
  };
}

type DatedValue = {
  value: string;
  timestamp: number;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))$/;

function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  if (month < 1 || month > 12) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day >= 1 && day <= daysInMonth[month - 1]!;
}

function validDate(value: string | null | undefined): DatedValue | null {
  if (!value) return null;
  const dateOnly = ISO_DATE.exec(value);
  const dateTime = ISO_DATE_TIME.exec(value);
  const match = dateOnly ?? dateTime;
  if (!match) return null;
  const [, year, month, day] = match;
  if (
    !isValidCalendarDate(Number(year), Number(month), Number(day)) ||
    (dateTime &&
      (Number(dateTime[4]) > 23 ||
        Number(dateTime[5]) > 59 ||
        Number(dateTime[6]) > 59 ||
        Number(dateTime[7] ?? 0) > 23 ||
        Number(dateTime[8] ?? 0) > 59))
  ) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : { value, timestamp };
}

function validScheduleDate(value: string | null): string | null {
  return validDate(value)?.value ?? null;
}

export function portfolioCalendarDate(
  value: string,
  calendar: Pick<PortfolioScheduleCalendar, "timeZone">,
): string | null {
  const validated = validDate(value);
  if (!validated) return null;
  const localDate = calendarDate(validated.value, calendar);
  return validDate(localDate)?.value ?? null;
}

export function localScheduleDateKey(value: Date): string | null {
  if (Number.isNaN(value.getTime())) return null;
  const year = String(value.getFullYear()).padStart(4, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizePortfolioScheduleDates(
  dates: ScheduleDates,
): Required<ScheduleDates> {
  return {
    plannedStartAt: validScheduleDate(dates.plannedStartAt ?? null),
    plannedEndAt: validScheduleDate(dates.plannedEndAt ?? null),
    dueAt: validScheduleDate(dates.dueAt ?? null),
  };
}

export type PortfolioBaselineState =
  | { kind: "none" }
  | { kind: "not-baselined" }
  | { kind: "added" }
  | { kind: "unavailable-partial" }
  | { kind: "invalid" }
  | { kind: "scheduled"; dates: Required<ScheduleDates> };

export function getPortfolioBaselineState(
  mode: "latest" | "none",
  latestBaseline: PortfolioScheduleBaseline | null,
  item: ScheduleDates | undefined,
  completeness: { baselineItemsComplete: boolean } = {
    baselineItemsComplete: true,
  },
): PortfolioBaselineState {
  if (mode === "none") return { kind: "none" };
  if (!latestBaseline) return { kind: "not-baselined" };
  if (!item && !completeness.baselineItemsComplete) {
    return { kind: "unavailable-partial" };
  }
  if (!item) return { kind: "added" };
  const dates = normalizePortfolioScheduleDates(item);
  const hasMalformedDate = (
    [
      ["plannedStartAt", item.plannedStartAt],
      ["plannedEndAt", item.plannedEndAt],
      ["dueAt", item.dueAt],
    ] as const
  ).some(
    ([key, value]) =>
      value !== null && value !== undefined && !dates[key],
  );
  if (hasMalformedDate) return { kind: "invalid" };
  if (!dates.plannedStartAt && !dates.plannedEndAt && !dates.dueAt) {
    return { kind: "not-baselined" };
  }
  return { kind: "scheduled", dates };
}

function nowCalendarDate(
  now: string | Date,
  calendar: PortfolioScheduleCalendar,
): string | null {
  return portfolioCalendarDate(
    now instanceof Date ? now.toISOString() : now,
    calendar,
  );
}

export function getPortfolioJobScheduleState(
  job: Pick<
    ProjectScheduleJob,
    "status" | "plannedStartAt" | "plannedEndAt"
  >,
  now: string | Date,
  calendar: PortfolioScheduleCalendar,
): ScheduleState {
  if (job.status === "complete" || job.status === "closed") return "complete";
  if (job.status === "blocked") return "blocked";
  const dates = normalizePortfolioScheduleDates(job);
  const finish = dates.plannedEndAt
    ? portfolioCalendarDate(dates.plannedEndAt, calendar)
    : null;
  const today = nowCalendarDate(now, calendar);
  if (finish && today && finish < today) return "overdue";
  if (!dates.plannedStartAt && !dates.plannedEndAt) return "unscheduled";
  return "remaining";
}

export function getPortfolioTaskScheduleState(
  task: Pick<
    ProjectScheduleTask,
    "status" | "plannedStartAt" | "plannedEndAt" | "dueAt"
  >,
  now: string | Date,
  calendar: PortfolioScheduleCalendar,
): ScheduleState {
  if (task.status === "done") return "complete";
  const dates = normalizePortfolioScheduleDates(task);
  const finishValue = dates.plannedEndAt ?? dates.dueAt;
  const finish = finishValue
    ? portfolioCalendarDate(finishValue, calendar)
    : null;
  const today = nowCalendarDate(now, calendar);
  if (finish && today && finish < today) return "overdue";
  if (
    !dates.plannedStartAt &&
    !dates.plannedEndAt &&
    !dates.dueAt
  ) {
    return "unscheduled";
  }
  return "remaining";
}

export type PortfolioResourceGeometry =
  | { kind: "range"; left: number; width: number }
  | { kind: "milestone"; position: number }
  | { kind: "unscheduled" };

export function getPortfolioResourceGeometry(
  dates: ScheduleDates,
  calendar: PortfolioScheduleCalendar,
  window: ScheduleWindow,
): PortfolioResourceGeometry | null {
  const normalized = normalizePortfolioScheduleDates(dates);
  const columns = window.columns.flatMap((column) => {
    const start = localScheduleDateKey(column.start);
    const end = localScheduleDateKey(column.end);
    return start && end ? [{ start, end }] : [];
  });
  if (columns.length === 0) return null;

  if (normalized.plannedStartAt && normalized.plannedEndAt) {
    const start = portfolioCalendarDate(
      normalized.plannedStartAt,
      calendar,
    );
    const end = portfolioCalendarDate(normalized.plannedEndAt, calendar);
    if (!start || !end || start > end) return null;
    const firstDate = columns[0]!.start;
    const lastDate = columns.at(-1)!.end;
    if (end < firstDate || start > lastDate) return null;
    const startIndex =
      start <= firstDate
        ? 0
        : columns.findIndex(
            (column) => start >= column.start && start <= column.end,
          );
    const endIndex =
      end >= lastDate
        ? columns.length - 1
        : columns.findIndex(
            (column) => end >= column.start && end <= column.end,
          );
    if (startIndex < 0 || endIndex < startIndex) return null;
    const left = (startIndex * 100) / columns.length;
    return {
      kind: "range",
      left,
      width: ((endIndex - startIndex + 1) * 100) / columns.length,
    };
  }

  const milestone =
    normalized.plannedStartAt ??
    normalized.plannedEndAt ??
    normalized.dueAt;
  if (!milestone) return { kind: "unscheduled" };
  const date = portfolioCalendarDate(milestone, calendar);
  if (!date) return { kind: "unscheduled" };
  const index = columns.findIndex(
    (column) => date >= column.start && date <= column.end,
  );
  if (index < 0) return null;
  return {
    kind: "milestone",
    position: ((index + 0.5) * 100) / columns.length,
  };
}

function earliest(values: readonly DatedValue[]): string | null {
  let result: DatedValue | null = null;
  for (const value of values) {
    if (!result || value.timestamp < result.timestamp) result = value;
  }
  return result?.value ?? null;
}

function latest(values: readonly DatedValue[]): string | null {
  let result: DatedValue | null = null;
  for (const value of values) {
    if (!result || value.timestamp > result.timestamp) result = value;
  }
  return result?.value ?? null;
}

export function getPortfolioProjectRange(
  project: PortfolioScheduleProject,
): PortfolioProjectRange {
  const starts: DatedValue[] = [];
  const finishes: DatedValue[] = [];

  for (const job of project.jobs) {
    const jobStart = validDate(job.plannedStartAt);
    const jobFinish = validDate(job.plannedEndAt);
    if (jobStart) starts.push(jobStart);
    else if (jobFinish) starts.push(jobFinish);
    if (jobFinish) finishes.push(jobFinish);
    else if (jobStart) finishes.push(jobStart);

    for (const task of job.tasks) {
      const taskStart = validDate(task.plannedStartAt);
      const taskFinish = validDate(task.plannedEndAt);
      const taskDue = validDate(task.dueAt);
      const taskMilestone = taskStart ?? taskFinish ?? taskDue;

      if (taskMilestone) starts.push(taskMilestone);
      if (taskFinish) finishes.push(taskFinish);
      if (taskDue) finishes.push(taskDue);
      if (!taskFinish && !taskDue && taskStart) finishes.push(taskStart);
    }
  }

  return {
    start: earliest(starts),
    finish: latest(finishes),
  };
}

export function getPortfolioProjectState(
  project: PortfolioScheduleProject,
  now = new Date(),
): ScheduleState {
  if (project.status === "closed") return "complete";

  if (
    project.jobs.some(
      (job) => portfolioJobState(job, now, project.calendar) === "blocked",
    )
  ) {
    return "blocked";
  }

  if (
    project.jobs.some(
      (job) =>
        portfolioJobState(job, now, project.calendar) === "overdue" ||
        job.tasks.some(
          (task) =>
            portfolioTaskState(task, now, project.calendar) === "overdue",
        ),
    )
  ) {
    return "overdue";
  }

  const range = getPortfolioProjectRange(project);
  if (project.jobs.length === 0 || (!range.start && !range.finish)) {
    return "unscheduled";
  }
  return "remaining";
}

function latestBaselineFinish(
  baseline: PortfolioScheduleBaseline | null,
): string | null {
  if (!baseline) return null;
  const finishes: DatedValue[] = [];
  for (const item of baseline.items) {
    const plannedFinish = validDate(item.plannedEndAt);
    const due = validDate(item.dueAt);
    if (plannedFinish) finishes.push(plannedFinish);
    if (due) finishes.push(due);
  }
  return latest(finishes);
}

function portfolioJobState(
  job: ProjectScheduleJob,
  now: Date,
  calendar: ResolvedWorkingCalendar,
): ScheduleState {
  return getPortfolioJobScheduleState(
    {
      ...job,
      plannedStartAt: validScheduleDate(job.plannedStartAt),
      plannedEndAt: validScheduleDate(job.plannedEndAt),
    },
    now,
    calendar,
  );
}

function portfolioTaskState(
  task: ProjectScheduleTask,
  now: Date,
  calendar: ResolvedWorkingCalendar,
): ScheduleState {
  return getPortfolioTaskScheduleState(
    {
      ...task,
      dueAt: validScheduleDate(task.dueAt),
      plannedStartAt: validScheduleDate(task.plannedStartAt),
      plannedEndAt: validScheduleDate(task.plannedEndAt),
    },
    now,
    calendar,
  );
}

function cloneJob(
  job: ProjectScheduleJob,
  tasks: readonly ProjectScheduleTask[] = job.tasks,
): ProjectScheduleJob {
  return {
    ...job,
    tasks: tasks.map((task) => ({ ...task })),
  };
}

function cloneProject(
  project: PortfolioScheduleProject,
): PortfolioScheduleProject {
  return {
    ...project,
    calendar: {
      ...project.calendar,
      weekendDays: [...project.calendar.weekendDays],
      exceptions: project.calendar.exceptions.map((exception) => ({
        ...exception,
      })),
    },
    latestBaseline: project.latestBaseline
      ? {
          ...project.latestBaseline,
          items: project.latestBaseline.items.map((item) => ({ ...item })),
        }
      : null,
    jobs: project.jobs.map((job) => cloneJob(job)),
    dependencies: project.dependencies.map((dependency) => ({
      ...dependency,
    })),
  };
}

function projectWarnings(
  project: PortfolioScheduleProject,
  now: Date,
): {
  warningCounts: ProjectedPortfolioProject["warningCounts"];
  criticalTaskIds: ReadonlySet<string>;
} {
  let blocked = 0;
  let overdue = 0;
  let unscheduled = 0;
  const tasks = project.jobs.flatMap((job) => job.tasks);

  for (const job of project.jobs) {
    const state = portfolioJobState(job, now, project.calendar);
    if (state === "blocked") blocked += 1;
    if (state === "overdue") overdue += 1;
    if (state === "unscheduled") unscheduled += 1;

    for (const task of job.tasks) {
      const taskState = portfolioTaskState(task, now, project.calendar);
      if (taskState === "overdue") overdue += 1;
      if (taskState === "unscheduled") unscheduled += 1;
    }
  }

  const criticalPath = calculateCriticalPath(
    tasks.map((task) => ({
      ...task,
      plannedStartAt: validScheduleDate(task.plannedStartAt),
      plannedEndAt: validScheduleDate(task.plannedEndAt),
    })),
    project.dependencies.filter(
      (dependency) => dependency.projectId === project.id,
    ),
    project.calendar,
  );
  const criticalTaskIds = criticalPath.ok
    ? criticalPath.criticalTaskIds
    : new Set<string>();
  return {
    criticalTaskIds,
    warningCounts: {
      blocked,
      overdue,
      unscheduled,
      critical: criticalTaskIds.size,
    },
  };
}

export function buildPortfolioProjects(
  projects: readonly PortfolioScheduleProject[],
  now = new Date(),
): ProjectedPortfolioProject[] {
  return projects.map((sourceProject) => {
    const project = cloneProject(sourceProject);
    const tasks = project.jobs.flatMap((job) => job.tasks);
    const range = getPortfolioProjectRange(project);
    const baselineFinish = latestBaselineFinish(project.latestBaseline);
    const warnings = projectWarnings(project, now);
    return {
      ...project,
      state: getPortfolioProjectState(project, now),
      range,
      progress: getTaskProgress(tasks),
      criticalTaskIds: warnings.criticalTaskIds,
      warningCounts: warnings.warningCounts,
      baselineFinishVarianceDays:
        range.finish && baselineFinish
          ? workingDayDifference(
              baselineFinish,
              range.finish,
              project.calendar,
            )
          : null,
    };
  });
}

function freezeAssignmentCalendar(
  calendar: ResolvedWorkingCalendar,
): PortfolioScheduleCalendar {
  const exceptions = calendar.exceptions.map((exception) =>
    Object.freeze({ ...exception }),
  );
  return Object.freeze({
    ...calendar,
    weekendDays: Object.freeze([...calendar.weekendDays]),
    exceptions: Object.freeze(exceptions),
  });
}

export function buildPortfolioScheduleAssignments(
  projects: readonly PortfolioScheduleProject[],
): PortfolioScheduleAssignment[] {
  const calendarsBySource = new WeakMap<
    ResolvedWorkingCalendar,
    PortfolioScheduleCalendar
  >();
  const calendarsBySignature = new Map<
    string,
    PortfolioScheduleCalendar
  >();
  return projects.flatMap((project) =>
    buildScheduleAssignments(project.jobs).map((assignment) => {
      let frozenCalendar = calendarsBySource.get(project.calendar);
      if (!frozenCalendar) {
        const signature = portfolioCalendarSignature(project.calendar);
        frozenCalendar = calendarsBySignature.get(signature);
        if (!frozenCalendar) {
          frozenCalendar = freezeAssignmentCalendar(project.calendar);
          calendarsBySignature.set(signature, frozenCalendar);
        }
        calendarsBySource.set(project.calendar, frozenCalendar);
      }
      return {
        ...assignment,
        ...normalizePortfolioScheduleDates(assignment),
        projectId: project.id,
        projectName: project.name,
        calendar: frozenCalendar,
      };
    }),
  );
}

export const PORTFOLIO_UNASSIGNED_RESOURCE_KEY =
  "\u0000portfolio-unassigned";

function normalizedResource(value: string | null): {
  key: string;
  displayName: string;
} {
  const displayName = value?.trim().replace(/\s+/g, " ");
  if (!displayName) {
    return {
      key: PORTFOLIO_UNASSIGNED_RESOURCE_KEY,
      displayName: "Unassigned",
    };
  }
  return { key: displayName.toLowerCase(), displayName };
}

function compareLexical(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function dateOrdinal(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year!, month! - 1, day!) / 86_400_000);
}

function dateFromOrdinal(value: number): string {
  return new Date(value * 86_400_000).toISOString().slice(0, 10);
}

type PortfolioAssignmentRange = {
  startOrdinal: number;
  endOrdinal: number;
};

function portfolioAssignmentRange(
  assignment: PortfolioScheduleAssignment,
): PortfolioAssignmentRange | null {
  if (!assignment.plannedStartAt || !assignment.plannedEndAt) return null;
  const start = portfolioCalendarDate(
    assignment.plannedStartAt,
    assignment.calendar,
  );
  const end = portfolioCalendarDate(
    assignment.plannedEndAt,
    assignment.calendar,
  );
  if (!start || !end) return null;
  const startOrdinal = dateOrdinal(start);
  const endOrdinal = dateOrdinal(end);
  if (startOrdinal > endOrdinal) return null;
  return { startOrdinal, endOrdinal };
}

type PortfolioCalendarProfile = {
  weekendDays: ReadonlySet<number>;
  exceptions: ReadonlyMap<string, boolean>;
  exceptionOrdinals: readonly number[];
};

export type PortfolioOverlapDiagnostics = {
  signatureBuilds: number;
  calendarIndexBuilds: number;
  pairIndexBuilds: number;
  workingDateEvaluations: number;
  rangeQueries: number;
};

export function createPortfolioOverlapDiagnostics(): PortfolioOverlapDiagnostics {
  return {
    signatureBuilds: 0,
    calendarIndexBuilds: 0,
    pairIndexBuilds: 0,
    workingDateEvaluations: 0,
    rangeQueries: 0,
  };
}

function normalizedCalendarParts(calendar: PortfolioScheduleCalendar): {
  weekendDays: number[];
  exceptions: Array<[string, boolean]>;
} {
  const weekendDays = [...new Set(calendar.weekendDays)].sort(
    (left, right) => left - right,
  );
  const exceptions = new Map<string, boolean>();
  for (const exception of calendar.exceptions) {
    const date = validDate(exception.date)?.value;
    if (date && ISO_DATE.test(date) && !exceptions.has(date)) {
      exceptions.set(date, exception.isWorkingDay);
    }
  }
  return {
    weekendDays,
    exceptions: [...exceptions.entries()].sort(([left], [right]) =>
      compareLexical(left, right),
    ),
  };
}

export function portfolioCalendarSignature(
  calendar: PortfolioScheduleCalendar,
): string {
  const normalized = normalizedCalendarParts(calendar);
  return normalizedCalendarSignature(calendar.timeZone, normalized);
}

function normalizedCalendarSignature(
  timeZone: string,
  normalized: ReturnType<typeof normalizedCalendarParts>,
): string {
  return JSON.stringify([
    timeZone,
    normalized.weekendDays,
    normalized.exceptions,
  ]);
}

type CalendarPairSearch = {
  regularSharedWorkingDay: boolean;
  sharedExceptionOrdinals: readonly number[];
  nextWorkingMemo: Map<number, number>;
};

class PortfolioCalendarQueryCache {
  private readonly calendarProfileIds = new WeakMap<
    PortfolioScheduleCalendar,
    number
  >();
  private readonly signatureProfileIds = new Map<string, number>();
  private readonly profiles = new Map<number, PortfolioCalendarProfile>();
  private readonly pairs = new Map<
    number,
    Map<number, CalendarPairSearch>
  >();

  constructor(
    private readonly diagnostics?: PortfolioOverlapDiagnostics,
  ) {}

  profileId(calendar: PortfolioScheduleCalendar): number {
    const existing = this.calendarProfileIds.get(calendar);
    if (existing !== undefined) return existing;
    const normalized = normalizedCalendarParts(calendar);
    const signature = normalizedCalendarSignature(
      calendar.timeZone,
      normalized,
    );
    if (this.diagnostics) this.diagnostics.signatureBuilds += 1;
    let profileId = this.signatureProfileIds.get(signature);
    if (profileId === undefined) {
      profileId = this.profiles.size;
      this.signatureProfileIds.set(signature, profileId);
      this.profiles.set(profileId, {
        weekendDays: new Set(normalized.weekendDays),
        exceptions: new Map(normalized.exceptions),
        exceptionOrdinals: normalized.exceptions.map(([date]) =>
          dateOrdinal(date),
        ),
      });
      if (this.diagnostics) this.diagnostics.calendarIndexBuilds += 1;
    }
    this.calendarProfileIds.set(calendar, profileId);
    return profileId;
  }

  isWorkingOrdinal(profileId: number, ordinal: number): boolean {
    const profile = this.profiles.get(profileId)!;
    const exception = profile.exceptions.get(dateFromOrdinal(ordinal));
    if (exception !== undefined) return exception;
    const day = ((ordinal + 4) % 7 + 7) % 7;
    return !profile.weekendDays.has(day);
  }

  firstSharedWorkingOrdinal(
    leftProfileId: number,
    rightProfileId: number,
    start: number,
    end: number,
  ): number | null {
    if (this.diagnostics) this.diagnostics.rangeQueries += 1;
    const pair = this.getPair(leftProfileId, rightProfileId);
    if (!pair.regularSharedWorkingDay) {
      const index = lowerBound(pair.sharedExceptionOrdinals, start);
      const candidate = pair.sharedExceptionOrdinals[index];
      return candidate !== undefined && candidate <= end ? candidate : null;
    }

    const trail: number[] = [];
    let cursor = start;
    let result = pair.nextWorkingMemo.get(cursor);
    while (result === undefined) {
      trail.push(cursor);
      if (this.diagnostics) this.diagnostics.workingDateEvaluations += 1;
      if (
        this.isWorkingOrdinal(leftProfileId, cursor) &&
        this.isWorkingOrdinal(rightProfileId, cursor)
      ) {
        result = cursor;
        break;
      }
      cursor += 1;
      result = pair.nextWorkingMemo.get(cursor);
    }
    for (const ordinal of trail) {
      pair.nextWorkingMemo.set(ordinal, result);
    }
    return result <= end ? result : null;
  }

  private getPair(
    leftProfileId: number,
    rightProfileId: number,
  ): CalendarPairSearch {
    const firstProfileId = Math.min(leftProfileId, rightProfileId);
    const secondProfileId = Math.max(leftProfileId, rightProfileId);
    const firstPairs = this.pairs.get(firstProfileId);
    const existing = firstPairs?.get(secondProfileId);
    if (existing) return existing;
    const first = this.profiles.get(firstProfileId)!;
    const second = this.profiles.get(secondProfileId)!;
    const regularSharedWorkingDay = Array.from(
      { length: 7 },
      (_, day) =>
        !first.weekendDays.has(day) && !second.weekendDays.has(day),
    ).some(Boolean);
    const exceptionOrdinals = [
      ...new Set([
        ...first.exceptionOrdinals,
        ...second.exceptionOrdinals,
      ]),
    ].sort((left, right) => left - right);
    const sharedExceptionOrdinals = regularSharedWorkingDay
      ? []
      : exceptionOrdinals.filter(
          (ordinal) =>
            this.isWorkingOrdinal(firstProfileId, ordinal) &&
            this.isWorkingOrdinal(secondProfileId, ordinal),
        );
    if (this.diagnostics) {
      this.diagnostics.pairIndexBuilds += 1;
      if (!regularSharedWorkingDay) {
        this.diagnostics.workingDateEvaluations +=
          exceptionOrdinals.length;
      }
    }
    const pair = {
      regularSharedWorkingDay,
      sharedExceptionOrdinals,
      nextWorkingMemo: new Map<number, number>(),
    };
    const pairs = firstPairs ?? new Map<number, CalendarPairSearch>();
    pairs.set(secondProfileId, pair);
    if (!firstPairs) this.pairs.set(firstProfileId, pairs);
    return pair;
  }
}

export function isPortfolioWorkingDay(
  date: string,
  calendar: PortfolioScheduleCalendar,
): boolean {
  const localDate = portfolioCalendarDate(date, calendar);
  if (!localDate) return false;
  const queries = new PortfolioCalendarQueryCache();
  const profileId = queries.profileId(calendar);
  return queries.isWorkingOrdinal(
    profileId,
    dateOrdinal(localDate),
  );
}

export type PortfolioWorkingDaySegment = {
  startPercent: number;
  endPercent: number;
  isWorkingDay: boolean;
};

export function getPortfolioWorkingDaySegments(
  window: ScheduleWindow,
  calendar: PortfolioScheduleCalendar,
): PortfolioWorkingDaySegment[] {
  const queries = new PortfolioCalendarQueryCache();
  const profileId = queries.profileId(calendar);
  return window.columns.map((column, index) => {
    const date = localScheduleDateKey(column.start);
    const isWorking =
      window.columns.length !== 42 ||
      !date ||
      queries.isWorkingOrdinal(profileId, dateOrdinal(date));
    return {
      startPercent: (index * 100) / window.columns.length,
      endPercent: ((index + 1) * 100) / window.columns.length,
      isWorkingDay: isWorking,
    };
  });
}

export function getPortfolioWorkingDayGradient(
  window: ScheduleWindow,
  calendar: PortfolioScheduleCalendar,
): string {
  const stops = getPortfolioWorkingDaySegments(window, calendar).flatMap(
    (segment, index) => {
      const fill = segment.isWorkingDay
        ? "transparent"
        : "color-mix(in oklab, var(--muted) 50%, transparent)";
      if (index === 0) {
        return [
          `${fill} ${segment.startPercent}%`,
          `${fill} ${segment.endPercent}%`,
        ];
      }
      return [
        `var(--border) ${segment.startPercent}%`,
        `var(--border) calc(${segment.startPercent}% + 1px)`,
        `${fill} calc(${segment.startPercent}% + 1px)`,
        `${fill} ${segment.endPercent}%`,
      ];
    },
  );
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

function lowerBound(values: readonly number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (values[middle]! < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

class FenwickMultiset {
  private readonly counts: Int32Array;
  private total = 0;

  constructor(private readonly values: readonly number[]) {
    this.counts = new Int32Array(values.length + 1);
  }

  add(value: number): void {
    let index = lowerBound(this.values, value) + 1;
    while (index < this.counts.length) {
      this.counts[index] += 1;
      index += index & -index;
    }
    this.total += 1;
  }

  countAtLeast(value: number): number {
    return this.total - this.prefix(lowerBound(this.values, value));
  }

  private prefix(length: number): number {
    let result = 0;
    let index = length;
    while (index > 0) {
      result += this.counts[index]!;
      index -= index & -index;
    }
    return result;
  }
}

const PORTFOLIO_ROLE_ORDER: ScheduleAssignmentRole[] = [
  "Project manager",
  "Foreman",
  "Task assignee",
];

function assignmentSortDate(
  assignment: PortfolioScheduleAssignment,
): number | null {
  const value =
    assignment.plannedStartAt ??
    assignment.plannedEndAt ??
    assignment.dueAt;
  if (!value) return null;
  const localDate = portfolioCalendarDate(value, assignment.calendar);
  return localDate ? dateOrdinal(localDate) : null;
}

function comparePortfolioAssignments(
  left: PortfolioScheduleAssignment,
  right: PortfolioScheduleAssignment,
): number {
  const leftDate = assignmentSortDate(left);
  const rightDate = assignmentSortDate(right);
  if (leftDate !== null && rightDate === null) return -1;
  if (leftDate === null && rightDate !== null) return 1;
  if (leftDate !== rightDate) return (leftDate ?? 0) - (rightDate ?? 0);
  return (
    compareLexical(left.projectName, right.projectName) ||
    compareLexical(left.projectId, right.projectId) ||
    compareLexical(left.label, right.label) ||
    PORTFOLIO_ROLE_ORDER.indexOf(left.role) -
      PORTFOLIO_ROLE_ORDER.indexOf(right.role) ||
    compareLexical(left.entityType, right.entityType) ||
    compareLexical(left.entityId, right.entityId) ||
    compareLexical(left.id, right.id)
  );
}

export function buildPortfolioResourceLanes(
  assignments: readonly PortfolioScheduleAssignment[],
  diagnostics = createPortfolioOverlapDiagnostics(),
): PortfolioResourceLane[] {
  const calendarQueries = new PortfolioCalendarQueryCache(diagnostics);
  const groups = new Map<
    string,
    {
      displayName: string;
      roles: Set<ScheduleAssignmentRole>;
      assignments: PortfolioScheduleAssignment[];
    }
  >();
  for (const assignment of assignments) {
    const resource = normalizedResource(assignment.resource);
    const group = groups.get(resource.key) ?? {
      displayName: resource.displayName,
      roles: new Set<ScheduleAssignmentRole>(),
      assignments: [],
    };
    group.roles.add(assignment.role);
    group.assignments.push(assignment);
    groups.set(resource.key, group);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const sorted = [...group.assignments].sort(comparePortfolioAssignments);
      const overlapping = new Set<PortfolioScheduleAssignment>();
      let potentialOverlapCount = 0;

      if (key !== PORTFOLIO_UNASSIGNED_RESOURCE_KEY) {
        const ranged = sorted
          .flatMap((assignment) => {
            const range = portfolioAssignmentRange(assignment);
            return range
              ? [
                  {
                    assignment,
                    range,
                    profileId: calendarQueries.profileId(
                      assignment.calendar,
                    ),
                  },
                ]
              : [];
          })
          .sort(
            (left, right) =>
              left.range.startOrdinal - right.range.startOrdinal ||
              comparePortfolioAssignments(
                left.assignment,
                right.assignment,
              ),
          )
          .map((item, order) => ({ ...item, order }));
        const membersByProfile = new Map<
          number,
          typeof ranged
        >();
        for (const item of ranged) {
          const members = membersByProfile.get(item.profileId);
          if (members) members.push(item);
          else membersByProfile.set(item.profileId, [item]);
        }
        const activeGroups = new Map<
          number,
          {
            ends: FenwickMultiset;
            maxInsertedEnd: number;
            members: typeof ranged;
            events: Array<{ afterOrder: number; minimumEnd: number }>;
          }
        >();
        for (const [profileId, members] of membersByProfile) {
          const endValues = [
            ...new Set(members.map((item) => item.range.endOrdinal)),
          ].sort((left, right) => left - right);
          activeGroups.set(profileId, {
            ends: new FenwickMultiset(endValues),
            maxInsertedEnd: Number.NEGATIVE_INFINITY,
            members,
            events: [],
          });
        }

        const activeProfileIds = new Set<number>();
        for (const item of ranged) {
          let currentConflictCount = 0;
          for (const activeProfileId of activeProfileIds) {
            const activeGroup = activeGroups.get(activeProfileId)!;
            if (
              activeGroup.maxInsertedEnd <
              item.range.startOrdinal
            ) {
              activeProfileIds.delete(activeProfileId);
              continue;
            }
            const firstShared =
              calendarQueries.firstSharedWorkingOrdinal(
                activeProfileId,
                item.profileId,
                item.range.startOrdinal,
                item.range.endOrdinal,
              );
            if (firstShared === null) continue;
            const conflictCount =
              activeGroup.ends.countAtLeast(firstShared);
            if (conflictCount === 0) continue;
            currentConflictCount += conflictCount;
            activeGroup.events.push({
              afterOrder: item.order,
              minimumEnd: firstShared,
            });
          }
          if (currentConflictCount > 0) {
            potentialOverlapCount += currentConflictCount;
            overlapping.add(item.assignment);
          }
          const ownGroup = activeGroups.get(item.profileId)!;
          ownGroup.ends.add(item.range.endOrdinal);
          ownGroup.maxInsertedEnd = Math.max(
            ownGroup.maxInsertedEnd,
            item.range.endOrdinal,
          );
          activeProfileIds.add(item.profileId);
        }

        for (const activeGroup of activeGroups.values()) {
          let eventIndex = activeGroup.events.length - 1;
          let minimumEnd = Number.POSITIVE_INFINITY;
          for (
            let memberIndex = activeGroup.members.length - 1;
            memberIndex >= 0;
            memberIndex -= 1
          ) {
            const member = activeGroup.members[memberIndex]!;
            while (
              eventIndex >= 0 &&
              activeGroup.events[eventIndex]!.afterOrder >
                member.order
            ) {
              minimumEnd = Math.min(
                minimumEnd,
                activeGroup.events[eventIndex]!.minimumEnd,
              );
              eventIndex -= 1;
            }
            if (member.range.endOrdinal >= minimumEnd) {
              overlapping.add(member.assignment);
            }
          }
        }
      }

      return {
        key,
        displayName: group.displayName,
        roles: PORTFOLIO_ROLE_ORDER.filter((role) => group.roles.has(role)),
        assignments: sorted.map((assignment) => ({
          ...assignment,
          hasPotentialOverlap: overlapping.has(assignment),
        })),
        potentialOverlapCount,
      };
    })
    .sort((left, right) => {
      if (left.key === PORTFOLIO_UNASSIGNED_RESOURCE_KEY) return 1;
      if (right.key === PORTFOLIO_UNASSIGNED_RESOURCE_KEY) return -1;
      return compareLexical(left.key, right.key);
    });
}

function calendarDayOrdinal(
  value: string | null,
  calendar: ResolvedWorkingCalendar,
): number | null {
  const validated = validDate(value);
  if (!validated) return null;
  const localDate = portfolioCalendarDate(validated.value, calendar);
  const local = validDate(localDate);
  return local ? Math.floor(local.timestamp / 86_400_000) : null;
}

function intersectsDateRange(
  project: ProjectedPortfolioProject,
  from: string | null,
  to: string | null,
): boolean {
  const fromDay = calendarDayOrdinal(from, project.calendar);
  const toDay = calendarDayOrdinal(to, project.calendar);
  if (fromDay === null && toDay === null) return true;
  const startDay = calendarDayOrdinal(project.range.start, project.calendar);
  const finishDay = calendarDayOrdinal(project.range.finish, project.calendar);
  if (startDay === null || finishDay === null) return false;
  return (
    (fromDay === null || finishDay >= fromDay) &&
    (toDay === null || startDay <= toDay)
  );
}

function matchesAttention(
  project: ProjectedPortfolioProject,
  filter: PortfolioProjectionFilter,
): boolean {
  if (filter.attention === "behind-baseline") {
    return (project.baselineFinishVarianceDays ?? 0) > 0;
  }
  if (filter.attention === "resource-overlap") {
    return filter.overlapProjectIds.has(project.id);
  }
  return true;
}

function filterPortfolioJobs(
  jobs: readonly ProjectScheduleJob[],
  state: PortfolioProjectionFilter["state"],
  now: Date,
  calendar: ResolvedWorkingCalendar,
): ProjectScheduleJob[] {
  if (state === "all") return jobs.map((job) => cloneJob(job));

  return jobs.flatMap((job) => {
    const jobState = portfolioJobState(job, now, calendar);
    const jobMatches = matchesScheduleFilter(jobState, state);
    const tasks =
      state === "blocked" && jobState === "blocked"
        ? job.tasks
        : job.tasks.filter((task) =>
            matchesScheduleFilter(
              portfolioTaskState(task, now, calendar),
              state,
            ),
          );
    return jobMatches || tasks.length > 0 ? [cloneJob(job, tasks)] : [];
  });
}

export function filterPortfolioProjects(
  projects: readonly ProjectedPortfolioProject[],
  filter: PortfolioProjectionFilter,
  now = new Date(),
): ProjectedPortfolioProject[] {
  return projects.flatMap((project) => {
    if (!intersectsDateRange(project, filter.from, filter.to)) return [];
    if (!matchesAttention(project, filter)) return [];
    if (filter.hideCompleted && project.state === "complete") return [];

    const projectMatches = matchesScheduleFilter(project.state, filter.state);
    let jobs = filterPortfolioJobs(
      project.jobs,
      filter.state,
      now,
      project.calendar,
    );
    if (!projectMatches && jobs.length === 0) return [];

    if (filter.hideCompleted) {
      jobs = hideCompletedScheduleRows(jobs);
    }
    return [{ ...project, jobs }];
  });
}
