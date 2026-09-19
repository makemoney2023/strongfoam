export type WorkingCalendarException = {
  id?: string;
  date: string;
  name?: string;
  isWorkingDay: boolean;
};

export type ResolvedWorkingCalendar = {
  id?: string;
  name?: string;
  timeZone: string;
  weekendDays: number[];
  exceptions: WorkingCalendarException[];
};

export const DEFAULT_WORKING_CALENDAR: ResolvedWorkingCalendar = {
  name: "Standard Monday–Friday",
  timeZone: "America/Toronto",
  weekendDays: [0, 6],
  exceptions: [],
};

export type ScheduleDates = {
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  dueAt?: string | null;
};

export type BaselineVariance = {
  state: "unchanged" | "changed" | "added" | "removed" | "not-baselined";
  startVarianceDays: number | null;
  finishVarianceDays: number | null;
};

export type ScheduleAssignmentRole =
  | "Project manager"
  | "Foreman"
  | "Task assignee";

export type ScheduleAssignment = ScheduleDates & {
  id: string;
  resource: string | null;
  role: ScheduleAssignmentRole;
  entityType: "job" | "task";
  label: string;
  href: string;
};

export type ProjectedAssignment = ScheduleAssignment & {
  hasPotentialOverlap: boolean;
};

export type ResourceLane = {
  key: string;
  displayName: string;
  roles: ScheduleAssignmentRole[];
  assignments: ProjectedAssignment[];
  potentialOverlapCount: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function calendarDate(
  value: string,
  calendar: Pick<ResolvedWorkingCalendar, "timeZone">,
): string | null {
  if (ISO_DATE.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: calendar.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function ordinal(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year!, month! - 1, day!) / 86_400_000);
}

function fromOrdinal(value: number): string {
  return new Date(value * 86_400_000).toISOString().slice(0, 10);
}

export function isWorkingDay(
  date: string,
  calendar: ResolvedWorkingCalendar,
): boolean {
  const localDate = calendarDate(date, calendar);
  if (!localDate) return false;
  const exception = calendar.exceptions.find(
    (candidate) => candidate.date === localDate,
  );
  if (exception) return exception.isWorkingDay;
  const day = new Date(`${localDate}T00:00:00.000Z`).getUTCDay();
  return !calendar.weekendDays.includes(day);
}

export function addWorkingDays(
  date: string,
  delta: number,
  calendar: ResolvedWorkingCalendar,
): string {
  if (!Number.isInteger(delta)) {
    throw new RangeError("Working-day changes require a whole number.");
  }
  const localDate = calendarDate(date, calendar);
  if (!localDate || delta === 0) return localDate ?? date;
  const direction = delta > 0 ? 1 : -1;
  let remaining = Math.abs(delta);
  let cursor = ordinal(localDate);
  while (remaining > 0) {
    cursor += direction;
    if (isWorkingDay(fromOrdinal(cursor), calendar)) remaining -= 1;
  }
  return fromOrdinal(cursor);
}

export function workingDayDifference(
  from: string,
  to: string,
  calendar: ResolvedWorkingCalendar,
): number {
  const fromDate = calendarDate(from, calendar);
  const toDate = calendarDate(to, calendar);
  if (!fromDate || !toDate || fromDate === toDate) return 0;
  const direction = ordinal(toDate) > ordinal(fromDate) ? 1 : -1;
  let cursor = ordinal(fromDate);
  let result = 0;
  while (cursor !== ordinal(toDate)) {
    cursor += direction;
    if (isWorkingDay(fromOrdinal(cursor), calendar)) result += direction;
  }
  return result;
}

function comparableFinish(dates: ScheduleDates): string | null {
  return dates.plannedEndAt ?? dates.dueAt ?? null;
}

export function calculateBaselineVariance(
  current: ScheduleDates | null,
  baseline: ScheduleDates | null,
  calendar: ResolvedWorkingCalendar,
): BaselineVariance {
  if (current && !baseline) {
    return {
      state: "added",
      startVarianceDays: null,
      finishVarianceDays: null,
    };
  }
  if (!current && baseline) {
    return {
      state: "removed",
      startVarianceDays: null,
      finishVarianceDays: null,
    };
  }
  if (!current || !baseline) {
    return {
      state: "not-baselined",
      startVarianceDays: null,
      finishVarianceDays: null,
    };
  }
  const startVarianceDays =
    current.plannedStartAt && baseline.plannedStartAt
      ? workingDayDifference(
          baseline.plannedStartAt,
          current.plannedStartAt,
          calendar,
        )
      : null;
  const currentFinish = comparableFinish(current);
  const baselineFinish = comparableFinish(baseline);
  const finishVarianceDays =
    currentFinish && baselineFinish
      ? workingDayDifference(baselineFinish, currentFinish, calendar)
      : null;
  if (startVarianceDays === null && finishVarianceDays === null) {
    return {
      state: "not-baselined",
      startVarianceDays,
      finishVarianceDays,
    };
  }
  return {
    state:
      (startVarianceDays ?? 0) === 0 && (finishVarianceDays ?? 0) === 0
        ? "unchanged"
        : "changed",
    startVarianceDays,
    finishVarianceDays,
  };
}

function normalizeResource(value: string | null): {
  key: string;
  displayName: string;
} {
  const displayName = value?.trim().replace(/\s+/g, " ") || "Unassigned";
  return { key: displayName.toLocaleLowerCase(), displayName };
}

function assignmentRange(
  assignment: ScheduleAssignment,
  calendar: ResolvedWorkingCalendar,
): { start: string; end: string } | null {
  if (!assignment.plannedStartAt || !assignment.plannedEndAt) return null;
  const start = calendarDate(assignment.plannedStartAt, calendar);
  const end = calendarDate(assignment.plannedEndAt, calendar);
  return start && end ? { start, end } : null;
}

function rangesShareWorkingDay(
  left: { start: string; end: string },
  right: { start: string; end: string },
  calendar: ResolvedWorkingCalendar,
): boolean {
  const start = Math.max(ordinal(left.start), ordinal(right.start));
  const end = Math.min(ordinal(left.end), ordinal(right.end));
  for (let cursor = start; cursor <= end; cursor += 1) {
    if (isWorkingDay(fromOrdinal(cursor), calendar)) return true;
  }
  return false;
}

export function buildResourceLanes(
  assignments: readonly ScheduleAssignment[],
  calendar: ResolvedWorkingCalendar,
): ResourceLane[] {
  const groups = new Map<
    string,
    {
      displayName: string;
      roles: Set<ScheduleAssignmentRole>;
      assignments: ScheduleAssignment[];
    }
  >();
  for (const assignment of assignments) {
    const resource = normalizeResource(assignment.resource);
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
      const sorted = [...group.assignments].sort((left, right) => {
        const leftRange = assignmentRange(left, calendar);
        const rightRange = assignmentRange(right, calendar);
        if (!leftRange) return 1;
        if (!rightRange) return -1;
        return ordinal(leftRange.start) - ordinal(rightRange.start);
      });
      const overlappingIds = new Set<string>();
      const active: Array<{
        assignment: ScheduleAssignment;
        range: { start: string; end: string };
      }> = [];
      let potentialOverlapCount = 0;
      for (const assignment of sorted) {
        const range = assignmentRange(assignment, calendar);
        if (!range) continue;
        for (let index = active.length - 1; index >= 0; index -= 1) {
          if (ordinal(active[index]!.range.end) < ordinal(range.start)) {
            active.splice(index, 1);
          }
        }
        for (const candidate of active) {
          if (rangesShareWorkingDay(candidate.range, range, calendar)) {
            potentialOverlapCount += 1;
            overlappingIds.add(candidate.assignment.id);
            overlappingIds.add(assignment.id);
          }
        }
        active.push({ assignment, range });
      }
      return {
        key,
        displayName: group.displayName,
        roles: [...group.roles],
        assignments: sorted.map((assignment) => ({
          ...assignment,
          hasPotentialOverlap: overlappingIds.has(assignment.id),
        })),
        potentialOverlapCount,
      };
    })
    .sort((left, right) => {
      if (left.key === "unassigned") return 1;
      if (right.key === "unassigned") return -1;
      return left.displayName.localeCompare(right.displayName);
    });
}
