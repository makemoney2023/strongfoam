"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import {
  invalidFrom,
  safeReturnTo,
  type ActionState,
} from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import { parseProjectUpdate } from "@/lib/ops/records";
import {
  addJobTaskDependency,
  captureProjectScheduleBaseline as captureProjectScheduleBaselineRecord,
  deleteJobTaskDependency,
  deleteProject,
  removeProjectScheduleBaseline as removeProjectScheduleBaselineRecord,
  removeScheduleCalendarException as removeScheduleCalendarExceptionRecord,
  rescheduleJob,
  rescheduleJobTask,
  saveProjectScheduleCalendar as saveProjectScheduleCalendarRecord,
  upsertScheduleCalendarException,
  updateProject,
} from "@/lib/ops/store";

function parseOptionalDate(
  formData: FormData,
  name: string,
  label: string,
): { ok: true; value: Date | null } | { ok: false; state: ActionState } {
  const raw = String(formData.get(name) ?? "");
  if (!raw) return { ok: true, value: null };
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    const error = `${label} is invalid.`;
    return { ok: false, state: { error, fields: { [name]: error } } };
  }
  return { ok: true, value };
}

export async function saveProject(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  const parsed = parseProjectUpdate({
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? ""),
    projectManager: String(formData.get("projectManager") ?? ""),
  });
  if (!id) return fail("/app/projects", "Missing project.");
  if (!parsed.ok) return invalidFrom(parsed);
  const project = await updateProject({ id, input: parsed.value });
  if (!project) return fail(`/app/projects/${id}`, "That project could not be updated.");
  revalidatePath("/app/projects");
  revalidatePath(`/app/projects/${id}`);
  revalidatePath("/app/jobs");
  return succeed(`/app/projects/${id}`, "Project saved.");
}

export async function removeProject(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("/app/projects", "Missing project.");
  const result = await deleteProject(id);
  if (!result.ok) return fail(`/app/projects/${id}`, result.error);
  revalidatePath("/app/projects");
  revalidatePath("/app/jobs");
  return succeed("/app/projects", "Project deleted.");
}

export async function addProjectTaskDependency(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/projects/${projectId}`,
  );
  const result = await addJobTaskDependency({
    projectId,
    predecessorTaskId: String(formData.get("predecessorTaskId") ?? ""),
    successorTaskId: String(formData.get("successorTaskId") ?? ""),
    lagDays: Number(formData.get("lagDays") ?? 0),
    actor: session.email,
  });
  if (!result.ok) {
    return result.field
      ? { error: result.error, fields: { [result.field]: result.error } }
      : fail(returnTo, result.error);
  }
  revalidatePath(`/app/projects/${projectId}`);
  return succeed(returnTo, "Dependency added.");
}

export async function removeProjectTaskDependency(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/projects/${projectId}`,
  );
  const result = await deleteJobTaskDependency({
    projectId,
    dependencyId: String(formData.get("dependencyId") ?? ""),
    actor: session.email,
  });
  if (!result.ok) return fail(returnTo, result.error);
  revalidatePath(`/app/projects/${projectId}`);
  return succeed(returnTo, "Dependency removed.");
}

export async function rescheduleProjectScheduleItem(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const projectId = String(formData.get("projectId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const entityType = String(formData.get("entityType") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/projects/${projectId}`,
  );
  if (
    !projectId ||
    !jobId ||
    (entityType !== "job" && entityType !== "task")
  ) {
    return fail(returnTo, "That schedule item could not be rescheduled.");
  }

  const plannedStartAt = parseOptionalDate(
    formData,
    "plannedStartAt",
    "Planned start",
  );
  if (!plannedStartAt.ok) return plannedStartAt.state;
  const plannedEndAt = parseOptionalDate(
    formData,
    "plannedEndAt",
    "Planned completion",
  );
  if (!plannedEndAt.ok) return plannedEndAt.state;
  const dueAt = parseOptionalDate(formData, "dueAt", "Due date");
  if (!dueAt.ok) return dueAt.state;
  const expectedUpdatedAt = new Date(
    String(formData.get("expectedUpdatedAt") ?? ""),
  );
  if (Number.isNaN(expectedUpdatedAt.getTime())) {
    return fail(returnTo, "Refresh the project before rescheduling this item.");
  }

  const result =
    entityType === "job"
      ? await rescheduleJob({
          projectId,
          jobId,
          plannedStartAt: plannedStartAt.value,
          plannedEndAt: plannedEndAt.value,
          expectedUpdatedAt,
          actor: session.email,
        })
      : await rescheduleJobTask({
          projectId,
          jobId,
          taskId,
          plannedStartAt: plannedStartAt.value,
          plannedEndAt: plannedEndAt.value,
          dueAt: dueAt.value,
          expectedUpdatedAt,
          actor: session.email,
        });
  if (!result.ok) return fail(returnTo, result.error);

  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath(`/app/jobs/${jobId}`);
  return succeed(
    returnTo,
    entityType === "job" ? "Job rescheduled." : "Task rescheduled.",
  );
}

export async function captureProjectScheduleBaseline(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/projects/${projectId}`,
  );
  const result = await captureProjectScheduleBaselineRecord({
    projectId,
    name: String(formData.get("name") ?? ""),
    actor: session.email,
  });
  if (!result.ok) return fail(returnTo, result.error);
  revalidatePath(`/app/projects/${projectId}`);
  return succeed(
    `/app/projects/${projectId}?scheduleBaseline=${result.baseline.id}`,
    "Baseline captured.",
  );
}

export async function removeProjectScheduleBaseline(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/projects/${projectId}`,
  );
  const result = await removeProjectScheduleBaselineRecord({
    projectId,
    baselineId: String(formData.get("baselineId") ?? ""),
    actor: session.email,
  });
  if (!result.ok) return fail(returnTo, result.error);
  revalidatePath(`/app/projects/${projectId}`);
  return succeed(`/app/projects/${projectId}`, "Baseline removed.");
}

export async function saveProjectScheduleCalendar(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/projects/${projectId}`,
  );
  const result = await saveProjectScheduleCalendarRecord({
    projectId,
    name: String(formData.get("name") ?? ""),
    timeZone: String(formData.get("timeZone") ?? ""),
    weekendDays: formData
      .getAll("weekendDays")
      .map((value) => Number(value)),
    actor: session.email,
  });
  if (!result.ok) return fail(returnTo, result.error);
  revalidatePath(`/app/projects/${projectId}`);
  return succeed(returnTo, "Working calendar saved.");
}

export async function saveScheduleCalendarException(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/projects/${projectId}`,
  );
  const calendar = await saveProjectScheduleCalendarRecord({
    projectId,
    name: String(formData.get("calendarName") ?? ""),
    timeZone: String(formData.get("calendarTimeZone") ?? ""),
    weekendDays: formData
      .getAll("calendarWeekendDays")
      .map((value) => Number(value)),
    actor: session.email,
  });
  if (!calendar.ok) return fail(returnTo, calendar.error);
  const result = await upsertScheduleCalendarException({
    projectId,
    calendarId: calendar.calendar.id,
    date: String(formData.get("date") ?? ""),
    name: String(formData.get("name") ?? ""),
    isWorkingDay: String(formData.get("isWorkingDay") ?? "") === "true",
    actor: session.email,
  });
  if (!result.ok) return fail(returnTo, result.error);
  revalidatePath(`/app/projects/${projectId}`);
  return succeed(returnTo, "Calendar exception saved.");
}

export async function removeScheduleCalendarException(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/projects/${projectId}`,
  );
  const result = await removeScheduleCalendarExceptionRecord({
    projectId,
    calendarId: String(formData.get("calendarId") ?? ""),
    exceptionId: String(formData.get("exceptionId") ?? ""),
    actor: session.email,
  });
  if (!result.ok) return fail(returnTo, result.error);
  revalidatePath(`/app/projects/${projectId}`);
  return succeed(returnTo, "Calendar exception removed.");
}
