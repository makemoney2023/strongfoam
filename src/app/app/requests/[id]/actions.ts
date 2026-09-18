"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import {
  parseCommentInput,
  parseTaskInput,
  type TaskStatus,
} from "@/lib/ops/collaboration";
import {
  addEstimateRequestComment,
  addEstimateRequestTask,
  parseEstimateRequestUpdate,
  setEstimateRequestTaskStatus,
  updateEstimateRequest,
} from "@/lib/ops/store";

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

function fail(id: string, error: string): never {
  redirect(`/app/requests/${id}?error=${encodeURIComponent(error)}`);
}

export async function addRequestTask(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const id = String(formData.get("id") ?? "");
  const parsed = parseTaskInput({
    title: String(formData.get("title") ?? ""),
    assignee: String(formData.get("assignee") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
  });
  if (!id) fail("", "Missing request.");
  if (!parsed.ok) fail(id, parsed.error);

  await addEstimateRequestTask({
    leadId: id,
    actor: session.email,
    ...parsed.value,
  });
  revalidatePath(`/app/requests/${id}`);
  redirect(`/app/requests/${id}?saved=1`);
}

export async function setRequestTaskStatus(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const id = String(formData.get("id") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  if (!id || !taskId || (status !== "open" && status !== "done")) {
    fail(id, "That task could not be updated.");
  }

  await setEstimateRequestTaskStatus({
    leadId: id,
    taskId,
    actor: session.email,
    status,
  });
  revalidatePath(`/app/requests/${id}`);
  redirect(`/app/requests/${id}?saved=1`);
}

export async function addRequestComment(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const id = String(formData.get("id") ?? "");
  const parsed = parseCommentInput({
    body: String(formData.get("body") ?? ""),
  });
  if (!id) fail("", "Missing request.");
  if (!parsed.ok) fail(id, parsed.error);

  await addEstimateRequestComment({
    leadId: id,
    actor: session.email,
    body: parsed.value.body,
  });
  revalidatePath(`/app/requests/${id}`);
  redirect(`/app/requests/${id}?saved=1`);
}
