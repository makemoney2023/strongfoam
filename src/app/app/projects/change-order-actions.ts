"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import {
  createChangeOrder,
  decideChangeOrder,
  submitChangeOrder,
  updateChangeOrderDraft,
  voidChangeOrder,
} from "@/lib/ops/change-order-store";

function actorFrom(session: OpsSession) {
  return {
    email: session.email,
    role: session.role,
    organizationId: "organizationId" in session ? session.organizationId : undefined,
  };
}

function projectPath(projectId: string): string {
  return `/app/projects/${projectId}#change-orders`;
}

async function requireSession(): Promise<OpsSession> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  return session;
}

export async function createProjectChangeOrder(formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return fail("/app/projects", "Missing project.");
  const result = await createChangeOrder({
    actor: actorFrom(session),
    projectId,
    scope: String(formData.get("scope") ?? ""),
    price: String(formData.get("price") ?? ""),
    scheduleImpactDays: String(formData.get("scheduleImpactDays") ?? ""),
  });
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app");
  if (!result.ok) return fail(projectPath(projectId), result.error);
  return succeed(projectPath(projectId), `${result.order.number} saved as a draft.`);
}

export async function updateProjectChangeOrder(formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  const changeOrderId = String(formData.get("changeOrderId") ?? "");
  if (!projectId || !changeOrderId) return fail("/app/projects", "Missing change order.");
  const result = await updateChangeOrderDraft({
    actor: actorFrom(session),
    projectId,
    changeOrderId,
    scope: String(formData.get("scope") ?? ""),
    price: String(formData.get("price") ?? ""),
    scheduleImpactDays: String(formData.get("scheduleImpactDays") ?? ""),
  });
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app");
  if (!result.ok) return fail(projectPath(projectId), result.error);
  return succeed(projectPath(projectId), `${result.order.number} updated.`);
}

export async function submitProjectChangeOrder(formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  const changeOrderId = String(formData.get("changeOrderId") ?? "");
  if (!projectId || !changeOrderId) return fail("/app/projects", "Missing change order.");
  const result = await submitChangeOrder({
    actor: actorFrom(session),
    projectId,
    changeOrderId,
  });
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app");
  if (!result.ok) return fail(projectPath(projectId), result.error);
  return succeed(projectPath(projectId), `${result.order.number} submitted for approval.`);
}

export async function voidProjectChangeOrder(formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  const changeOrderId = String(formData.get("changeOrderId") ?? "");
  if (!projectId || !changeOrderId) return fail("/app/projects", "Missing change order.");
  const result = await voidChangeOrder({
    actor: actorFrom(session),
    projectId,
    changeOrderId,
  });
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app");
  if (!result.ok) return fail(projectPath(projectId), result.error);
  return succeed(projectPath(projectId), `${result.order.number} voided.`);
}

export async function decideProjectChangeOrder(formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const projectId = String(formData.get("projectId") ?? "");
  const changeOrderId = String(formData.get("changeOrderId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!projectId || !changeOrderId) return fail("/app/projects", "Missing change order.");
  if (decision !== "approved" && decision !== "rejected") {
    return fail(projectPath(projectId), "Choose approve or reject.");
  }
  const result = await decideChangeOrder({
    actor: actorFrom(session),
    projectId,
    changeOrderId,
    expectedHash: String(formData.get("contentHash") ?? ""),
    decision,
    comment: String(formData.get("comment") ?? ""),
  });
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app");
  if (!result.ok) return fail(projectPath(projectId), result.error);
  const message =
    result.order.status === "approved"
      ? `${result.order.number} approved. The project budget now includes it.`
      : result.order.status === "rejected"
        ? `${result.order.number} rejected.`
        : `${result.order.number} recorded. Another approver is still required.`;
  return succeed(projectPath(projectId), message);
}
