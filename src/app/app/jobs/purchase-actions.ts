"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  orderPurchaseOrder,
} from "@/lib/ops/purchase-order-store";

function actorFrom(session: OpsSession) {
  return {
    email: session.email,
    role: session.role,
    organizationId: "organizationId" in session ? session.organizationId : undefined,
  };
}

function jobPath(jobId: string): string {
  return `/app/jobs/${jobId}`;
}

function refresh(jobId: string) {
  revalidatePath("/app");
  revalidatePath("/app/jobs");
  revalidatePath(jobPath(jobId));
  revalidatePath(`/field/jobs/${jobId}`);
}

export async function draftPurchaseOrder(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const result = await createPurchaseOrder({
    actor: actorFrom(session),
    jobId,
    supplier: String(formData.get("supplier") ?? ""),
    note: String(formData.get("note") ?? ""),
    materialRequestIds: formData.getAll("materialRequestId").map(String),
  });
  refresh(jobId);
  if (!result.ok) return fail(jobPath(jobId), result.error);
  return succeed(jobPath(jobId), "Purchase order drafted.");
}

export async function markPurchaseOrderOrdered(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const result = await orderPurchaseOrder({
    actor: actorFrom(session),
    purchaseOrderId: String(formData.get("purchaseOrderId") ?? ""),
  });
  refresh(jobId);
  if (!result.ok) return fail(jobPath(jobId), result.error);
  return succeed(jobPath(jobId), "Purchase order marked ordered.");
}

export async function cancelJobPurchaseOrder(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const result = await cancelPurchaseOrder({
    actor: actorFrom(session),
    purchaseOrderId: String(formData.get("purchaseOrderId") ?? ""),
  });
  refresh(jobId);
  if (!result.ok) return fail(jobPath(jobId), result.error);
  return succeed(jobPath(jobId), "Purchase order cancelled.");
}
