"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import { DISPATCH_TIME_ZONE, parseWorkDate } from "@/lib/ops/dispatch";
import { getOpsNow } from "@/lib/ops/ops-now";
import {
  approveProductionTarget,
  recordProduction,
  verifyProduction,
  voidProduction,
} from "@/lib/ops/production-store";
import { workforcePerformanceEnabled } from "@/lib/ops/workforce-performance";

function actorFrom(session: OpsSession) {
  return {
    email: session.email,
    role: session.role,
    organizationId: "organizationId" in session ? session.organizationId : undefined,
    userId: "userId" in session ? session.userId : undefined,
  };
}

function dayPath(workDate: string): string {
  return `/app/workforce?date=${encodeURIComponent(workDate)}`;
}

function requestedDate(formData: FormData): string {
  const parsed = parseWorkDate(String(formData.get("workDate") ?? ""));
  if (parsed.ok) return parsed.value;
  return workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);
}

export async function recordWorkforceProduction(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  if (!workforcePerformanceEnabled()) redirect("/app");
  const workDate = requestedDate(formData);
  const result = await recordProduction({
    actor: actorFrom(session),
    jobId: String(formData.get("jobId") ?? ""),
    workDate,
    trade: String(formData.get("trade") ?? ""),
    workType: String(formData.get("workType") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    attributionMode: String(formData.get("attributionMode") ?? ""),
    participantUserIds: formData.getAll("participantUserId").map(String),
  });
  revalidatePath("/app/workforce");
  revalidatePath("/field");
  revalidatePath("/app");
  if (!result.ok) return fail(dayPath(workDate), result.error);
  return succeed(dayPath(workDate), "Production recorded.");
}

export async function verifyWorkforceProduction(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  if (!workforcePerformanceEnabled()) redirect("/app");
  const workDate = requestedDate(formData);
  const result = await verifyProduction({
    actor: actorFrom(session),
    productionId: String(formData.get("productionId") ?? ""),
  });
  revalidatePath("/app/workforce");
  revalidatePath("/field");
  revalidatePath("/app");
  if (!result.ok) return fail(dayPath(workDate), result.error);
  return succeed(dayPath(workDate), "Production verified.");
}

export async function voidWorkforceProduction(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  if (!workforcePerformanceEnabled()) redirect("/app");
  const workDate = requestedDate(formData);
  const result = await voidProduction({
    actor: actorFrom(session),
    productionId: String(formData.get("productionId") ?? ""),
  });
  revalidatePath("/app/workforce");
  revalidatePath("/field");
  revalidatePath("/app");
  if (!result.ok) return fail(dayPath(workDate), result.error);
  return succeed(dayPath(workDate), "Production voided.");
}

export async function approveWorkforceTarget(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  if (!workforcePerformanceEnabled()) redirect("/app");
  const workDate = requestedDate(formData);
  const result = await approveProductionTarget({
    actor: actorFrom(session),
    trade: String(formData.get("trade") ?? ""),
    workType: String(formData.get("workType") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    basis: String(formData.get("basis") ?? ""),
    rate: String(formData.get("rate") ?? ""),
    effectiveFrom: String(formData.get("effectiveFrom") ?? workDate),
  });
  revalidatePath("/app/workforce");
  revalidatePath("/field");
  if (!result.ok) return fail(dayPath(workDate), result.error);
  return succeed(dayPath(workDate), "Target approved.");
}
