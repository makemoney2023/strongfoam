const SCHEDULE_PATH = "/app/projects/schedule";
const DATE_VALUE = /^(\d{4})-(\d{2})-(\d{2})$/;

const STATES = [
  "all",
  "remaining",
  "complete",
  "blocked",
  "overdue",
  "unscheduled",
] as const;
const ATTENTION_VALUES = [
  "all",
  "overdue-tasks",
  "unscheduled-active-work",
  "behind-baseline",
  "resource-overlap",
] as const;
const VIEWS = ["work", "resources"] as const;
const ZOOMS = ["week", "month"] as const;
const BASELINES = ["latest", "none"] as const;

export type PortfolioScheduleQuery = {
  q: string;
  projectStatus: string;
  projectManager: string;
  state: (typeof STATES)[number];
  attention: (typeof ATTENTION_VALUES)[number];
  view: (typeof VIEWS)[number];
  zoom: (typeof ZOOMS)[number];
  anchor: string | null;
  from: string | null;
  to: string | null;
  baseline: (typeof BASELINES)[number];
  hideCompleted: boolean;
};

function scalar(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function text(value: unknown): string {
  return scalar(value)?.trim() ?? "";
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | undefined {
  const candidate = scalar(value);
  return candidate !== undefined && allowed.includes(candidate)
    ? (candidate as T[number])
    : undefined;
}

function calendarDate(value: unknown): string | null {
  const candidate = scalar(value);
  const match = candidate?.match(DATE_VALUE);
  if (!candidate || !match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) return null;

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

  return day >= 1 && day <= daysInMonth[month - 1] ? candidate : null;
}

function canonicalDateRange(
  fromValue: unknown,
  toValue: unknown,
): { from: string | null; to: string | null } {
  let from = calendarDate(fromValue);
  let to = calendarDate(toValue);

  if (from && to && from > to) {
    [from, to] = [to, from];
  }

  return { from, to };
}

export function parsePortfolioScheduleQuery(
  input: Record<string, string | string[] | undefined>,
): PortfolioScheduleQuery {
  const { from, to } = canonicalDateRange(input.from, input.to);

  return {
    q: text(input.q),
    projectStatus: text(input.projectStatus) || "active",
    projectManager: text(input.projectManager),
    state: enumValue(input.state, STATES) ?? "all",
    attention: enumValue(input.attention, ATTENTION_VALUES) ?? "all",
    view: enumValue(input.view, VIEWS) ?? "work",
    zoom: enumValue(input.zoom, ZOOMS) ?? "week",
    anchor: calendarDate(input.anchor),
    from,
    to,
    baseline: enumValue(input.baseline, BASELINES) ?? "latest",
    hideCompleted: scalar(input.hideCompleted) === "1",
  };
}

export function portfolioScheduleHref(
  input: Partial<PortfolioScheduleQuery>,
): string {
  const params = new URLSearchParams();
  const q = text(input.q);
  const projectStatus = text(input.projectStatus);
  const projectManager = text(input.projectManager);
  const state = enumValue(input.state, STATES);
  const attention = enumValue(input.attention, ATTENTION_VALUES);
  const view = enumValue(input.view, VIEWS);
  const zoom = enumValue(input.zoom, ZOOMS);
  const anchor = calendarDate(input.anchor);
  const { from, to } = canonicalDateRange(input.from, input.to);
  const baseline = enumValue(input.baseline, BASELINES);

  if (q) params.set("q", q);
  if (projectStatus) params.set("projectStatus", projectStatus);
  if (projectManager) params.set("projectManager", projectManager);
  if (state) params.set("state", state);
  if (attention) params.set("attention", attention);
  if (view) params.set("view", view);
  if (zoom) params.set("zoom", zoom);
  if (anchor) params.set("anchor", anchor);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (baseline) params.set("baseline", baseline);
  if (input.hideCompleted === true) params.set("hideCompleted", "1");

  const query = params.toString();
  return query ? `${SCHEDULE_PATH}?${query}` : SCHEDULE_PATH;
}

export const PORTFOLIO_SCHEDULE_WIDGETS = {
  overdueTasks: {
    label: "Overdue tasks",
    href: portfolioScheduleHref({
      projectStatus: "active",
      attention: "overdue-tasks",
    }),
  },
  unscheduledActiveWork: {
    label: "Unscheduled active work",
    href: portfolioScheduleHref({
      projectStatus: "active",
      attention: "unscheduled-active-work",
    }),
  },
  projectsBehindBaseline: {
    label: "Projects behind baseline",
    href: portfolioScheduleHref({
      projectStatus: "active",
      attention: "behind-baseline",
    }),
  },
  peopleWithPotentialOverlap: {
    label: "Potential resource overlaps",
    href: portfolioScheduleHref({
      projectStatus: "active",
      attention: "resource-overlap",
      view: "resources",
    }),
  },
} as const;
