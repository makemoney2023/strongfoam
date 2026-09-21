import { DEFAULT_WORKING_CALENDAR } from "@/lib/ops/project-schedule-planning";
import {
  isTaskCommandKind,
  newestTaskCommand,
  proposeTaskCommand,
  type TaskCommandKind,
  type TaskCommandProposal,
} from "@/lib/ops/task-command";
import {
  getJob,
  listJobEvents,
  listJobTasks,
  recordTaskCommandEvent,
  resolveProjectScheduleCalendar,
  setJobTaskStatus,
  updateJobTask,
} from "@/lib/ops/store";

function commandError(kind: TaskCommandKind, hasDueDate: boolean): string {
  if (kind === "complete") return "That task is already done.";
  if (kind === "reopen") return "That task is already open.";
  if (hasDueDate) return "That due date could not be moved.";
  return "That task has no due date to move.";
}

async function commandContext(jobId: string, taskId: string) {
  const job = await getJob(jobId);
  const [tasks, calendar] = await Promise.all([
    listJobTasks(jobId),
    job?.projectId
      ? resolveProjectScheduleCalendar(job.projectId)
      : Promise.resolve(DEFAULT_WORKING_CALENDAR),
  ]);
  return {
    task: tasks.find((item) => item.id === taskId) ?? null,
    calendar,
  };
}

function taskInput(
  task: {
    title: string;
    assignee: string | null;
    assigneeUserId: string | null;
    plannedStartAt: Date | null;
    plannedEndAt: Date | null;
    workAreaId: string | null;
  },
  dueAt: Date | null,
) {
  return {
    title: task.title,
    assignee: task.assignee,
    assigneeUserId: task.assigneeUserId,
    dueAt,
    plannedStartAt: task.plannedStartAt,
    plannedEndAt: task.plannedEndAt,
    workAreaId: task.workAreaId,
  };
}

export async function previewTaskCommandChange(
  jobId: string,
  taskId: string,
  kind: TaskCommandKind,
): Promise<{ ok: true; proposal: TaskCommandProposal } | { ok: false; error: string }> {
  if (!isTaskCommandKind(kind)) {
    return { ok: false, error: "Choose a task change." };
  }
  const { task, calendar } = await commandContext(jobId, taskId);
  if (!task) return { ok: false, error: "That task could not be found." };
  const proposal = proposeTaskCommand({ task, kind, calendar });
  if (!proposal) return { ok: false, error: commandError(kind, Boolean(task.dueAt)) };
  return { ok: true, proposal };
}

export async function applyConfirmedTaskCommand(args: {
  jobId: string;
  taskId: string;
  actor: string;
  kind: TaskCommandKind;
  expectedUpdatedAt: string;
}): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  if (!isTaskCommandKind(args.kind)) {
    return { ok: false, error: "Choose a task change." };
  }
  const { task, calendar } = await commandContext(args.jobId, args.taskId);
  if (!task) return { ok: false, error: "That task could not be found." };
  if (task.updatedAt.toISOString() !== args.expectedUpdatedAt) {
    return { ok: false, error: "This task changed. Refresh and try again." };
  }
  const proposal = proposeTaskCommand({ task, kind: args.kind, calendar });
  if (!proposal) {
    return { ok: false, error: commandError(args.kind, Boolean(task.dueAt)) };
  }
  const beforeStatus = task.status === "done" ? "done" : "open";
  const beforeCompletedAt = task.completedAt?.toISOString() ?? null;
  const beforeDueAt = task.dueAt?.toISOString() ?? null;
  const beforeUpdatedAt = task.updatedAt.toISOString();
  const lockedAt = new Date(task.updatedAt);
  const updated =
    args.kind === "slip_due"
      ? await updateJobTask({
          jobId: args.jobId,
          taskId: args.taskId,
          actor: args.actor,
          expectedUpdatedAt: lockedAt,
          input: taskInput(task, proposal.dueAt ? new Date(proposal.dueAt) : null),
        })
      : await setJobTaskStatus({
          jobId: args.jobId,
          taskId: args.taskId,
          actor: args.actor,
          status: args.kind === "complete" ? "done" : "open",
          expectedUpdatedAt: lockedAt,
        });
  if (!updated) {
    return { ok: false, error: "This task changed. Refresh and try again." };
  }
  await recordTaskCommandEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "task_command_applied",
    summary: proposal.effect,
    payload: {
      commandId: crypto.randomUUID(),
      taskId: task.id,
      kind: args.kind,
      effect: proposal.effect,
      beforeStatus,
      beforeCompletedAt,
      beforeDueAt,
      beforeUpdatedAt,
      afterUpdatedAt: updated.updatedAt.toISOString(),
    },
  });
  return { ok: true, effect: proposal.effect };
}

export async function applyDirectTaskStatus(args: {
  jobId: string;
  taskId: string;
  actor: string;
  status: "open" | "done";
}): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  const { task, calendar } = await commandContext(args.jobId, args.taskId);
  if (!task) return { ok: false, error: "That task could not be found." };
  const kind = args.status === "done" ? "complete" : "reopen";
  const proposal = proposeTaskCommand({ task, kind, calendar });
  if (!proposal) return { ok: false, error: commandError(kind, Boolean(task.dueAt)) };
  return applyConfirmedTaskCommand({
    jobId: args.jobId,
    taskId: args.taskId,
    actor: args.actor,
    kind,
    expectedUpdatedAt: proposal.expectedUpdatedAt,
  });
}

export async function undoAppliedTaskCommand(args: {
  jobId: string;
  taskId: string;
  actor: string;
  onlyActor?: string;
}): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  const [taskResult, events] = await Promise.all([
    commandContext(args.jobId, args.taskId),
    listJobEvents(args.jobId),
  ]);
  const task = taskResult.task;
  if (!task) return { ok: false, error: "That task could not be found." };
  const command = newestTaskCommand(events, args.taskId);
  if (!command) {
    return { ok: false, error: "That task command cannot be undone." };
  }
  if (args.onlyActor && command.actor !== args.onlyActor) {
    return { ok: false, error: "You can only undo your own task change." };
  }
  if (command.afterUpdatedAt !== task.updatedAt.toISOString()) {
    return { ok: false, error: "This task changed. Refresh and try again." };
  }
  const restoredUpdatedAt = command.beforeUpdatedAt
    ? new Date(command.beforeUpdatedAt)
    : undefined;
  if (restoredUpdatedAt && Number.isNaN(restoredUpdatedAt.getTime())) {
    return { ok: false, error: "That task command cannot be undone." };
  }
  const updated =
    command.kind === "slip_due"
      ? await updateJobTask({
          jobId: args.jobId,
          taskId: args.taskId,
          actor: args.actor,
          expectedUpdatedAt: task.updatedAt,
          restoredUpdatedAt,
          input: taskInput(
            task,
            command.beforeDueAt ? new Date(command.beforeDueAt) : null,
          ),
        })
      : await setJobTaskStatus({
          jobId: args.jobId,
          taskId: args.taskId,
          actor: args.actor,
          status: command.beforeStatus,
          expectedUpdatedAt: task.updatedAt,
          restoredUpdatedAt,
          ...(command.beforeStatus === "done"
            ? {
                completedAt: command.beforeCompletedAt
                  ? new Date(command.beforeCompletedAt)
                  : null,
              }
            : {}),
        });
  if (!updated) {
    return { ok: false, error: "This task changed. Refresh and try again." };
  }
  await recordTaskCommandEvent({
    jobId: args.jobId,
    actor: args.actor,
    kind: "task_command_undone",
    summary: `undo: ${command.effect}`,
    payload: { commandId: command.commandId, taskId: args.taskId },
  });
  return { ok: true, effect: `Undone. ${command.effect}` };
}
