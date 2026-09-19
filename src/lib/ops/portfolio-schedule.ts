import { calculateCriticalPath } from "@/lib/ops/project-schedule-graph";
import {
  getJobScheduleState,
  getTaskProgress,
  getTaskScheduleState,
  hideCompletedScheduleRows,
  matchesScheduleFilter,
  type ProjectScheduleBaselineItem,
  type ProjectScheduleDependency,
  type ProjectScheduleJob,
  type ProjectScheduleTask,
  type ScheduleState,
} from "@/lib/ops/project-schedule";
import {
  calendarDate,
  workingDayDifference,
  type ResolvedWorkingCalendar,
} from "@/lib/ops/project-schedule-planning";

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
  warningCounts: {
    blocked: number;
    overdue: number;
    unscheduled: number;
    critical: number;
  };
  baselineFinishVarianceDays: number | null;
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
      (job) => portfolioJobState(job, now) === "blocked",
    )
  ) {
    return "blocked";
  }

  if (
    project.jobs.some(
      (job) =>
        portfolioJobState(job, now) === "overdue" ||
        job.tasks.some(
          (task) => portfolioTaskState(task, now) === "overdue",
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
): ScheduleState {
  return getJobScheduleState(
    {
      ...job,
      plannedStartAt: validScheduleDate(job.plannedStartAt),
      plannedEndAt: validScheduleDate(job.plannedEndAt),
    },
    now,
  );
}

function portfolioTaskState(
  task: ProjectScheduleTask,
  now: Date,
): ScheduleState {
  return getTaskScheduleState(
    {
      ...task,
      dueAt: validScheduleDate(task.dueAt),
      plannedStartAt: validScheduleDate(task.plannedStartAt),
      plannedEndAt: validScheduleDate(task.plannedEndAt),
    },
    now,
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

function warningCounts(
  project: PortfolioScheduleProject,
  now: Date,
): ProjectedPortfolioProject["warningCounts"] {
  let blocked = 0;
  let overdue = 0;
  let unscheduled = 0;
  const tasks = project.jobs.flatMap((job) => job.tasks);

  for (const job of project.jobs) {
    const state = portfolioJobState(job, now);
    if (state === "blocked") blocked += 1;
    if (state === "overdue") overdue += 1;
    if (state === "unscheduled") unscheduled += 1;

    for (const task of job.tasks) {
      const taskState = portfolioTaskState(task, now);
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
  return {
    blocked,
    overdue,
    unscheduled,
    critical: criticalPath.ok ? criticalPath.criticalTaskIds.size : 0,
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
    return {
      ...project,
      state: getPortfolioProjectState(project, now),
      range,
      progress: getTaskProgress(tasks),
      warningCounts: warningCounts(project, now),
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

function calendarDayOrdinal(
  value: string | null,
  calendar: ResolvedWorkingCalendar,
): number | null {
  const validated = validDate(value);
  if (!validated) return null;
  const localDate = calendarDate(validated.value, calendar);
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
): ProjectScheduleJob[] {
  if (state === "all") return jobs.map((job) => cloneJob(job));

  return jobs.flatMap((job) => {
    const jobState = portfolioJobState(job, now);
    const jobMatches = matchesScheduleFilter(jobState, state);
    const tasks =
      state === "blocked" && jobState === "blocked"
        ? job.tasks
        : job.tasks.filter((task) =>
            matchesScheduleFilter(portfolioTaskState(task, now), state),
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
    let jobs = filterPortfolioJobs(project.jobs, filter.state, now);
    if (!projectMatches && jobs.length === 0) return [];

    if (filter.hideCompleted) {
      jobs = hideCompletedScheduleRows(jobs);
    }
    return [{ ...project, jobs }];
  });
}
