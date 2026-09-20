"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import {
  invalidFrom,
  safeReturnTo,
  type ActionState,
} from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import { parseFieldNoteInput } from "@/lib/ops/field-workspace";
import { parseJobAssignmentInput } from "@/lib/ops/identity";
import {
  parseJobConversion,
  parseJobDetails,
  parseJobStatusUpdate,
} from "@/lib/ops/jobs";
import {
  hasAllowedJobDocumentSignature,
  listJobUploadFiles,
  MAX_JOB_UPLOAD_FILES,
  parseJobDocumentInput,
  parseJobDocumentMeta,
  parseJobTaskInput,
  parseWorkAreaInput,
} from "@/lib/ops/job-workspace";
import { parsePlanAnnotationInput } from "@/lib/ops/plan-markup";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import type { TaskStatus } from "@/lib/ops/collaboration";
import {
  addJobDocument,
  addJobPlanAnnotation,
  addJobAssignment,
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
  getJob,
  removeJobAssignment,
  setJobTaskStatus,
  updateJobDetails,
  updateJobDocument,
  updateJobFieldNote,
  updateJobStatus,
  updateJobTask,
  updateWorkArea,
  voidJobPlanAnnotation,
} from "@/lib/ops/store";


function refreshJobs(projectId?: string | null, jobId?: string | null) {
  revalidatePath("/app/jobs");
  revalidatePath("/app/field");
  revalidatePath("/field");
  revalidatePath("/app/projects");
  revalidatePath("/app/opportunities");
  revalidatePath("/app/requests");
  revalidatePath("/app/companies");
  if (projectId) revalidatePath(`/app/projects/${projectId}`);
  if (jobId) {
    revalidatePath(`/app/jobs/${jobId}`);
    revalidatePath(`/app/jobs/${jobId}/plan`);
    revalidatePath(`/app/field/jobs/${jobId}`);
    revalidatePath(`/field/jobs/${jobId}`);
    revalidatePath(`/field/jobs/${jobId}/plan`);
  }
}

export async function convertWonWorkToProject(formData: FormData): Promise<ActionState> {
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
  if (!opportunityId) return fail(returnTo, "Missing opportunity.");
  if (!parsed.ok) return invalidFrom(parsed);

  const result = await convertOpportunityToProject({
    opportunityId,
    actor: session.email,
    input: parsed.value,
  });
  if (!result.ok) return fail(returnTo, result.error);

  refreshJobs(result.projectId, result.jobId);
  return succeed(`/app/jobs/${result.jobId}`, "Job created.");
}

export async function addProjectJob(formData: FormData): Promise<ActionState> {
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
  if (!projectId) return fail(returnTo, "Choose a project for this job.");
  if (!parsed.ok) return invalidFrom(parsed);

  const result = await addJobToProject({
    projectId,
    actor: session.email,
    input: parsed.value,
  });
  if (!result.ok) return fail(returnTo, result.error);
  refreshJobs(projectId, result.jobId);
  return succeed(`/app/jobs/${result.jobId}`, "Job created.");
}

export async function saveJobStatus(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseJobStatusUpdate({
    status: String(formData.get("status") ?? ""),
    blockerNote: String(formData.get("blockerNote") ?? ""),
  });
  if (!jobId) return fail("/app/jobs", "Missing job.");
  if (!parsed.ok) return invalidFrom(parsed);

  const job = await updateJobStatus({
    jobId,
    actor: session.email,
    status: parsed.value.status,
    blockerNote: parsed.value.blockerNote,
  });
  if (!job) return fail(`/app/jobs/${jobId}`, "That job could not be updated.");
  refreshJobs(job.projectId, job.id);
  const returnTo = String(formData.get("returnTo") ?? `/app/jobs/${job.id}`);
  return succeed(returnTo);
}

export async function assignFieldUserToJob(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    jobId ? `/app/jobs/${jobId}` : "/app/jobs",
  );
  const parsed = parseJobAssignmentInput({
    userId: String(formData.get("userId") ?? ""),
    role: String(formData.get("assignmentRole") ?? ""),
  });
  if (!jobId) return fail(returnTo, "Missing job.");
  if (!parsed.ok) return invalidFrom(parsed);
  const assignment = await addJobAssignment({
    jobId,
    actor: session.email,
    ...parsed.value,
  });
  if (!assignment) {
    return fail(returnTo, "That field worker could not be assigned.");
  }
  const job = await getJob(jobId);
  refreshJobs(job?.projectId, jobId);
  return succeed(returnTo, `${assignment.displayName} assigned.`);
}

export async function unassignFieldUserFromJob(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    jobId ? `/app/jobs/${jobId}` : "/app/jobs",
  );
  if (!jobId || !assignmentId) {
    return fail(returnTo, "Missing field assignment.");
  }
  const assignment = await removeJobAssignment({
    jobId,
    assignmentId,
    actor: session.email,
  });
  if (!assignment) {
    return fail(returnTo, "That field assignment could not be removed.");
  }
  const job = await getJob(jobId);
  refreshJobs(job?.projectId, jobId);
  return succeed(returnTo, `${assignment.displayName} unassigned.`);
}

export async function addJobWorkArea(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseWorkAreaInput({
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!jobId) return fail("/app/jobs", "Missing job.");
  if (!parsed.ok) return invalidFrom(parsed);

  const area = await addWorkArea({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!area) return fail(`/app/jobs/${jobId}`, "That work area could not be saved.");
  refreshJobs(null, jobId);
  return succeed(`/app/jobs/${jobId}`);
}

export async function addJobWorkspaceTask(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const parsed = parseJobTaskInput({
    title: String(formData.get("title") ?? ""),
    assignee: String(formData.get("assignee") ?? ""),
    assigneeUserId: String(formData.get("assigneeUserId") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
    plannedStartAt: String(formData.get("plannedStartAt") ?? ""),
    plannedEndAt: String(formData.get("plannedEndAt") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
  });
  if (!jobId) return fail("/app/jobs", "Missing job.");
  if (!parsed.ok) return invalidFrom(parsed);

  const task = await addJobTask({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!task) return fail(`/app/jobs/${jobId}`, "That task could not be saved.");
  const job = await getJob(jobId);
  refreshJobs(job?.projectId, jobId);
  return succeed(`/app/jobs/${jobId}`);
}

export async function setJobWorkspaceTaskStatus(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  if (!jobId || !taskId || (status !== "open" && status !== "done")) {
    return fail(jobId ? `/app/jobs/${jobId}` : "/app/jobs", "That task could not be updated.");
  }

  const task = await setJobTaskStatus({
    jobId,
    taskId,
    actor: session.email,
    status,
  });
  if (!task) return fail(`/app/jobs/${jobId}`, "That task could not be updated.");
  const job = await getJob(jobId);
  refreshJobs(job?.projectId, jobId);
  const returnTo = String(formData.get("returnTo") ?? `/app/jobs/${jobId}`);
  return succeed(returnTo, status === "done" ? "Task completed." : "Task reopened.");
}

export async function addJobFieldEntry(formData: FormData): Promise<ActionState> {
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
  if (!jobId) return fail("/app/field", "Missing job.");
  if (!parsed.ok) return invalidFrom(parsed);

  const note = await addJobFieldNote({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!note) return fail(returnTo, "That field entry could not be saved.");

  if (parsed.value.kind === "blocker") {
    const job = await updateJobStatus({
      jobId,
      actor: session.email,
      status: "blocked",
      blockerNote: parsed.value.body,
    });
    if (!job) return fail(returnTo, "The blocker was saved, but job status could not be updated.");
    refreshJobs(job.projectId, jobId);
  } else {
    refreshJobs(null, jobId);
  }
  return succeed(returnTo);
}

export async function uploadJobDocument(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return fail("/app/jobs", "Missing job.");
  if (!isDemoOpsStore()) {
    return fail(
      `/app/jobs/${jobId}`,
      "Production documents must use the configured Blob upload flow.",
    );
  }
  const files = listJobUploadFiles(formData);
  const replacesDocumentId = String(
    formData.get("replacesDocumentId") ?? "",
  ).trim();
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  if (files.length === 0) {
    return fail(returnTo, "Choose at least one PDF, JPEG, PNG, or WebP file.");
  }
  if (files.length > MAX_JOB_UPLOAD_FILES) {
    return fail(returnTo, `Upload up to ${MAX_JOB_UPLOAD_FILES} files at a time.`);
  }
  if (replacesDocumentId && files.length !== 1) {
    return fail(returnTo, "Upload one file per plan revision.");
  }

  const uploaded: string[] = [];
  const failed: string[] = [];

  for (const file of files) {
    const parsed = parseJobDocumentInput({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      kind: String(formData.get("kind") ?? ""),
      workAreaId: String(formData.get("workAreaId") ?? ""),
      replacesDocumentId,
    });
    if (!parsed.ok) {
      failed.push(`${file.name}: ${parsed.error}`);
      continue;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const verified = parseJobDocumentInput({
      ...parsed.value,
      sizeBytes: bytes.byteLength,
    });
    if (!verified.ok) {
      failed.push(`${file.name}: ${verified.error}`);
      continue;
    }
    if (!hasAllowedJobDocumentSignature(bytes, verified.value.contentType)) {
      failed.push(`${file.name}: the file contents do not match the selected type.`);
      continue;
    }
    const document = await addJobDocument({
      jobId,
      actor: session.email,
      input: verified.value,
      bytes,
    });
    if (!document) {
      failed.push(`${file.name}: could not be saved.`);
      continue;
    }
    uploaded.push(file.name);
  }

  refreshJobs(null, jobId);
  if (uploaded.length === 0) {
    return fail(returnTo, failed[0] ?? "Those files could not be uploaded.");
  }
  if (failed.length > 0) {
    return succeed(
      returnTo,
      `${uploaded.length} uploaded. ${failed[0]}`,
    );
  }
  return succeed(
    returnTo,
    uploaded.length === 1 ? "File uploaded." : `${uploaded.length} files uploaded.`,
  );
}

export async function saveJobDetails(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  const parsed = parseJobDetails({
    name: String(formData.get("jobName") || formData.get("name") || ""),
    scope: String(formData.get("scope") ?? ""),
    projectManager: String(formData.get("projectManager") ?? ""),
    foreman: String(formData.get("foreman") ?? ""),
    plannedStartAt: String(formData.get("plannedStartAt") ?? ""),
    plannedEndAt: String(formData.get("plannedEndAt") ?? ""),
  });
  if (!jobId) return fail("/app/jobs", "Missing job.");
  if (!parsed.ok) return invalidFrom(parsed);
  const job = await updateJobDetails({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!job) return fail(returnTo, "That job could not be updated.");
  refreshJobs(job.projectId, job.id);
  return succeed(returnTo);
}

export async function removeJob(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return fail("/app/jobs", "Missing job.");
  const result = await deleteJob(jobId);
  if (!result.ok) return fail(`/app/jobs/${jobId}`, result.error);
  refreshJobs();
  return succeed("/app/jobs", "Job deleted.");
}

export async function saveJobWorkArea(formData: FormData): Promise<ActionState> {
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
  if (!jobId || !workAreaId) return fail(returnTo, "Missing work area.");
  if (!parsed.ok) return invalidFrom(parsed);
  const area = await updateWorkArea({
    jobId,
    workAreaId,
    actor: session.email,
    input: parsed.value,
  });
  if (!area) return fail(returnTo, "That work area could not be updated.");
  refreshJobs(null, jobId);
  return succeed(returnTo);
}

export async function removeJobWorkArea(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const workAreaId = String(formData.get("workAreaId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  if (!jobId || !workAreaId) return fail(returnTo, "Missing work area.");
  const area = await deleteWorkArea({
    jobId,
    workAreaId,
    actor: session.email,
  });
  if (!area) return fail(returnTo, "That work area could not be deleted.");
  refreshJobs(null, jobId);
  return succeed(returnTo);
}

export async function saveJobWorkspaceTask(formData: FormData): Promise<ActionState> {
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
    assigneeUserId: String(formData.get("assigneeUserId") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
    plannedStartAt: String(formData.get("plannedStartAt") ?? ""),
    plannedEndAt: String(formData.get("plannedEndAt") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
  });
  if (!jobId || !taskId) return fail(returnTo, "Missing task.");
  if (!parsed.ok) return invalidFrom(parsed);
  const task = await updateJobTask({
    jobId,
    taskId,
    actor: session.email,
    input: parsed.value,
  });
  if (!task) return fail(returnTo, "That task could not be updated.");
  const job = await getJob(jobId);
  refreshJobs(job?.projectId, jobId);
  return succeed(returnTo);
}

export async function removeJobWorkspaceTask(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  if (!jobId || !taskId) return fail(returnTo, "Missing task.");
  const task = await deleteJobTask({
    jobId,
    taskId,
    actor: session.email,
  });
  if (!task) return fail(returnTo, "That task could not be deleted.");
  const job = await getJob(jobId);
  refreshJobs(job?.projectId, jobId);
  return succeed(returnTo);
}

export async function saveJobDocumentMeta(formData: FormData): Promise<ActionState> {
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
  if (!jobId || !documentId) return fail(returnTo, "Missing document.");
  if (!parsed.ok) return invalidFrom(parsed);
  const document = await updateJobDocument({
    jobId,
    documentId,
    actor: session.email,
    input: parsed.value,
  });
  if (!document) return fail(returnTo, "That document could not be updated.");
  refreshJobs(null, jobId);
  return succeed(returnTo);
}

export async function removeJobDocument(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}`,
  );
  if (!jobId || !documentId) return fail(returnTo, "Missing document.");
  const document = await deleteJobDocument({
    jobId,
    documentId,
    actor: session.email,
  });
  if (!document) return fail(returnTo, "That document could not be deleted.");
  refreshJobs(null, jobId);
  return succeed(returnTo);
}

export async function saveJobFieldEntry(formData: FormData): Promise<ActionState> {
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
  if (!jobId || !noteId) return fail(returnTo, "Missing field entry.");
  if (!parsed.ok) return invalidFrom(parsed);
  const note = await updateJobFieldNote({
    jobId,
    noteId,
    actor: session.email,
    input: parsed.value,
  });
  if (!note) return fail(returnTo, "That field entry could not be updated.");
  refreshJobs(null, jobId);
  return succeed(returnTo);
}

export async function removeJobFieldEntry(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const noteId = String(formData.get("noteId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/field/jobs/${jobId}`,
  );
  if (!jobId || !noteId) return fail(returnTo, "Missing field entry.");
  const note = await deleteJobFieldNote({
    jobId,
    noteId,
    actor: session.email,
  });
  if (!note) return fail(returnTo, "That field entry could not be deleted.");
  refreshJobs(null, jobId);
  return succeed(returnTo);
}

export async function placePlanPin(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}/plan`,
  );
  const parsed = parsePlanAnnotationInput({
    documentId: String(formData.get("documentId") ?? ""),
    pageNumber: String(formData.get("pageNumber") ?? "1"),
    x: String(formData.get("x") ?? ""),
    y: String(formData.get("y") ?? ""),
    status: String(formData.get("status") ?? "planned"),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    workAreaId: String(formData.get("workAreaId") ?? ""),
    taskId: String(formData.get("taskId") ?? ""),
  });
  if (!jobId) return fail("/app/jobs", "Missing job.");
  if (!parsed.ok) return invalidFrom(parsed);
  const annotation = await addJobPlanAnnotation({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!annotation) {
    return fail(returnTo, "That mark could not be placed on the current plan.");
  }
  const job = await getJob(jobId);
  refreshJobs(job?.projectId, jobId);
  return succeed(returnTo, `${annotation.title} was placed on the plan.`);
}

export async function voidPlanPin(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const jobId = String(formData.get("jobId") ?? "");
  const annotationId = String(formData.get("annotationId") ?? "");
  const returnTo = safeReturnTo(
    String(formData.get("returnTo") ?? ""),
    `/app/jobs/${jobId}/plan`,
  );
  if (!jobId || !annotationId) return fail(returnTo, "Missing plan mark.");
  const annotation = await voidJobPlanAnnotation({
    jobId,
    annotationId,
    actor: session.email,
  });
  if (!annotation) return fail(returnTo, "That mark could not be removed.");
  const job = await getJob(jobId);
  refreshJobs(job?.projectId, jobId);
  return succeed(returnTo, `${annotation.title} was voided.`);
}
