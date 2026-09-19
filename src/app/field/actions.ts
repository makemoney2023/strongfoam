"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import {
  invalidFrom,
  safeReturnTo,
  type ActionState,
} from "@/lib/ops/action-result";
import type { TaskStatus } from "@/lib/ops/collaboration";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import { getFieldSession } from "@/lib/ops/field-auth";
import { parseFieldNoteInput } from "@/lib/ops/field-workspace";
import {
  hasAllowedJobDocumentSignature,
  listJobUploadFiles,
  MAX_JOB_UPLOAD_FILES,
  parseJobDocumentInput,
} from "@/lib/ops/job-workspace";
import {
  addJobDocument,
  addJobFieldNote,
  canFieldUserAccessJob,
  canFieldUserAccessTask,
  deleteJobFieldNote,
  getJob,
  listJobFieldNotes,
  setJobTaskStatus,
  updateJobFieldNote,
  updateJobStatus,
} from "@/lib/ops/store";

function refreshField(jobId: string, projectId?: string | null) {
  revalidatePath("/field");
  revalidatePath(`/field/jobs/${jobId}`);
  revalidatePath("/app/jobs");
  revalidatePath(`/app/jobs/${jobId}`);
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
}

export async function setFieldTaskStatus(
  formData: FormData,
): Promise<ActionState> {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");
  const jobId = String(formData.get("jobId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/field/jobs/${jobId}`,
  );
  if (
    !jobId ||
    !taskId ||
    (status !== "open" && status !== "done") ||
    !(await canFieldUserAccessTask(session.userId, jobId, taskId))
  ) {
    return fail(returnTo, "You do not have access to that task.");
  }
  const task = await setJobTaskStatus({
    jobId,
    taskId,
    actor: session.email,
    status,
  });
  if (!task) return fail(returnTo, "That task could not be updated.");
  const job = await getJob(jobId);
  refreshField(jobId, job?.projectId);
  return succeed(
    returnTo,
    status === "done" ? "Task completed." : "Task reopened.",
  );
}

export async function addFieldEntry(
  formData: FormData,
): Promise<ActionState> {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");
  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/field/jobs/${jobId}`,
  );
  const parsed = parseFieldNoteInput({
    kind: String(formData.get("kind") ?? ""),
    body: String(formData.get("body") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    unit: String(formData.get("unit") ?? ""),
  });
  if (
    !jobId ||
    !(await canFieldUserAccessJob(session.userId, jobId))
  ) {
    return fail("/field", "You do not have access to that job.");
  }
  if (!parsed.ok) return invalidFrom(parsed);
  if (
    parsed.value.taskId &&
    !(await canFieldUserAccessTask(
      session.userId,
      jobId,
      parsed.value.taskId,
    ))
  ) {
    return fail(returnTo, "You do not have access to that task.");
  }

  const note = await addJobFieldNote({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!note) return fail(returnTo, "That field entry could not be saved.");

  let job = await getJob(jobId);
  if (parsed.value.kind === "blocker") {
    job = await updateJobStatus({
      jobId,
      actor: session.email,
      status: "blocked",
      blockerNote: parsed.value.body,
    });
  }
  refreshField(jobId, job?.projectId);
  return succeed(returnTo);
}

export async function saveFieldEntry(
  formData: FormData,
): Promise<ActionState> {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");
  const jobId = String(formData.get("jobId") ?? "");
  const noteId = String(formData.get("noteId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/field/jobs/${jobId}`,
  );
  const parsed = parseFieldNoteInput({
    kind: String(formData.get("kind") ?? ""),
    body: String(formData.get("body") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    unit: String(formData.get("unit") ?? ""),
  });
  const existing = (await listJobFieldNotes(jobId)).find(
    (note) => note.id === noteId,
  );
  if (
    !jobId ||
    !noteId ||
    !existing ||
    existing.createdBy !== session.email ||
    !(await canFieldUserAccessJob(session.userId, jobId))
  ) {
    return fail(returnTo, "You can only edit your own field entries.");
  }
  if (!parsed.ok) return invalidFrom(parsed);
  if (
    parsed.value.taskId &&
    !(await canFieldUserAccessTask(
      session.userId,
      jobId,
      parsed.value.taskId,
    ))
  ) {
    return fail(returnTo, "You do not have access to that task.");
  }
  const note = await updateJobFieldNote({
    jobId,
    noteId,
    actor: session.email,
    input: parsed.value,
  });
  if (!note) return fail(returnTo, "That field entry could not be updated.");
  const job = await getJob(jobId);
  refreshField(jobId, job?.projectId);
  return succeed(returnTo);
}

export async function removeFieldEntry(
  formData: FormData,
): Promise<ActionState> {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");
  const jobId = String(formData.get("jobId") ?? "");
  const noteId = String(formData.get("noteId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/field/jobs/${jobId}`,
  );
  const existing = (await listJobFieldNotes(jobId)).find(
    (note) => note.id === noteId,
  );
  if (
    !jobId ||
    !noteId ||
    !existing ||
    existing.createdBy !== session.email ||
    !(await canFieldUserAccessJob(session.userId, jobId))
  ) {
    return fail(returnTo, "You can only remove your own field entries.");
  }
  const note = await deleteJobFieldNote({
    jobId,
    noteId,
    actor: session.email,
  });
  if (!note) return fail(returnTo, "That field entry could not be removed.");
  const job = await getJob(jobId);
  refreshField(jobId, job?.projectId);
  return succeed(returnTo);
}

export async function uploadFieldDocument(
  formData: FormData,
): Promise<ActionState> {
  const session = await getFieldSession();
  if (!session) redirect("/field/login");
  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/field/jobs/${jobId}`,
  );
  if (
    !jobId ||
    !(await canFieldUserAccessJob(session.userId, jobId))
  ) {
    return fail("/field", "You do not have access to that job.");
  }
  if (!isDemoOpsStore()) {
    return fail(returnTo, "Use the configured photo upload flow.");
  }
  const files = listJobUploadFiles(formData);
  if (files.length === 0) return fail(returnTo, "Choose at least one photo.");
  if (files.length > MAX_JOB_UPLOAD_FILES) {
    return fail(returnTo, `Upload up to ${MAX_JOB_UPLOAD_FILES} photos at a time.`);
  }

  const uploaded: string[] = [];
  const failed: string[] = [];
  for (const file of files) {
    const parsed = parseJobDocumentInput({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      kind: "photo",
      workAreaId: String(formData.get("workAreaId") ?? ""),
    });
    if (!parsed.ok) {
      failed.push(`${file.name}: ${parsed.error}`);
      continue;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasAllowedJobDocumentSignature(bytes, parsed.value.contentType)) {
      failed.push(`${file.name}: the contents do not match the file type.`);
      continue;
    }
    const document = await addJobDocument({
      jobId,
      actor: session.email,
      input: parsed.value,
      bytes,
    });
    if (document) uploaded.push(file.name);
    else failed.push(`${file.name}: could not be saved.`);
  }
  const job = await getJob(jobId);
  refreshField(jobId, job?.projectId);
  if (uploaded.length === 0) {
    return fail(returnTo, failed[0] ?? "Those photos could not be uploaded.");
  }
  return succeed(
    returnTo,
    failed.length > 0
      ? `${uploaded.length} uploaded. ${failed[0]}`
      : uploaded.length === 1
        ? "Photo uploaded."
        : `${uploaded.length} photos uploaded.`,
  );
}
