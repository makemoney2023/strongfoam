"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import { isOfficeMembershipRole } from "@/lib/ops/identity";
import { parsePlanAnnotationInput, isCurrentPlanDocument } from "@/lib/ops/plan-markup";
import { proposeSpokenPlanMark, type SpokenPlanProposal } from "@/lib/ops/spoken-plan-mark";
import {
  acceptedScheduleDiffNoteId,
  proposeScheduleDiff,
} from "@/lib/ops/schedule-diff";
import {
  addJobPlanAnnotation,
  attachJobVoiceNoteToPlanMark,
  getJob,
  getJobVoiceNote,
  listJobDocuments,
  listJobEvents,
  listJobFieldNotes,
  listJobTasks,
  listProjectJobTasks,
  listProjectTaskDependencies,
  recordScheduleDiffAccepted,
  rescheduleJobTask,
  resolveProjectScheduleCalendar,
} from "@/lib/ops/store";

function canUseOfficeAi(session: OpsSession): boolean {
  return session.role === "estimator" || isOfficeMembershipRole(session.role);
}

async function requireOfficeSession(): Promise<OpsSession> {
  const session = await getOpsSession();
  if (!session || !canUseOfficeAi(session)) redirect("/app/login");
  return session;
}

async function spokenProposal(
  jobId: string,
  documentId: string,
  voiceNoteId: string,
): Promise<{ ok: true; proposal: SpokenPlanProposal } | { ok: false; error: string }> {
  const [note, documents, tasks] = await Promise.all([
    getJobVoiceNote(jobId, voiceNoteId),
    listJobDocuments(jobId),
    listJobTasks(jobId),
  ]);
  const document = documents.find((item) => item.id === documentId);
  if (!document || !isCurrentPlanDocument(document)) {
    return { ok: false, error: "Choose the current plan sheet." };
  }
  if (!note || note.status !== "completed" || !note.transcript?.trim()) {
    return { ok: false, error: "Choose a completed transcript." };
  }
  const proposal = proposeSpokenPlanMark({
    voiceNoteId: note.id,
    filename: note.filename,
    transcript: note.transcript,
    documentId,
    tasks,
  });
  if (!proposal) return { ok: false, error: "That transcript cannot place a mark." };
  return { ok: true, proposal };
}

export async function previewSpokenPlanMark(
  jobId: string,
  documentId: string,
  voiceNoteId: string,
): Promise<{ ok: true; proposal: SpokenPlanProposal } | { ok: false; error: string }> {
  await requireOfficeSession();
  return spokenProposal(jobId, documentId, voiceNoteId);
}

export async function confirmSpokenPlanMark(
  jobId: string,
  documentId: string,
  voiceNoteId: string,
): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  const session = await requireOfficeSession();
  const proposed = await spokenProposal(jobId, documentId, voiceNoteId);
  if (!proposed.ok) return proposed;
  const parsed = parsePlanAnnotationInput(proposed.proposal);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const annotation = await addJobPlanAnnotation({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!annotation) {
    return { ok: false, error: "That mark could not be placed on the current plan." };
  }
  const attached = await attachJobVoiceNoteToPlanMark({
    jobId,
    voiceNoteId,
    annotationId: annotation.id,
    documentId,
    taskId: proposed.proposal.taskId,
    actor: session.email,
  });
  revalidatePath(`/app/jobs/${jobId}/plan`);
  revalidatePath(`/app/jobs/${jobId}`);
  if (!attached) {
    return {
      ok: false,
      error: "The pin was placed, but the voice note could not be attached.",
    };
  }
  return { ok: true, effect: proposed.proposal.effect };
}

export async function acceptScheduleDiff(
  jobId: string,
  noteId: string,
): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  const session = await requireOfficeSession();
  const job = await getJob(jobId);
  if (!job?.projectId) return { ok: false, error: "That job has no project schedule." };
  const [notes, events, taskResult, dependencyResult, calendar] = await Promise.all([
    listJobFieldNotes(jobId),
    listJobEvents(jobId),
    listProjectJobTasks(job.projectId),
    listProjectTaskDependencies(job.projectId),
    resolveProjectScheduleCalendar(job.projectId),
  ]);
  if (events.some((event) => acceptedScheduleDiffNoteId(event) === noteId)) {
    return { ok: false, error: "That schedule suggestion was already accepted." };
  }
  const note = notes.find((item) => item.id === noteId);
  if (!note) return { ok: false, error: "That field note could not be found." };
  const proposal = proposeScheduleDiff({
    note,
    tasks: taskResult.tasks,
    edges: dependencyResult.edges,
    calendar,
  });
  if (!proposal) {
    return { ok: false, error: "That note does not have an allowed schedule move." };
  }
  for (const move of proposal.moves) {
    const result = await rescheduleJobTask({
      projectId: job.projectId,
      jobId: move.jobId,
      taskId: move.taskId,
      plannedStartAt: new Date(move.plannedStartAt),
      plannedEndAt: new Date(move.plannedEndAt),
      dueAt: move.dueAt ? new Date(move.dueAt) : null,
      expectedUpdatedAt: new Date(move.expectedUpdatedAt),
      actor: session.email,
    });
    if (!result.ok) return result;
  }
  await recordScheduleDiffAccepted({
    jobId,
    actor: session.email,
    noteId,
  });
  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath(`/app/projects/${job.projectId}`);
  return { ok: true, effect: proposal.effect };
}

export async function rejectScheduleDiff(): Promise<{ ok: true }> {
  await requireOfficeSession();
  return { ok: true };
}
