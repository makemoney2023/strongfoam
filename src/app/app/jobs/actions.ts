"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { parseJobConversion, parseJobStatusUpdate } from "@/lib/ops/jobs";
import {
  hasAllowedJobDocumentSignature,
  parseJobDocumentInput,
  parseJobTaskInput,
  parseWorkAreaInput,
} from "@/lib/ops/job-workspace";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import type { TaskStatus } from "@/lib/ops/collaboration";
import {
  addJobDocument,
  addJobTask,
  addJobToProject,
  addWorkArea,
  convertOpportunityToProject,
  setJobTaskStatus,
  updateJobStatus,
} from "@/lib/ops/store";

function fail(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

function refreshJobs(projectId?: string | null, jobId?: string | null) {
  revalidatePath("/app/jobs");
  revalidatePath("/app/projects");
  revalidatePath("/app/opportunities");
  revalidatePath("/app/requests");
  revalidatePath("/app/companies");
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
  if (jobId) revalidatePath(`/app/jobs/${jobId}`);
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
  const parsed = parseJobConversion({
    projectName: String(formData.get("projectName") ?? "Project"),
    jobName: String(formData.get("jobName") ?? ""),
    scope: String(formData.get("scope") ?? ""),
    projectManager: String(formData.get("projectManager") ?? ""),
    foreman: String(formData.get("foreman") ?? ""),
    plannedStartAt: String(formData.get("plannedStartAt") ?? ""),
    plannedEndAt: String(formData.get("plannedEndAt") ?? ""),
  });
  if (!projectId) fail("/app/projects", "Missing project.");
  if (!parsed.ok) fail(`/app/projects/${projectId}`, parsed.error);

  const result = await addJobToProject({
    projectId,
    actor: session.email,
    input: parsed.value,
  });
  if (!result.ok) fail(`/app/projects/${projectId}`, result.error);
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
  redirect(`/app/jobs/${job.id}?saved=1`);
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
  redirect(`/app/jobs/${jobId}?saved=1`);
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
  if (!hasAllowedJobDocumentSignature(bytes, parsed.value.contentType)) {
    fail(
      `/app/jobs/${jobId}`,
      "The file contents do not match the selected document type.",
    );
  }
  const document = await addJobDocument({
    jobId,
    actor: session.email,
    input: parsed.value,
    bytes,
  });
  if (!document) fail(`/app/jobs/${jobId}`, "That document could not be saved.");
  refreshJobs(null, jobId);
  redirect(`/app/jobs/${jobId}?saved=1`);
}
