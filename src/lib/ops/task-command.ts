import type { TaskStatus } from "@/lib/ops/collaboration";
import {
  addWorkingDays,
  calendarDate,
  type ResolvedWorkingCalendar,
} from "@/lib/ops/project-schedule-planning";

export const TASK_COMMAND_KINDS = ["complete", "reopen", "slip_due"] as const;
export type TaskCommandKind = (typeof TASK_COMMAND_KINDS)[number];

export type TaskCommandProposal = {
  taskId: string;
  title: string;
  kind: TaskCommandKind;
  effect: string;
  expectedUpdatedAt: string;
  dueAt: string | null;
};

export type AppliedTaskCommand = {
  commandId: string;
  taskId: string;
  kind: TaskCommandKind;
  effect: string;
  beforeStatus: TaskStatus;
  beforeCompletedAt: string | null;
  beforeDueAt: string | null;
  beforeUpdatedAt: string | null;
  afterUpdatedAt: string;
  actor: string | null;
};

function shiftWorkingDays(
  value: Date,
  days: number,
  calendar: ResolvedWorkingCalendar,
): Date | null {
  const local = calendarDate(value.toISOString(), calendar);
  if (!local) return null;
  const next = addWorkingDays(local, days, calendar);
  const from = Date.parse(`${local}T00:00:00.000Z`);
  const to = Date.parse(`${next}T00:00:00.000Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return new Date(value.getTime() + (to - from));
}

export function isTaskCommandKind(value: unknown): value is TaskCommandKind {
  return value === "complete" || value === "reopen" || value === "slip_due";
}

function isStatus(value: unknown): value is TaskStatus {
  return value === "open" || value === "done";
}

export function proposeTaskCommand(input: {
  task: {
    id: string;
    title: string;
    status: string;
    dueAt: Date | null;
    updatedAt: Date;
  };
  kind: TaskCommandKind;
  calendar: ResolvedWorkingCalendar;
}): TaskCommandProposal | null {
  const expectedUpdatedAt = input.task.updatedAt.toISOString();
  if (input.kind === "complete") {
    if (input.task.status !== "open") return null;
    return {
      taskId: input.task.id,
      title: input.task.title,
      kind: input.kind,
      effect: `Mark "${input.task.title}" done. Undo reopens it.`,
      expectedUpdatedAt,
      dueAt: input.task.dueAt?.toISOString() ?? null,
    };
  }
  if (input.kind === "reopen") {
    if (input.task.status !== "done") return null;
    return {
      taskId: input.task.id,
      title: input.task.title,
      kind: input.kind,
      effect: `Reopen "${input.task.title}". Undo marks it done.`,
      expectedUpdatedAt,
      dueAt: input.task.dueAt?.toISOString() ?? null,
    };
  }
  if (!input.task.dueAt) return null;
  const nextDue = shiftWorkingDays(input.task.dueAt, 1, input.calendar);
  if (!nextDue) return null;
  const from = calendarDate(input.task.dueAt.toISOString(), input.calendar);
  const to = calendarDate(nextDue.toISOString(), input.calendar);
  if (!from || !to || from === to) return null;
  return {
    taskId: input.task.id,
    title: input.task.title,
    kind: input.kind,
    effect: `Move the due date of "${input.task.title}" from ${from} to ${to}. Undo restores ${from}.`,
    expectedUpdatedAt,
    dueAt: nextDue.toISOString(),
  };
}

export function appliedTaskCommand(event: {
  kind: string;
  payload: unknown;
}): AppliedTaskCommand | null {
  if (event.kind !== "task_command_applied") return null;
  if (!event.payload || typeof event.payload !== "object") return null;
  const payload = event.payload as Record<string, unknown>;
  if (
    typeof payload.commandId !== "string" ||
    typeof payload.taskId !== "string" ||
    !isTaskCommandKind(payload.kind) ||
    typeof payload.effect !== "string" ||
    !isStatus(payload.beforeStatus) ||
    typeof payload.afterUpdatedAt !== "string"
  ) {
    return null;
  }
  const beforeCompletedAt = payload.beforeCompletedAt;
  const beforeDueAt = payload.beforeDueAt;
  if (
    beforeCompletedAt !== null &&
    typeof beforeCompletedAt !== "string"
  ) {
    return null;
  }
  if (beforeDueAt !== null && typeof beforeDueAt !== "string") return null;
  const beforeUpdatedAt = payload.beforeUpdatedAt;
  if (
    beforeUpdatedAt !== undefined &&
    beforeUpdatedAt !== null &&
    typeof beforeUpdatedAt !== "string"
  ) {
    return null;
  }
  return {
    commandId: payload.commandId,
    taskId: payload.taskId,
    kind: payload.kind,
    effect: payload.effect,
    beforeStatus: payload.beforeStatus,
    beforeCompletedAt,
    beforeDueAt,
    beforeUpdatedAt: typeof beforeUpdatedAt === "string" ? beforeUpdatedAt : null,
    afterUpdatedAt: payload.afterUpdatedAt,
    actor: null,
  };
}

export function undoneCommandId(event: {
  kind: string;
  payload: unknown;
}): string | null {
  if (event.kind !== "task_command_undone") return null;
  if (!event.payload || typeof event.payload !== "object") return null;
  const commandId = (event.payload as { commandId?: unknown }).commandId;
  return typeof commandId === "string" ? commandId : null;
}

export function newestTaskCommand(
  events: Array<{ kind: string; payload: unknown; actor?: string }>,
  taskId: string,
): AppliedTaskCommand | null {
  const undone = new Set(
    events.flatMap((event) => {
      const commandId = undoneCommandId(event);
      return commandId ? [commandId] : [];
    }),
  );
  for (const event of events) {
    const applied = appliedTaskCommand(event);
    if (!applied || applied.taskId !== taskId || undone.has(applied.commandId)) {
      continue;
    }
    return {
      ...applied,
      actor: typeof event.actor === "string" ? event.actor : null,
    };
  }
  return null;
}
