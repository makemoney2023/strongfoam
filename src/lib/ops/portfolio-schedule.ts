import { calculateCriticalPath } from "@/lib/ops/project-schedule-graph";
import {
  filterScheduleJobs,
  getJobScheduleState,
  getTaskProgress,
  getTaskScheduleState,
  hideCompletedScheduleRows,
  matchesScheduleFilter,
  type ProjectScheduleBaselineItem,
  type ProjectScheduleDependency,
  type ProjectScheduleJob,
  type ScheduleState,
} from "@/lib/ops/project-schedule";
import {
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

function validDate(value: string | null | undefined): DatedValue | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : { value, timestamp };
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
      (job) => getJobScheduleState(job, now) === "blocked",
    )
  ) {
    return "blocked";
  }

  if (
    project.jobs.some(
      (job) =>
        getJobScheduleState(job, now) === "overdue" ||
        job.tasks.some(
          (task) => getTaskScheduleState(task, now) === "overdue",
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

function warningCounts(
  project: PortfolioScheduleProject,
  now: Date,
): ProjectedPortfolioProject["warningCounts"] {
  let blocked = 0;
  let overdue = 0;
  let unscheduled = 0;
  const tasks = project.jobs.flatMap((job) => job.tasks);

  for (const job of project.jobs) {
    const state = getJobScheduleState(job, now);
    if (state === "blocked") blocked += 1;
    if (state === "overdue") overdue += 1;
    if (state === "unscheduled") unscheduled += 1;

    for (const task of job.tasks) {
      const taskState = getTaskScheduleState(task, now);
      if (taskState === "overdue") overdue += 1;
      if (taskState === "unscheduled") unscheduled += 1;
    }
  }

  const criticalPath = calculateCriticalPath(
    tasks,
    project.dependencies,
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
  return projects.map((project) => {
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

function intersectsDateRange(
  project: ProjectedPortfolioProject,
  from: string | null,
  to: string | null,
): boolean {
  if (!from && !to) return true;
  const start = validDate(project.range.start);
  const finish = validDate(project.range.finish);
  if (!start || !finish) return false;
  const fromDate = validDate(from);
  const toDate = validDate(to);
  return (
    (!fromDate || finish.timestamp >= fromDate.timestamp) &&
    (!toDate || start.timestamp <= toDate.timestamp)
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
    let jobs =
      filter.state === "all"
        ? project.jobs
        : filterScheduleJobs(project.jobs, filter.state, now);
    if (!projectMatches && jobs.length === 0) return [];

    if (filter.hideCompleted) {
      jobs = hideCompletedScheduleRows(jobs);
    }
    return [{ ...project, jobs }];
  });
}
