"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { DISPATCH_TIME_ZONE, parseWorkDate } from "@/lib/ops/dispatch";
import { cancelDispatch, scheduleDispatch } from "@/lib/ops/dispatch-store";
import { getOpsNow } from "@/lib/ops/ops-now";

function actorFrom(session: OpsSession) {
  return {
    email: session.email,
    role: session.role,
    organizationId: "organizationId" in session ? session.organizationId : undefined,
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

async function requireSession(): Promise<OpsSession> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  return session;
}

export async function scheduleDayDispatch(formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const workDate = requestedDate(formData);
  const result = await scheduleDispatch({
    actor: actorFrom(session),
    jobId: String(formData.get("jobId") ?? ""),
    userId: String(formData.get("userId") ?? ""),
    workDate,
    note: String(formData.get("note") ?? ""),
  });
  revalidatePath("/app/dispatch");
  revalidatePath("/app");
  revalidatePath("/field");
  if (!result.ok) return fail(dayPath(workDate), result.error);
  return succeed(dayPath(workDate), "Dispatch saved.");
}

export async function cancelDayDispatch(formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const workDate = requestedDate(formData);
  const result = await cancelDispatch({
    actor: actorFrom(session),
    dispatchId: String(formData.get("dispatchId") ?? ""),
  });
  revalidatePath("/app/dispatch");
  revalidatePath("/app");
  revalidatePath("/field");
  if (!result.ok) return fail(dayPath(workDate), result.error);
  return succeed(dayPath(workDate), "Dispatch cancelled.");
}
