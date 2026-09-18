"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { parseEstimateRequestUpdate, updateEstimateRequest } from "@/lib/ops/store";

export async function saveEstimateRequestReview(formData: FormData) {
  const session = await getOpsSession();
  if (!session) {
    redirect("/app/login");
  }

  const id = String(formData.get("id") ?? "");
  const parsed = parseEstimateRequestUpdate({
    workflowStatus: String(formData.get("workflowStatus") ?? ""),
    assignedTo: String(formData.get("assignedTo") ?? ""),
    nextAction: String(formData.get("nextAction") ?? ""),
    nextActionDueAt: String(formData.get("nextActionDueAt") ?? ""),
    lostReason: String(formData.get("lostReason") ?? ""),
    note: String(formData.get("note") ?? ""),
  });

  if (!id || !parsed.ok) {
    redirect(`/app/requests/${id || ""}?error=${encodeURIComponent(parsed.ok ? "Missing request." : parsed.error)}`);
  }

  await updateEstimateRequest({
    id,
    actor: session.email,
    update: parsed.value,
  });
  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${id}`);
  redirect(`/app/requests/${id}?saved=1`);
}
