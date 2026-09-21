import {
  addWorkingDays,
  calendarDate,
  workingDayDifference,
  type ResolvedWorkingCalendar,
} from "@/lib/ops/project-schedule-planning";
import { validateDependencyDates } from "@/lib/ops/project-schedule-graph";

export type ScheduleTaskSnapshot = {
  id: string;
  jobId: string;
  title: string;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  dueAt: Date | null;
  updatedAt: Date;
};

export type ScheduleMove = {
  taskId: string;
  jobId: string;
  title: string;
  plannedStartAt: string;
  plannedEndAt: string;
  dueAt: string | null;
  expectedUpdatedAt: string;
  beforeStart: string;
  beforeEnd: string;
};

export function acceptedScheduleDiffNoteId(event: {
  kind: string;
  payload: unknown;
}): string | null {
  if (event.kind !== "schedule_diff_accepted") return null;
  if (!event.payload || typeof event.payload !== "object") return null;
  const noteId = (event.payload as { noteId?: unknown }).noteId;
  return typeof noteId === "string" ? noteId : null;
}

export type ScheduleDiffProposal = {
  noteId: string;
  kind: "blocker" | "quantity";
  effect: string;
  moves: ScheduleMove[];
};

type DatedTask = ScheduleTaskSnapshot & {
  plannedStartAt: Date;
  plannedEndAt: Date;
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

function isDated(task: ScheduleTaskSnapshot): task is DatedTask {
  return task.plannedStartAt instanceof Date && task.plannedEndAt instanceof Date;
}

export function proposeScheduleDiff(input: {
  note: { id: string; kind: string; taskId: string | null };
  tasks: ScheduleTaskSnapshot[];
  edges: Array<{
    predecessorTaskId: string;
    successorTaskId: string;
    lagDays: number;
  }>;
  calendar: ResolvedWorkingCalendar;
}): ScheduleDiffProposal | null {
  if (input.note.kind !== "blocker" && input.note.kind !== "quantity") return null;
  if (!input.note.taskId) return null;
  const origin = input.tasks.find((task) => task.id === input.note.taskId);
  if (!origin || !isDated(origin)) return null;

  const dates = new Map(
    input.tasks.filter(isDated).map((task) => [
      task.id,
      { start: task.plannedStartAt, end: task.plannedEndAt },
    ]),
  );
  const slippedStart = shiftWorkingDays(origin.plannedStartAt, 1, input.calendar);
  const slippedEnd = shiftWorkingDays(origin.plannedEndAt, 1, input.calendar);
  if (!slippedStart || !slippedEnd) return null;
  dates.set(origin.id, { start: slippedStart, end: slippedEnd });

  const outgoing = new Map<string, typeof input.edges>();
  for (const edge of input.edges) {
    const list = outgoing.get(edge.predecessorTaskId) ?? [];
    list.push(edge);
    outgoing.set(edge.predecessorTaskId, list);
  }
  const queue = [origin.id];
  const seen = new Set<string>();
  while (queue.length) {
    const predecessorId = queue.shift();
    if (!predecessorId || seen.has(predecessorId)) continue;
    seen.add(predecessorId);
    const predecessor = dates.get(predecessorId);
    if (!predecessor) continue;
    const predecessorFinish = calendarDate(
      predecessor.end.toISOString(),
      input.calendar,
    );
    if (!predecessorFinish) return null;
    for (const edge of outgoing.get(predecessorId) ?? []) {
      const successor = dates.get(edge.successorTaskId);
      if (!successor) continue;
      const earliest = addWorkingDays(
        predecessorFinish,
        edge.lagDays,
        input.calendar,
      );
      const successorStart = calendarDate(
        successor.start.toISOString(),
        input.calendar,
      );
      if (!successorStart) return null;
      if (successorStart < earliest) {
        const delta = workingDayDifference(
          successorStart,
          earliest,
          input.calendar,
        );
        const nextStart = shiftWorkingDays(successor.start, delta, input.calendar);
        const nextEnd = shiftWorkingDays(successor.end, delta, input.calendar);
        if (!nextStart || !nextEnd) return null;
        dates.set(edge.successorTaskId, { start: nextStart, end: nextEnd });
      }
      queue.push(edge.successorTaskId);
    }
  }

  const graphTasks = input.tasks.map((task) => {
    const next = dates.get(task.id);
    return {
      id: task.id,
      title: task.title,
      plannedStartAt: (next?.start ?? task.plannedStartAt)?.toISOString() ?? null,
      plannedEndAt: (next?.end ?? task.plannedEndAt)?.toISOString() ?? null,
    };
  });
  const validation = validateDependencyDates(
    graphTasks,
    input.edges,
    input.calendar,
  );
  if (!validation.ok) return null;

  const moves = input.tasks.flatMap((task) => {
    const next = dates.get(task.id);
    if (!next || !isDated(task)) return [];
    if (
      next.start.getTime() === task.plannedStartAt.getTime() &&
      next.end.getTime() === task.plannedEndAt.getTime()
    ) {
      return [];
    }
    return [
      {
        taskId: task.id,
        jobId: task.jobId,
        title: task.title,
        plannedStartAt: next.start.toISOString(),
        plannedEndAt: next.end.toISOString(),
        dueAt: task.dueAt?.toISOString() ?? null,
        expectedUpdatedAt: task.updatedAt.toISOString(),
        beforeStart: task.plannedStartAt.toISOString(),
        beforeEnd: task.plannedEndAt.toISOString(),
      },
    ];
  });
  if (!moves.length) return null;
  moves.sort((a, b) => b.plannedStartAt.localeCompare(a.plannedStartAt));
  const effect = moves
    .map(
      (move) =>
        `${move.title} moves from ${move.beforeStart.slice(0, 10)}–${move.beforeEnd.slice(0, 10)} to ${move.plannedStartAt.slice(0, 10)}–${move.plannedEndAt.slice(0, 10)}.`,
    )
    .join(" ");
  return {
    noteId: input.note.id,
    kind: input.note.kind,
    effect,
    moves,
  };
}
