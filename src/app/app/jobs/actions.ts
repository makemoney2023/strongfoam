"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { parseFieldNoteInput } from "@/lib/ops/field-workspace";
import {
  parseJobConversion,
  parseJobDetails,
  parseJobStatusUpdate,
} from "@/lib/ops/jobs";
import {
  hasAllowedJobDocumentSignature,
  parseJobDocumentInput,
  parseJobDocumentMeta,
  parseJobTaskInput,
  parseWorkAreaInput,
} from "@/lib/ops/job-workspace";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import type { TaskStatus } from "@/lib/ops/collaboration";
import {
  addJobDocument,
  addJobFieldNote,
  addJobTask,
  addJobToProject,
  addWorkArea,
  convertOpportunityToProject,
  deleteJob,
  deleteJobDocument,
  deleteJobFieldNote,
  deleteJobTask,
  deleteWorkArea,
  setJobTaskStatus,
  updateJobDetails,
  updateJobDocument,
  updateJobFieldNote,
  updateJobStatus,
  updateJobTask,
  updateWorkArea,
} from "@/lib/ops/store";

function fail(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

function safeReturnTo(value: string, fallback: string): string {
  return value.startsWith("/app/") ? value.split("?")[0] : fallback;
}

function refreshJobs(projectId?: string | null, jobId?: string | null) {
  revalidatePath("/app/jobs");
  revalidatePath("/app/field");
  revalidatePath("/app/projects");
  revalidatePath("/app/opportunities");
  revalidatePath("/app/requests");
  revalidatePath("/app/companies");
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
  if (jobId) {
    revalidatePath(`/app/jobs/${jobId}`);
    revalidatePath(`/app/field/jobs/${jobId}`);
  }
}

export async function convertWonWorkToProject(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const opportunityId = String(formData.get("opportunityId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? `/app/opportunities/${opportunityId}`);
  const parsed = parseJobConversion({
    projectName: String(formData.get("projectName") ?? ""),
    jobName: String(formData.get("jobName") ?? ""),
    scope: String(formData.get("scope") ?? ""),
    projectManager: String(formData.get("projectManager") ?? ""),
    foreman: String(formData.get("foreman") ?? ""),
    plannedStartAt: String(formData.get("plannedStartAt") ?? ""),
    plannedEndAt: String(formData.get("plannedEndAt") ?? ""),
  });
  if (!opportunityId) fail(returnTo, "Missing opportunity.");
  if (!parsed.ok) fail(returnTo, parsed.error);

  const result = await convertOpportunityToProject({
    opportunityId,
    actor: session.email,
    input: parsed.value,
  });
  if (!result.ok) fail(returnTo, result.error);

  refreshJobs(result.projectId, result.jobId);
  redirect(`/app/jobs/${result.jobId}?saved=1`);
}

export async function addProjectJob(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    projectId ? `/app/projects/${projectId}` : "/app/jobs",
  );
  const parsed = parseJobConversion({
    projectName: String(formData.get("projectName") || "Project"),
    jobName: String(formData.get("jobName") ?? ""),
    scope: String(formData.get("scope") ?? ""),
    projectManager: String(formData.get("projectManager") ?? ""),
    foreman: String(formData.get("foreman") ?? ""),
    plannedStartAt: String(formData.get("plannedStartAt") ?? ""),
    plannedEndAt: String(formData.get("plannedEndAt") ?? ""),
  });
  if (!projectId) fail(returnTo, "Choose a project for this job.");
  if (!parsed.ok) fail(returnTo, parsed.error);

  const result = await addJobToProject({
    projectId,
    actor: session.email,
    input: parsed.value,
  });
  if (!result.ok) fail(returnTo, result.error);
  refreshJobs(projectId, result.jobId);
  redirect(`/app/jobs/${result.jobId}?saved=1`);
}

export async function saveJobStatus(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseJobStatusUpdate({
    status: String(formData.get("status") ?? ""),
    blockerNote: String(formData.get("blockerNote") ?? ""),
  });
  if (!jobId) fail("/app/jobs", "Missing job.");
  if (!parsed.ok) fail(`/app/jobs/${jobId}`, parsed.error);

  const job = await updateJobStatus({
    jobId,
    actor: session.email,
    status: parsed.value.status,
    blockerNote: parsed.value.blockerNote,
  });
  if (!job) fail(`/app/jobs/${jobId}`, "That job could not be updated.");
  refreshJobs(job.projectId, job.id);
  const returnTo = String(formData.get("returnTo") ?? `/app/jobs/${job.id}`);
  redirect(`${returnTo}?saved=1`);
}

export async function addJobWorkArea(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseWorkAreaInput({
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!jobId) fail("/app/jobs", "Missing job.");
  if (!parsed.ok) fail(`/app/jobs/${jobId}`, parsed.error);

  const area = await addWorkArea({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!area) fail(`/app/jobs/${jobId}`, "That work area could not be saved.");
  refreshJobs(null, jobId);
  redirect(`/app/jobs/${jobId}?saved=1`);
}

export async function addJobWorkspaceTask(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseJobTaskInput({
    title: String(formData.get("title") ?? ""),
    assignee: String(formData.get("assignee") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
  });
  if (!jobId) fail("/app/jobs", "Missing job.");
  if (!parsed.ok) fail(`/app/jobs/${jobId}`, parsed.error);

  const task = await addJobTask({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!task) fail(`/app/jobs/${jobId}`, "That task could not be saved.");
  refreshJobs(null, jobId);
  redirect(`/app/jobs/${jobId}?saved=1`);
}

export async function setJobWorkspaceTaskStatus(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  if (!jobId || !taskId || (status !== "open" && status !== "done")) {
    fail(jobId ? `/app/jobs/${jobId}` : "/app/jobs", "That task could not be updated.");
  }

  const task = await setJobTaskStatus({
    jobId,
    taskId,
    actor: session.email,
    status,
  });
  if (!task) fail(`/app/jobs/${jobId}`, "That task could not be updated.");
  refreshJobs(null, jobId);
  const returnTo = String(formData.get("returnTo") ?? `/app/jobs/${jobId}`);
  redirect(`${returnTo}?saved=1`);
}

export async function addJobFieldEntry(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? `/app/field/jobs/${jobId}`);
  const parsed = parseFieldNoteInput({
    kind: String(formData.get("kind") ?? ""),
    body: String(formData.get("body") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    unit: String(formData.get("unit") ?? ""),
  });
  if (!jobId) fail("/app/field", "Missing job.");
  if (!parsed.ok) fail(returnTo, parsed.error);

  const note = await addJobFieldNote({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!note) fail(returnTo, "That field entry could not be saved.");

  if (parsed.value.kind === "blocker") {
    const job = await updateJobStatus({
      jobId,
      actor: session.email,
      status: "blocked",
      blockerNote: parsed.value.body,
    });
    if (!job) fail(returnTo, "The blocker was saved, but job status could not be updated.");
    refreshJobs(job.projectId, jobId);
  } else {
    refreshJobs(null, jobId);
  }
  redirect(`${returnTo}?saved=1`);
}

export async function uploadJobDocument(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) fail("/app/jobs", "Missing job.");
  if (!isDemoOpsStore()) {
    fail(
      `/app/jobs/${jobId}`,
      "Production documents must use the configured Blob upload flow.",
    );
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    fail(`/app/jobs/${jobId}`, "Choose a PDF, JPEG, PNG, or WebP file.");
  }

  const parsed = parseJobDocumentInput({
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
    kind: String(formData.get("kind") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
  });
  if (!parsed.ok) fail(`/app/jobs/${jobId}`, parsed.error);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const verified = parseJobDocumentInput({
    ...parsed.value,
    sizeBytes: bytes.byteLength,
  });
  if (!verified.ok) fail(`/app/jobs/${jobId}`, verified.error);
  if (!hasAllowedJobDocumentSignature(bytes, verified.value.contentType)) {
    fail(
      `/app/jobs/${jobId}`,
      "The file contents do not match the selected document type.",
    );
  }
  const document = await addJobDocument({
    jobId,
    actor: session.email,
    input: verified.value,
    bytes,
  });
  if (!document) fail(`/app/jobs/${jobId}`, "That document could not be saved.");
  refreshJobs(null, jobId);
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  redirect(`${returnTo}?saved=1`);
}

export async function saveJobDetails(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  const parsed = parseJobDetails({
    name: String(formData.get("name") ?? ""),
    scope: String(formData.get("scope") ?? ""),
    projectManager: String(formData.get("projectManager") ?? ""),
    foreman: String(formData.get("foreman") ?? ""),
    plannedStartAt: String(formData.get("plannedStartAt") ?? ""),
    plannedEndAt: String(formData.get("plannedEndAt") ?? ""),
  });
  if (!jobId) fail("/app/jobs", "Missing job.");
  if (!parsed.ok) fail(returnTo, parsed.error);
  const job = await updateJobDetails({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!job) fail(returnTo, "That job could not be updated.");
  refreshJobs(job.projectId, job.id);
  redirect(`${returnTo}?saved=1`);
}

export async function removeJob(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) fail("/app/jobs", "Missing job.");
  const result = await deleteJob(jobId);
  if (!result.ok) fail(`/app/jobs/${jobId}`, result.error);
  refreshJobs();
  redirect("/app/jobs?saved=1");
}

export async function saveJobWorkArea(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const workAreaId = String(formData.get("workAreaId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  const parsed = parseWorkAreaInput({
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!jobId || !workAreaId) fail(returnTo, "Missing work area.");
  if (!parsed.ok) fail(returnTo, parsed.error);
  const area = await updateWorkArea({
    jobId,
    workAreaId,
    actor: session.email,
    input: parsed.value,
  });
  if (!area) fail(returnTo, "That work area could not be updated.");
  refreshJobs(null, jobId);
  redirect(`${returnTo}?saved=1`);
}

export async function removeJobWorkArea(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const workAreaId = String(formData.get("workAreaId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  if (!jobId || !workAreaId) fail(returnTo, "Missing work area.");
  const area = await deleteWorkArea({
    jobId,
    workAreaId,
    actor: session.email,
  });
  if (!area) fail(returnTo, "That work area could not be deleted.");
  refreshJobs(null, jobId);
  redirect(`${returnTo}?saved=1`);
}

export async function saveJobWorkspaceTask(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  const parsed = parseJobTaskInput({
    title: String(formData.get("title") ?? ""),
    assignee: String(formData.get("assignee") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
  });
  if (!jobId || !taskId) fail(returnTo, "Missing task.");
  if (!parsed.ok) fail(returnTo, parsed.error);
  const task = await updateJobTask({
    jobId,
    taskId,
    actor: session.email,
    input: parsed.value,
  });
  if (!task) fail(returnTo, "That task could not be updated.");
  refreshJobs(null, jobId);
  redirect(`${returnTo}?saved=1`);
}

export async function removeJobWorkspaceTask(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  if (!jobId || !taskId) fail(returnTo, "Missing task.");
  const task = await deleteJobTask({
    jobId,
    taskId,
    actor: session.email,
  });
  if (!task) fail(returnTo, "That task could not be deleted.");
  refreshJobs(null, jobId);
  redirect(`${returnTo}?saved=1`);
}

export async function saveJobDocumentMeta(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  const parsed = parseJobDocumentMeta({
    kind: String(formData.get("kind") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
  });
  if (!jobId || !documentId) fail(returnTo, "Missing document.");
  if (!parsed.ok) fail(returnTo, parsed.error);
  const document = await updateJobDocument({
    jobId,
    documentId,
    actor: session.email,
    input: parsed.value,
  });
  if (!document) fail(returnTo, "That document could not be updated.");
  refreshJobs(null, jobId);
  redirect(`${returnTo}?saved=1`);
}

export async function removeJobDocument(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  if (!jobId || !documentId) fail(returnTo, "Missing document.");
  const document = await deleteJobDocument({
    jobId,
    documentId,
    actor: session.email,
  });
  if (!document) fail(returnTo, "That document could not be deleted.");
  refreshJobs(null, jobId);
  redirect(`${returnTo}?saved=1`);
}

export async function saveJobFieldEntry(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const noteId = String(formData.get("noteId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/field/jobs/${jobId}`,
  );
  const parsed = parseFieldNoteInput({
    kind: String(formData.get("kind") ?? ""),
    body: String(formData.get("body") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    unit: String(formData.get("unit") ?? ""),
  });
  if (!jobId || !noteId) fail(returnTo, "Missing field entry.");
  if (!parsed.ok) fail(returnTo, parsed.error);
  const note = await updateJobFieldNote({
    jobId,
    noteId,
    actor: session.email,
    input: parsed.value,
  });
  if (!note) fail(returnTo, "That field entry could not be updated.");
  refreshJobs(null, jobId);
  redirect(`${returnTo}?saved=1`);
}

export async function removeJobFieldEntry(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const noteId = String(formData.get("noteId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/field/jobs/${jobId}`,
  );
  if (!jobId || !noteId) fail(returnTo, "Missing field entry.");
  const note = await deleteJobFieldNote({
    jobId,
    noteId,
    actor: session.email,
  });
  if (!note) fail(returnTo, "That field entry could not be deleted.");
  refreshJobs(null, jobId);
  redirect(`${returnTo}?saved=1`);
}
