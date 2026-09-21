import { FIELD_ACTIVE_JOB_STATUSES } from "@/lib/ops/field-workspace";
import { PORTFOLIO_SCHEDULE_WIDGETS } from "@/lib/ops/portfolio-schedule-query";
import { workingDayLabel } from "@/lib/ops/ai-evidence";

export const OPERATIONS_EXCEPTION_KINDS = [
  "missing_daily_log",
  "failed_transcription",
  "blocked_job",
  "overdue_task",
  "unextracted_voice_note",
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
};

export type ExceptionTask = {
  id: string;
  jobId: string;
  title: string;
  status: string;
  dueAt: Date | null;
  plannedEndAt: Date | null;
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

function voiceNoteId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as { voiceNoteId?: unknown }).voiceNoteId;
  return typeof id === "string" ? id : null;
}

export type HomeExceptionSource = {
  jobs: ExceptionJob[];
  tasks: ExceptionTask[];
  fieldNotes: ExceptionFieldNote[];
  voiceNotes: ExceptionVoiceNote[];
  events: ExceptionEvent[];
};

export function listOperationsExceptions(
  input: {
    now: Date;
    timeZone?: string;
    jobs: ExceptionJob[];
    tasks: ExceptionTask[];
    fieldNotes: ExceptionFieldNote[];
    voiceNotes: ExceptionVoiceNote[];
    events: ExceptionEvent[];
  },
  limit = 8,
): OperationsException[] {
  const timeZone = input.timeZone?.trim() || "America/Toronto";
  const workingDay = workingDayLabel(input.now, timeZone);
  const extracted = new Set(
    input.events
      .filter((event) => event.kind === "voice_note_extracted")
      .map((event) => voiceNoteId(event.payload))
      .filter((id): id is string => Boolean(id)),
  );
  const rows: OperationsException[] = [];

  for (const job of input.jobs) {
    if (!FIELD_ACTIVE.has(job.status)) continue;
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
    const transcript = note.transcript?.trim() ?? "";
    if (note.status === "completed" && transcript && !extracted.has(note.id)) {
      rows.push({
        kind: "unextracted_voice_note",
        label: `Unextracted voice note: ${note.filename}`,
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

  return rows
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.label.localeCompare(b.label))
    .slice(0, limit);
}
