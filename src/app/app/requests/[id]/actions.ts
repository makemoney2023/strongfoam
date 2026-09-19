"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import { invalidFrom, type ActionState } from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import {
  parseCommentInput,
  parseTaskInput,
  type TaskStatus,
} from "@/lib/ops/collaboration";
import {
  findCompanyMatches,
  findContactMatches,
  parseCrmConversion,
  requiresDuplicateDecision,
} from "@/lib/ops/crm";
import {
  addEstimateRequestComment,
  addEstimateRequestTask,
  convertRequestToCrm,
  deleteEstimateRequestComment,
  deleteEstimateRequestTask,
  getEstimateRequest,
  listCompanies,
  listContacts,
  parseEstimateRequestUpdate,
  setEstimateRequestTaskStatus,
  updateEstimateRequest,
  updateEstimateRequestTask,
} from "@/lib/ops/store";

export async function saveEstimateRequestReview(formData: FormData): Promise<ActionState> {
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

  if (!id) return fail("/app/requests", "Missing request.");
  if (!parsed.ok) return invalidFrom(parsed);

  await updateEstimateRequest({
    id,
    actor: session.email,
    update: parsed.value,
  });
  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${id}`);
  return succeed(`/app/requests/${id}`);
}


export async function addRequestTask(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const id = String(formData.get("id") ?? "");
  const parsed = parseTaskInput({
    title: String(formData.get("title") ?? ""),
    assignee: String(formData.get("assignee") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
  });
  if (!id) return fail("/app/requests", "Missing request.");
  if (!parsed.ok) return invalidFrom(parsed);

  await addEstimateRequestTask({
    leadId: id,
    actor: session.email,
    ...parsed.value,
  });
  revalidatePath(`/app/requests/${id}`);
  return succeed(`/app/requests/${id}`);
}

export async function setRequestTaskStatus(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const id = String(formData.get("id") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  if (!id || !taskId || (status !== "open" && status !== "done")) {
    return fail(`/app/requests/${id}`, "That task could not be updated.");
  }

  await setEstimateRequestTaskStatus({
    leadId: id,
    taskId,
    actor: session.email,
    status,
  });
  revalidatePath(`/app/requests/${id}`);
  return succeed(
    `/app/requests/${id}`,
    status === "done" ? "Task completed." : "Task reopened.",
  );
}

export async function saveRequestTask(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const id = String(formData.get("id") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const parsed = parseTaskInput({
    title: String(formData.get("title") ?? ""),
    assignee: String(formData.get("assignee") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
  });
  if (!id || !taskId) return fail(`/app/requests/${id}`, "That task could not be updated.");
  if (!parsed.ok) return invalidFrom(parsed);

  const task = await updateEstimateRequestTask({
    leadId: id,
    taskId,
    actor: session.email,
    ...parsed.value,
  });
  if (!task) return fail(`/app/requests/${id}`, "That task could not be updated.");
  revalidatePath(`/app/requests/${id}`);
  return succeed(`/app/requests/${id}`);
}

export async function removeRequestTask(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const id = String(formData.get("id") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  if (!id || !taskId) return fail(`/app/requests/${id}`, "That task could not be deleted.");
  const task = await deleteEstimateRequestTask({
    leadId: id,
    taskId,
    actor: session.email,
  });
  if (!task) return fail(`/app/requests/${id}`, "That task could not be deleted.");
  revalidatePath(`/app/requests/${id}`);
  return succeed(`/app/requests/${id}`);
}

export async function removeRequestComment(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const id = String(formData.get("id") ?? "");
  const commentId = String(formData.get("commentId") ?? "");
  if (!id || !commentId) return fail(`/app/requests/${id}`, "That comment could not be deleted.");
  const comment = await deleteEstimateRequestComment({
    leadId: id,
    commentId,
    actor: session.email,
  });
  if (!comment) return fail(`/app/requests/${id}`, "That comment could not be deleted.");
  revalidatePath(`/app/requests/${id}`);
  return succeed(`/app/requests/${id}`);
}

export async function addRequestComment(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const id = String(formData.get("id") ?? "");
  const parsed = parseCommentInput({
    body: String(formData.get("body") ?? ""),
  });
  if (!id) return fail("/app/requests", "Missing request.");
  if (!parsed.ok) return invalidFrom(parsed);

  await addEstimateRequestComment({
    leadId: id,
    actor: session.email,
    body: parsed.value.body,
  });
  revalidatePath(`/app/requests/${id}`);
  return succeed(`/app/requests/${id}`);
}

export async function convertRequestToCrmRecords(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const id = String(formData.get("id") ?? "");
  const request = id ? await getEstimateRequest(id) : null;
  if (!id || !request) return fail(`/app/requests/${id}`, "That request could not be found.");

  const parsed = parseCrmConversion({
    companyName: String(formData.get("companyName") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    role: String(formData.get("role") ?? ""),
    siteName: String(formData.get("siteName") ?? ""),
    city: String(formData.get("city") ?? ""),
    province: String(formData.get("province") ?? ""),
    opportunityName: String(formData.get("opportunityName") ?? ""),
    stage: String(formData.get("stage") ?? ""),
    owner: String(formData.get("owner") ?? ""),
    source: request.sourcePath ?? "estimate-request",
    services: request.services,
    projectType: request.projectType,
    linkCompanyId: String(formData.get("linkCompanyId") ?? ""),
    linkContactId: String(formData.get("linkContactId") ?? ""),
    createNew: String(formData.get("createNew") ?? ""),
  });
  if (!parsed.ok) return invalidFrom(parsed);

  const [allCompanies, allContacts] = await Promise.all([
    listCompanies(),
    listContacts(),
  ]);
  const decisionError = requiresDuplicateDecision({
    companyMatches: findCompanyMatches(parsed.value.companyName, allCompanies),
    contactMatches: findContactMatches(
      parsed.value.email,
      parsed.value.phone,
      allContacts,
    ),
    linkCompanyId: parsed.value.linkCompanyId,
    linkContactId: parsed.value.linkContactId,
    createNew: parsed.value.createNew,
  });
  if (decisionError) return invalidFrom(decisionError);

  const result = await convertRequestToCrm({
    leadId: id,
    actor: session.email,
    input: parsed.value,
  });
  if (!result.ok) return fail(`/app/requests/${id}`, result.error);

  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${id}`);
  revalidatePath("/app/companies");
  revalidatePath("/app/opportunities");
  return succeed(`/app/requests/${id}`);
}
