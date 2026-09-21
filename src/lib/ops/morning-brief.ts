import { workingDayLabel } from "@/lib/ops/ai-evidence";

export type MorningBriefLine = {
  label: string;
  detail: string;
  href: string | null;
};

type BriefTask = {
  id: string;
  title: string;
  status: string;
  assigneeUserId: string | null;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  dueAt: Date | null;
};

type BriefNote = {
  id: string;
  kind: string;
  body: string;
  taskId: string | null;
};

function dayLabel(value: Date | null, timeZone: string): string | null {
  if (!value) return null;
  return workingDayLabel(value, timeZone);
}

function coversWorkingDay(
  task: BriefTask,
  workingDay: string,
  timeZone: string,
): boolean {
  const start = dayLabel(task.plannedStartAt, timeZone);
  const end = dayLabel(task.plannedEndAt, timeZone);
  const due = dayLabel(task.dueAt, timeZone);
  if (due === workingDay) return true;
  if (start && end) return start <= workingDay && workingDay <= end;
  if (start) return start === workingDay;
  if (end) return end === workingDay;
  return false;
}

export function buildMorningBrief(input: {
  jobId: string;
  userId: string;
  now: Date;
  timeZone?: string;
  siteLabel: string | null;
  tasks: BriefTask[];
  notes: BriefNote[];
  plan: { id: string; filename: string } | null;
}): MorningBriefLine[] {
  const timeZone = input.timeZone?.trim() || "America/Toronto";
  const workingDay = workingDayLabel(input.now, timeZone);
  const assignedIds = new Set(
    input.tasks
      .filter((task) => task.assigneeUserId === input.userId)
      .map((task) => task.id),
  );
  const inScope = (note: BriefNote) =>
    note.taskId === null || assignedIds.has(note.taskId);
  const todaysTasks = input.tasks.filter(
    (task) =>
      task.assigneeUserId === input.userId &&
      task.status !== "done" &&
      coversWorkingDay(task, workingDay, timeZone),
  );
  const blockers = input.notes.filter(
    (note) => note.kind === "blocker" && inScope(note) && note.body.trim(),
  );
  const materials = input.notes.filter(
    (note) =>
      note.kind === "material_request" && inScope(note) && note.body.trim(),
  );
  const taskHref = `/field/jobs/${input.jobId}#tasks`;
  const noteHref = `/field/jobs/${input.jobId}#field-log`;
  const lines: MorningBriefLine[] = [
    {
      label: "Site",
      detail: input.siteLabel ?? "Not assigned",
      href: `/field/jobs/${input.jobId}#assignment`,
    },
    {
      label: "Plan",
      detail: input.plan?.filename ?? "No current plan",
      href: input.plan
        ? `/field/jobs/${input.jobId}/plan?documentId=${input.plan.id}`
        : null,
    },
  ];
  if (todaysTasks.length === 0) {
    lines.push({
      label: "Tasks",
      detail: "No tasks assigned to you today.",
      href: taskHref,
    });
  } else {
    for (const task of todaysTasks) {
      lines.push({ label: "Task", detail: task.title, href: taskHref });
    }
  }
  if (blockers.length === 0) {
    lines.push({
      label: "Blockers",
      detail: "No open blockers.",
      href: noteHref,
    });
  } else {
    for (const note of blockers.slice(0, 5)) {
      lines.push({ label: "Blocker", detail: note.body.trim(), href: noteHref });
    }
  }
  if (materials.length === 0) {
    lines.push({
      label: "Material",
      detail: "No open material requests.",
      href: noteHref,
    });
  } else {
    for (const note of materials.slice(0, 5)) {
      lines.push({
        label: "Material",
        detail: note.body.trim(),
        href: noteHref,
      });
    }
  }
  return lines;
}
