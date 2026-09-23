"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { DISPATCH_TIME_ZONE } from "@/lib/ops/dispatch";
import { getFieldSession } from "@/lib/ops/field-auth";
import { recordLabor, removeLabor } from "@/lib/ops/labor-store";
import { getOpsNow } from "@/lib/ops/ops-now";

function today(): string {
  return workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);
}

export async function recordFieldLabor(formData: FormData): Promise<ActionState> {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");
  const workDate = today();
  const result = await recordLabor({
    actor: {
      email: session.email,
      role: session.role,
      organizationId: session.organizationId,
      userId: session.userId,
    },
    jobId: String(formData.get("jobId") ?? ""),
    userId: session.userId,
    workDate,
    kind: String(formData.get("kind") ?? ""),
    hours: String(formData.get("hours") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  revalidatePath("/field");
  revalidatePath("/app/dispatch");
  if (!result.ok) return fail("/field", result.error);
  return succeed("/field", "Labor saved.");
}

export async function removeFieldLabor(formData: FormData): Promise<ActionState> {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");
  const result = await removeLabor({
    actor: {
      email: session.email,
      role: session.role,
      organizationId: session.organizationId,
      userId: session.userId,
    },
    laborId: String(formData.get("laborId") ?? ""),
  });
  revalidatePath("/field");
  revalidatePath("/app/dispatch");
  if (!result.ok) return fail("/field", result.error);
  return succeed("/field", "Labor removed.");
}
