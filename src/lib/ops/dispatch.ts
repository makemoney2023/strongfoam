export const DISPATCH_STATUSES = ["scheduled", "cancelled"] as const;

export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const DISPATCH_TIME_ZONE = "America/Toronto";

export const DISPATCH_NOTE_LIMIT = 500;

export const DISPATCH_ATTENTION_STATUSES = [
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "blocked",
  "ready_for_inspection",
] as const;

export type Dispatch = {
  id: string;
  organizationId: string;
  jobId: string;
  userId: string;
  workDate: string;
  status: DispatchStatus;
  note: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DispatchJob = {
  id: string;
  name: string;
  status: string;
  organizationId: string;
};

export type DispatchPerson = {
  userId: string;
  displayName: string;
};

export type DispatchDayRow = Dispatch & {
  jobName: string;
  displayName: string;
};

export type DispatchDay = {
  scheduled: DispatchDayRow[];
  cancelled: DispatchDayRow[];
  doubleBooked: {
    userId: string;
    displayName: string;
    jobNames: string[];
  }[];
  undispatched: { id: string; name: string }[];
};

const WORK_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseWorkDate(
  value: string | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const text = value?.trim() ?? "";
  const match = WORK_DATE.exec(text);
  if (!match) return { ok: false, error: "Choose a valid work date." };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100) {
    return { ok: false, error: "Choose a valid work date." };
  }
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return { ok: false, error: "Choose a valid work date." };
  }
  return { ok: true, value: text };
}

export function parseDispatchNote(
  value: string | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const note = (value ?? "").trim().replace(/\s+/g, " ");
  if (note.length > DISPATCH_NOTE_LIMIT) {
    return {
      ok: false,
      error: `Keep the note under ${DISPATCH_NOTE_LIMIT} characters.`,
    };
  }
  return { ok: true, value: note };
}

export function dispatchableJobStatus(status: string): boolean {
  return status !== "closed";
}

export function isDispatchAttentionStatus(status: string): boolean {
  return DISPATCH_ATTENTION_STATUSES.includes(
    status as (typeof DISPATCH_ATTENTION_STATUSES)[number],
  );
}

export function dispatchesVisibleToUser(
  rows: Dispatch[],
  userId: string,
): Dispatch[] {
  return rows.filter(
    (row) => row.userId === userId && row.status === "scheduled",
  );
}

function byPersonThenJob(left: DispatchDayRow, right: DispatchDayRow): number {
  return (
    left.displayName.localeCompare(right.displayName) ||
    left.jobName.localeCompare(right.jobName)
  );
}

export function buildDispatchDay(input: {
  organizationId: string;
  jobs: DispatchJob[];
  people: DispatchPerson[];
  dispatches: Dispatch[];
}): DispatchDay {
  const jobs = new Map(
    input.jobs
      .filter((job) => job.organizationId === input.organizationId)
      .map((job) => [job.id, job]),
  );
  const people = new Map(input.people.map((person) => [person.userId, person.displayName]));
  const rows = input.dispatches
    .filter((row) => row.organizationId === input.organizationId)
    .map((row) => ({
      ...row,
      jobName: jobs.get(row.jobId)?.name ?? "Unknown job",
      displayName: people.get(row.userId) ?? "Former member",
    }));
  const scheduled = rows
    .filter((row) => row.status === "scheduled")
    .sort(byPersonThenJob);
  const covered = new Set(scheduled.map((row) => row.jobId));
  const byUser = new Map<string, DispatchDayRow[]>();
  for (const row of scheduled) {
    const current = byUser.get(row.userId) ?? [];
    current.push(row);
    byUser.set(row.userId, current);
  }
  const doubleBooked = [...byUser.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      userId: group[0]!.userId,
      displayName: group[0]!.displayName,
      jobNames: group.map((row) => row.jobName),
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
  const undispatched = input.jobs
    .filter(
      (job) =>
        job.organizationId === input.organizationId &&
        isDispatchAttentionStatus(job.status) &&
        !covered.has(job.id),
    )
    .map((job) => ({ id: job.id, name: job.name }))
    .sort((left, right) => left.name.localeCompare(right.name));
  return {
    scheduled,
    cancelled: rows.filter((row) => row.status === "cancelled").sort(byPersonThenJob),
    doubleBooked,
    undispatched,
  };
}
