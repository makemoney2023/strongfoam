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
  deleteJobTaskDependency,
  deleteProject,
  updateProject,
} from "@/lib/ops/store";

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
