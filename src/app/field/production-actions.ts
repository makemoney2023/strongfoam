"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { DISPATCH_TIME_ZONE } from "@/lib/ops/dispatch";
import { getFieldSession } from "@/lib/ops/field-auth";
import { getOpsNow } from "@/lib/ops/ops-now";
import { recordProduction } from "@/lib/ops/production-store";
import { workforcePerformanceEnabled } from "@/lib/ops/workforce-performance";

export async function recordFieldProduction(formData: FormData): Promise<ActionState> {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");
  if (!workforcePerformanceEnabled()) redirect("/field");
  const workDate = workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);
  const result = await recordProduction({
    actor: {
      email: session.email,
      role: session.role,
      organizationId: session.organizationId,
      userId: session.userId,
    },
    jobId: String(formData.get("jobId") ?? ""),
    workDate,
    trade: String(formData.get("trade") ?? ""),
    workType: String(formData.get("workType") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    attributionMode: "individual",
    participantUserIds: [session.userId],
  });
  revalidatePath("/field");
  revalidatePath("/app/workforce");
  revalidatePath("/app");
  if (!result.ok) return fail("/field", result.error);
  return succeed("/field", "Production recorded.");
}
