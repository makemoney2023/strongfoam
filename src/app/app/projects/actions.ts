"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { parseProjectUpdate } from "@/lib/ops/records";
import { deleteProject, updateProject } from "@/lib/ops/store";

function fail(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

export async function saveProject(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  const parsed = parseProjectUpdate({
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? ""),
    projectManager: String(formData.get("projectManager") ?? ""),
  });
  if (!id) fail("/app/projects", "Missing project.");
  if (!parsed.ok) fail(`/app/projects/${id}`, parsed.error);
  const project = await updateProject({ id, input: parsed.value });
  if (!project) fail(`/app/projects/${id}`, "That project could not be updated.");
  revalidatePath("/app/projects");
  revalidatePath(`/app/projects/${id}`);
  revalidatePath("/app/jobs");
  redirect(`/app/projects/${id}?saved=1`);
}

export async function removeProject(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  if (!id) fail("/app/projects", "Missing project.");
  const result = await deleteProject(id);
  if (!result.ok) fail(`/app/projects/${id}`, result.error);
  revalidatePath("/app/projects");
  revalidatePath("/app/jobs");
  redirect("/app/projects?saved=1");
}
