import type { JobStatus } from "@/lib/ops/jobs";

export const SCHEDULE_ZOOMS = ["week", "month"] as const;
export type ScheduleZoom = (typeof SCHEDULE_ZOOMS)[number];

export const SCHEDULE_FILTERS = [
  "all",
  "remaining",
  "complete",
  "blocked",
  "overdue",
  "unscheduled",
] as const;
export type ScheduleFilter = (typeof SCHEDULE_FILTERS)[number];

export type ScheduleState =
  | "remaining"
  | "complete"
  | "blocked"
  | "overdue"
  | "unscheduled";

export type ProjectScheduleTask = {
  id: string;
  jobId: string;
  title: string;
  assignee: string | null;
  status: "open" | "done";
  dueAt: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  completedAt: string | null;
};

export type ProjectScheduleJob = {
  id: string;
  number: string;
  name: string;
  status: JobStatus;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  tasks: ProjectScheduleTask[];
};

export type TaskProgress = {
  completed: number;
  total: number;
  percent: number | null;
};

export type ScheduleColumn = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

export type ScheduleWindow = {
  start: Date;
  end: Date;
  columns: ScheduleColumn[];
};

function startOfLocalDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfLocalDay(value: Date): Date {
  const date = startOfLocalDay(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(value: Date, amount: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : startOfLocalDay(parsed);
}

function formatColumnDay(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatColumnMonth(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    year: "numeric",
  }).format(value);
}

export function getTaskProgress(
  tasks: Array<{ status: string }>,
): TaskProgress {
  const completed = tasks.filter((task) => task.status === "done").length;
  return {
    completed,
    total: tasks.length,
    percent:
      tasks.length === 0 ? null : Math.round((completed / tasks.length) * 100),
  };
}

export function getTaskScheduleState(
  task: {
    status: string;
    dueAt?: string | null;
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
  },
  now = new Date(),
): ScheduleState {
  if (task.status === "done") return "complete";
  const finish = parseDay(task.plannedEndAt ?? task.dueAt);
  if (finish && finish < startOfLocalDay(now)) return "overdue";
  if (!task.plannedStartAt && !task.plannedEndAt && !task.dueAt) {
    return "unscheduled";
  }
  return "remaining";
}

export function getJobScheduleState(
  job: {
    status: string;
    plannedStartAt: string | null;
    plannedEndAt: string | null;
  },
  now = new Date(),
): ScheduleState {
  if (job.status === "complete" || job.status === "closed") return "complete";
  if (job.status === "blocked") return "blocked";
  const end = parseDay(job.plannedEndAt);
  if (end && end < startOfLocalDay(now)) return "overdue";
  if (!job.plannedStartAt && !job.plannedEndAt) return "unscheduled";
  return "remaining";
}

export function isTaskOutsideJobRange(
  task: { plannedStartAt: string | null; plannedEndAt: string | null },
  job: { plannedStartAt: string | null; plannedEndAt: string | null },
): boolean {
  const taskStart = parseDay(task.plannedStartAt);
  const taskEnd = parseDay(task.plannedEndAt);
  const jobStart = parseDay(job.plannedStartAt);
  const jobEnd = parseDay(job.plannedEndAt);
  return Boolean(
    (taskStart && jobStart && taskStart < jobStart) ||
      (taskEnd && jobEnd && taskEnd > jobEnd),
  );
}

export function createScheduleWindow(
  zoom: ScheduleZoom,
  anchor: Date,
): ScheduleWindow {
  if (zoom === "week") {
    const start = startOfLocalDay(anchor);
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    const columns = Array.from({ length: 42 }, (_, index) => {
      const dayStart = addDays(start, index);
      return {
        key: dayStart.toISOString(),
        label: formatColumnDay(dayStart),
        start: dayStart,
        end: endOfLocalDay(dayStart),
      };
    });
    return {
      start,
      end: columns.at(-1)?.end ?? endOfLocalDay(start),
      columns,
    };
  }

  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(1);
  start.setMonth(start.getMonth() - 1);
  const columns = Array.from({ length: 6 }, (_, index) => {
    const monthStart = new Date(start);
    monthStart.setMonth(start.getMonth() + index);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthStart.getMonth() + 1);
    monthEnd.setMilliseconds(-1);
    return {
      key: monthStart.toISOString(),
      label: formatColumnMonth(monthStart),
      start: monthStart,
      end: monthEnd,
    };
  });
  return {
    start,
    end: columns.at(-1)?.end ?? endOfLocalDay(start),
    columns,
  };
}

export function matchesScheduleFilter(
  state: ScheduleState,
  filter: ScheduleFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "remaining") return state !== "complete";
  return state === filter;
}

export function filterScheduleJobs(
  jobs: ProjectScheduleJob[],
  filter: ScheduleFilter,
  now = new Date(),
): ProjectScheduleJob[] {
  if (filter === "all") return jobs;

  return jobs.flatMap((job) => {
    const jobState = getJobScheduleState(job, now);
    const jobMatches = matchesScheduleFilter(jobState, filter);
    const tasks =
      filter === "blocked" && jobState === "blocked"
        ? job.tasks
        : job.tasks.filter((task) =>
            matchesScheduleFilter(getTaskScheduleState(task, now), filter),
          );
    return jobMatches || tasks.length ? [{ ...job, tasks }] : [];
  });
}

export function hideCompletedScheduleRows(
  jobs: ProjectScheduleJob[],
): ProjectScheduleJob[] {
  return jobs.flatMap((job) => {
    const tasks = job.tasks.filter((task) => task.status !== "done");
    const jobIsComplete =
      job.status === "complete" || job.status === "closed";
    return jobIsComplete && tasks.length === 0 ? [] : [{ ...job, tasks }];
  });
}

export function positionInWindow(
  value: string | Date | null,
  window: ScheduleWindow,
): number | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const date = startOfLocalDay(parsed);
  if (date < window.start || date > window.end) return null;
  const span = window.end.getTime() - window.start.getTime();
  if (span <= 0) return 0;
  return ((date.getTime() - window.start.getTime()) / span) * 100;
}

export function moveScheduleAnchor(
  anchor: Date,
  zoom: ScheduleZoom,
  direction: -1 | 1,
): Date {
  const next = new Date(anchor);
  if (zoom === "week") {
    next.setDate(next.getDate() + direction * 42);
  } else {
    next.setMonth(next.getMonth() + direction * 6);
  }
  return next;
}
