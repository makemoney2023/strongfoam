"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import { DISPATCH_TIME_ZONE, parseWorkDate } from "@/lib/ops/dispatch";
import { recordLabor, removeLabor } from "@/lib/ops/labor-store";
import { getOpsNow } from "@/lib/ops/ops-now";

function actorFrom(session: OpsSession) {
  return {
    email: session.email,
    role: session.role,
    organizationId: "organizationId" in session ? session.organizationId : undefined,
    userId: "userId" in session ? session.userId : undefined,
  };
}

function dayPath(workDate: string): string {
  return `/app/dispatch?date=${encodeURIComponent(workDate)}`;
}

function requestedDate(formData: FormData): string {
  const parsed = parseWorkDate(String(formData.get("workDate") ?? ""));
  if (parsed.ok) return parsed.value;
  return workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);
}

export async function recordDayLabor(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const workDate = requestedDate(formData);
  const result = await recordLabor({
    actor: actorFrom(session),
    jobId: String(formData.get("jobId") ?? ""),
    userId: String(formData.get("userId") ?? ""),
    workDate,
    kind: String(formData.get("kind") ?? ""),
    hours: String(formData.get("hours") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  revalidatePath("/app/dispatch");
  revalidatePath("/field");
  if (!result.ok) return fail(dayPath(workDate), result.error);
  return succeed(dayPath(workDate), "Labor saved.");
}

export async function removeDayLabor(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const workDate = requestedDate(formData);
  const result = await removeLabor({
    actor: actorFrom(session),
    laborId: String(formData.get("laborId") ?? ""),
  });
  revalidatePath("/app/dispatch");
  revalidatePath("/field");
  if (!result.ok) return fail(dayPath(workDate), result.error);
  return succeed(dayPath(workDate), "Labor removed.");
}
