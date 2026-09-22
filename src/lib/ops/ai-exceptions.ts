import { FIELD_ACTIVE_JOB_STATUSES } from "@/lib/ops/field-workspace";
import { PORTFOLIO_SCHEDULE_WIDGETS } from "@/lib/ops/portfolio-schedule-query";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import {
  listQuantityPaceWarnings,
  quantityPaceLabel,
} from "@/lib/ops/quantity-pace";
import {
  listTranscriptRecords,
  savedTranscriptSelections,
} from "@/lib/ops/transcript-record";

export const OPERATIONS_EXCEPTION_KINDS = [
  "missing_daily_log",
  "failed_transcription",
  "blocked_job",
  "overdue_task",
  "unextracted_voice_note",
  "quantity_pace",
] as const;

export type OperationsExceptionKind = (typeof OPERATIONS_EXCEPTION_KINDS)[number];

export type OperationsException = {
  kind: OperationsExceptionKind;
  label: string;
  href: string;
  occurredAt: string;
};

export type ExceptionJob = {
  id: string;
  name: string;
  status: string;
  updatedAt: Date;
  timeZone?: string;
};

export type ExceptionTask = {
  id: string;
  jobId: string;
  title: string;
  status: string;
  dueAt: Date | null;
  plannedEndAt: Date | null;
  statedQuantity?: number | null;
  statedUnit?: string | null;
};

export type ExceptionQuantity = {
  jobId: string;
  quantity: number | null;
  unit: string | null;
};

export type ExceptionFieldNote = {
  jobId: string;
  kind: string;
  createdAt: Date;
};

export type ExceptionVoiceNote = {
  id: string;
  jobId: string;
  status: string;
  transcript: string | null;
  filename: string;
  createdAt: Date;
};

export type ExceptionEvent = {
  kind: string;
  payload: unknown;
  createdAt: Date;
};

const FIELD_ACTIVE = new Set<string>(FIELD_ACTIVE_JOB_STATUSES);

function remainingTranscript(note: ExceptionVoiceNote, input: {
  events: ExceptionEvent[];
  tasks: ExceptionTask[];
}): { remaining: boolean; partial: boolean } {
  const transcript = note.transcript?.trim() ?? "";
  if (note.status !== "completed" || !transcript) {
    return { remaining: false, partial: false };
  }
  const saved = savedTranscriptSelections(input.events, note.id);
  if (saved.legacy) return { remaining: false, partial: false };
  const tasks = input.tasks
    .filter((task) => task.jobId === note.jobId)
    .map((task) => ({ title: task.title, status: task.status }));
  const remaining = listTranscriptRecords({
    voiceNoteId: note.id,
    filename: note.filename,
    transcript,
    savedTexts: saved.texts,
    tasks,
  });
  return { remaining: remaining.length > 0, partial: saved.texts.length > 0 };
}

export type HomeExceptionSource = {
  jobs: ExceptionJob[];
  tasks: ExceptionTask[];
  fieldNotes: ExceptionFieldNote[];
  voiceNotes: ExceptionVoiceNote[];
  events: ExceptionEvent[];
};

function jobTimeZone(job: ExceptionJob, fallback: string): string {
  return job.timeZone?.trim() || fallback;
}

export function listOperationsExceptions(
  input: {
    now: Date;
    timeZone?: string;
    jobs: ExceptionJob[];
    tasks: ExceptionTask[];
    fieldNotes: ExceptionFieldNote[];
    quantities?: ExceptionQuantity[];
    voiceNotes: ExceptionVoiceNote[];
    events: ExceptionEvent[];
  },
  limit = 8,
): OperationsException[] {
  const fallbackZone = input.timeZone?.trim() || "America/Toronto";
  const rows: OperationsException[] = [];

  for (const job of input.jobs) {
    if (!FIELD_ACTIVE.has(job.status)) continue;
    const timeZone = jobTimeZone(job, fallbackZone);
    const workingDay = workingDayLabel(input.now, timeZone);
    const hasLog = input.fieldNotes.some(
      (note) =>
        note.jobId === job.id &&
        note.kind === "daily_report" &&
        workingDayLabel(note.createdAt, timeZone) === workingDay,
    );
    if (!hasLog) {
      rows.push({
        kind: "missing_daily_log",
        label: `Missing daily log: ${job.name}`,
        href: `/app/jobs/${job.id}#field-log`,
        occurredAt: input.now.toISOString(),
      });
    }
  }

  for (const note of input.voiceNotes) {
    if (note.status === "failed") {
      rows.push({
        kind: "failed_transcription",
        label: `Failed transcription: ${note.filename}`,
        href: `/app/jobs/${note.jobId}#voice-notes`,
        occurredAt: note.createdAt.toISOString(),
      });
    }
    const transcript = remainingTranscript(note, input);
    if (transcript.remaining) {
      rows.push({
        kind: "unextracted_voice_note",
        label: transcript.partial
          ? `Remaining transcript: ${note.filename}`
          : `Unextracted voice note: ${note.filename}`,
        href: `/app/jobs/${note.jobId}#voice-notes`,
        occurredAt: note.createdAt.toISOString(),
      });
    }
  }

  for (const job of input.jobs) {
    if (job.status !== "blocked") continue;
    rows.push({
      kind: "blocked_job",
      label: `Blocked: ${job.name}`,
      href: "/app/jobs?status=blocked",
      occurredAt: job.updatedAt.toISOString(),
    });
  }

  for (const task of input.tasks) {
    if (task.status === "done") continue;
    const due = [task.plannedEndAt, task.dueAt].filter(
      (value): value is Date => value instanceof Date && value.getTime() < input.now.getTime(),
    );
    if (!due.length) continue;
    const occurredAt = due.reduce((earliest, value) =>
      value.getTime() < earliest.getTime() ? value : earliest,
    );
    rows.push({
      kind: "overdue_task",
      label: `Overdue: ${task.title}`,
      href: PORTFOLIO_SCHEDULE_WIDGETS.overdueTasks.href,
      occurredAt: occurredAt.toISOString(),
    });
  }

  const paceRows = listQuantityPaceWarnings({
    jobs: input.jobs,
    tasks: input.tasks,
    quantities: input.quantities ?? [],
  }).map((warning) => ({
    kind: "quantity_pace" as const,
    label: quantityPaceLabel(warning),
    href: `/app/jobs/${warning.jobId}#tasks`,
    occurredAt: input.now.toISOString(),
  }));

  const ranked = rows.sort(
    (a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.label.localeCompare(b.label),
  );
  const limited = ranked.slice(0, limit);
  if (!Number.isFinite(limit)) return [...limited, ...paceRows].sort(byOccurredAt);
  const visiblePace = paceRows.filter(
    (pace) =>
      !limited.some(
        (row) => row.kind === pace.kind && row.href === pace.href && row.label === pace.label,
      ),
  );
  return [...limited, ...visiblePace].sort(byOccurredAt);
}

function byOccurredAt(a: OperationsException, b: OperationsException): number {
  return a.occurredAt.localeCompare(b.occurredAt) || a.label.localeCompare(b.label);
}

export function countOperationsExceptions(
  input: Parameters<typeof listOperationsExceptions>[0],
): number {
  return listOperationsExceptions(input, Number.POSITIVE_INFINITY).length;
}
