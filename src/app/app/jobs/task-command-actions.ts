"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import { isOfficeMembershipRole } from "@/lib/ops/identity";
import { DEFAULT_WORKING_CALENDAR } from "@/lib/ops/project-schedule-planning";
import {
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

function canUseOfficeAi(session: OpsSession): boolean {
  return session.role === "estimator" || isOfficeMembershipRole(session.role);
}

async function requireOfficeSession(): Promise<OpsSession> {
  const session = await getOpsSession();
  if (!session || !canUseOfficeAi(session)) redirect("/app/login");
  return session;
}

function commandError(kind: TaskCommandKind): string {
  if (kind === "complete") return "That task is already done.";
  if (kind === "reopen") return "That task is already open.";
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

export async function previewTaskCommand(
  jobId: string,
  taskId: string,
  kind: TaskCommandKind,
): Promise<{ ok: true; proposal: TaskCommandProposal } | { ok: false; error: string }> {
  await requireOfficeSession();
  const { task, calendar } = await commandContext(jobId, taskId);
  if (!task) return { ok: false, error: "That task could not be found." };
  const proposal = proposeTaskCommand({ task, kind, calendar });
  if (!proposal) return { ok: false, error: commandError(kind) };
  return { ok: true, proposal };
}

export async function confirmTaskCommand(
  jobId: string,
  taskId: string,
  kind: TaskCommandKind,
  expectedUpdatedAt: string,
): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  const session = await requireOfficeSession();
  const { task, calendar } = await commandContext(jobId, taskId);
  if (!task) return { ok: false, error: "That task could not be found." };
  if (task.updatedAt.toISOString() !== expectedUpdatedAt) {
    return { ok: false, error: "This task changed. Refresh and try again." };
  }
  const proposal = proposeTaskCommand({ task, kind, calendar });
  if (!proposal) return { ok: false, error: commandError(kind) };
  const beforeStatus = task.status === "done" ? "done" : "open";
  const beforeCompletedAt = task.completedAt?.toISOString() ?? null;
  const beforeDueAt = task.dueAt?.toISOString() ?? null;
  const lockedAt = task.updatedAt;
  const updated =
    kind === "slip_due"
      ? await updateJobTask({
          jobId,
          taskId,
          actor: session.email,
          expectedUpdatedAt: lockedAt,
          input: {
            title: task.title,
            assignee: task.assignee,
            assigneeUserId: task.assigneeUserId,
            dueAt: proposal.dueAt ? new Date(proposal.dueAt) : null,
            plannedStartAt: task.plannedStartAt,
            plannedEndAt: task.plannedEndAt,
            workAreaId: task.workAreaId,
          },
        })
      : await setJobTaskStatus({
          jobId,
          taskId,
          actor: session.email,
          status: kind === "complete" ? "done" : "open",
          expectedUpdatedAt: lockedAt,
        });
  if (!updated) {
    return { ok: false, error: "This task changed. Refresh and try again." };
  }
  await recordTaskCommandEvent({
    jobId,
    actor: session.email,
    kind: "task_command_applied",
    summary: proposal.effect,
    payload: {
      commandId: crypto.randomUUID(),
      taskId: task.id,
      kind,
      effect: proposal.effect,
      beforeStatus,
      beforeCompletedAt,
      beforeDueAt,
      afterUpdatedAt: updated.updatedAt.toISOString(),
    },
  });
  revalidatePath(`/app/jobs/${jobId}`);
  return { ok: true, effect: proposal.effect };
}

export async function undoTaskCommand(
  jobId: string,
  taskId: string,
): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  const session = await requireOfficeSession();
  const [taskResult, events] = await Promise.all([
    commandContext(jobId, taskId),
    listJobEvents(jobId),
  ]);
  const task = taskResult.task;
  if (!task) return { ok: false, error: "That task could not be found." };
  const command = newestTaskCommand(events, taskId);
  if (!command) {
    return { ok: false, error: "That task command cannot be undone." };
  }
  if (command.afterUpdatedAt !== task.updatedAt.toISOString()) {
    return { ok: false, error: "This task changed. Refresh and try again." };
  }
  const updated =
    command.kind === "slip_due"
      ? await updateJobTask({
          jobId,
          taskId,
          actor: session.email,
          expectedUpdatedAt: task.updatedAt,
          input: {
            title: task.title,
            assignee: task.assignee,
            assigneeUserId: task.assigneeUserId,
            dueAt: command.beforeDueAt ? new Date(command.beforeDueAt) : null,
            plannedStartAt: task.plannedStartAt,
            plannedEndAt: task.plannedEndAt,
            workAreaId: task.workAreaId,
          },
        })
      : await setJobTaskStatus({
          jobId,
          taskId,
          actor: session.email,
          status: command.beforeStatus,
          expectedUpdatedAt: task.updatedAt,
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
    jobId,
    actor: session.email,
    kind: "task_command_undone",
    summary: `undo: ${command.effect}`,
    payload: { commandId: command.commandId, taskId },
  });
  revalidatePath(`/app/jobs/${jobId}`);
  return { ok: true, effect: `Undone. ${command.effect}` };
}
