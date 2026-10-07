"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession, organizationIdForOpsSession, type OpsSession } from "@/lib/ops/auth";
import { listCrewCapacities } from "@/lib/ops/crew-capacity-store";
import { DISPATCH_TIME_ZONE } from "@/lib/ops/dispatch";
import { resolveDispatchAccess } from "@/lib/ops/dispatch-authorization";
import { listDispatches } from "@/lib/ops/dispatch-store";
import { recommendDispatch } from "@/lib/ops/dispatch-recommendation";
import { getOpsNow } from "@/lib/ops/ops-now";
import { listActiveFieldUsers, listJobTasks, updateJobTask } from "@/lib/ops/store";

function actorFrom(session: OpsSession) {
  return {
    email: session.email,
    role: session.role,
    organizationId: "organizationId" in session ? session.organizationId : undefined,
  };
}

export async function acceptDispatchRecommendation(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const actor = actorFrom(session);
  const access = resolveDispatchAccess(actor, "dispatch.edit");
  const jobId = String(formData.get("jobId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const path = `/app/jobs/${jobId}`;
  if (!access.ok) return fail(path, access.error);
  const workDate = workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);
  const [tasks, people, capacities, dispatches] = await Promise.all([
    listJobTasks(jobId),
    listActiveFieldUsers(),
    listCrewCapacities(access.organizationId),
    listDispatches(access.organizationId, workDate),
  ]);
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return fail(path, "That task could not be found.");
  const recommendation = recommendDispatch({
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      assigneeUserId: task.assigneeUserId,
    },
    people: people
      .filter((person) => person.organizationId === organizationIdForOpsSession(actor))
      .map((person) => ({
        userId: person.userId,
        displayName: person.displayName,
        role: person.role,
        active: person.active,
      })),
    capacities,
    dispatches,
    workDate,
  });
  if (
    !recommendation.ok ||
    recommendation.recommendation.taskId !== taskId ||
    recommendation.recommendation.userId !== userId
  ) {
    return fail(path, recommendation.ok ? "That recommendation is no longer current." : recommendation.error);
  }
  const statedUnit =
    task.statedUnit === "bags" || task.statedUnit === "sq_ft" ? task.statedUnit : null;
  const updated = await updateJobTask({
    jobId,
    taskId,
    actor: session.email,
    expectedUpdatedAt: task.updatedAt,
    input: {
      title: task.title,
      assignee: recommendation.recommendation.displayName,
      assigneeUserId: userId,
      dueAt: task.dueAt,
      plannedStartAt: task.plannedStartAt,
      plannedEndAt: task.plannedEndAt,
      workAreaId: task.workAreaId,
      statedQuantity: task.statedQuantity,
      statedUnit,
    },
  });
  revalidatePath("/app");
  revalidatePath(path);
  revalidatePath("/app/dispatch");
  if (!updated) return fail(path, "This task changed. Refresh and try again.");
  return succeed(path, `Assigned ${recommendation.recommendation.displayName}.`);
}
