const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

export type DateRangeParams = {
  from?: string | null;
  to?: string | null;
};

export type DateRange = {
  from: Date | null;
  to: Date | null;
};

export function parseDateParam(value?: string | null): Date | null {
  const trimmed = value?.trim() ?? "";
  if (!DATE_PARAM.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDateRange(params: DateRangeParams = {}): DateRange {
  return {
    from: parseDateParam(params.from),
    to: parseDateParam(params.to),
  };
}

export function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function isInDateRange(
  value: Date | null | undefined,
  range: DateRange | DateRangeParams = {},
): boolean {
  const from =
    range.from instanceof Date ? range.from : parseDateParam(range.from);
  const to = range.to instanceof Date ? range.to : parseDateParam(range.to);
  if (!from && !to) return true;
  if (!value) return false;
  const time = value.getTime();
  if (from && time < startOfDay(from).getTime()) return false;
  if (to && time > endOfDay(to).getTime()) return false;
  return true;
}

export function dateInputValue(value?: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function datetimeLocalValue(value?: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function matchesQuery(
  query: string | undefined,
  parts: Array<string | null | undefined>,
): boolean {
  const needle = query?.trim().toLowerCase();
  if (!needle) return true;
  return parts
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export const DATE_PRESETS = ["today", "this_week", "overdue", "last_30"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  this_week: "This week",
  overdue: "Overdue",
  last_30: "Last 30 days",
};

export function isDatePreset(value: string): value is DatePreset {
  return DATE_PRESETS.includes(value as DatePreset);
}

/** Monday of the week containing `now` (local time). */
export function startOfWeek(now: Date): Date {
  const start = startOfDay(now);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

export function dateRangeForPreset(
  preset: DatePreset,
  now: Date = new Date(),
): { from: string; to: string } {
  const today = startOfDay(now);
  switch (preset) {
    case "today":
      return { from: dateInputValue(today), to: dateInputValue(today) };
    case "this_week":
      return { from: dateInputValue(startOfWeek(today)), to: dateInputValue(today) };
    case "overdue": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: "", to: dateInputValue(yesterday) };
    }
    case "last_30": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { from: dateInputValue(start), to: dateInputValue(today) };
    }
  }
}
