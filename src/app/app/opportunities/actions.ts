"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { parseOpportunityUpdate } from "@/lib/ops/records";
import { deleteOpportunity, updateOpportunity } from "@/lib/ops/store";

function fail(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

export async function saveOpportunity(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  const parsed = parseOpportunityUpdate({
    name: String(formData.get("name") ?? ""),
    stage: String(formData.get("stage") ?? ""),
    owner: String(formData.get("owner") ?? ""),
  });
  if (!id) fail("/app/opportunities", "Missing opportunity.");
  if (!parsed.ok) fail(`/app/opportunities/${id}`, parsed.error);
  const opportunity = await updateOpportunity({ id, input: parsed.value });
  if (!opportunity) fail(`/app/opportunities/${id}`, "That opportunity could not be updated.");
  revalidatePath("/app/opportunities");
  revalidatePath(`/app/opportunities/${id}`);
  revalidatePath("/app/companies");
  redirect(`/app/opportunities/${id}?saved=1`);
}

export async function removeOpportunity(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  if (!id) fail("/app/opportunities", "Missing opportunity.");
  const result = await deleteOpportunity(id);
  if (!result.ok) fail(`/app/opportunities/${id}`, result.error);
  revalidatePath("/app/opportunities");
  revalidatePath("/app/companies");
  redirect("/app/opportunities?saved=1");
}
