"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import { invalidFrom, type ActionState } from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import { parseOpportunityUpdate } from "@/lib/ops/records";
import { deleteOpportunity, updateOpportunity } from "@/lib/ops/store";

export async function saveOpportunity(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  const parsed = parseOpportunityUpdate({
    name: String(formData.get("name") ?? ""),
    stage: String(formData.get("stage") ?? ""),
    owner: String(formData.get("owner") ?? ""),
  });
  if (!id) return fail("/app/opportunities", "Missing opportunity.");
  if (!parsed.ok) return invalidFrom(parsed);
  const opportunity = await updateOpportunity({ id, input: parsed.value });
  if (!opportunity) return fail(`/app/opportunities/${id}`, "That opportunity could not be updated.");
  revalidatePath("/app/opportunities");
  revalidatePath(`/app/opportunities/${id}`);
  revalidatePath("/app/companies");
  return succeed(`/app/opportunities/${id}`, "Opportunity saved.");
}

export async function removeOpportunity(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("/app/opportunities", "Missing opportunity.");
  const result = await deleteOpportunity(id);
  if (!result.ok) return fail(`/app/opportunities/${id}`, result.error);
  revalidatePath("/app/opportunities");
  revalidatePath("/app/companies");
  return succeed("/app/opportunities", "Opportunity deleted.");
}
