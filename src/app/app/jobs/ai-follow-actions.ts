"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import { isOfficeMembershipRole } from "@/lib/ops/identity";
import { parsePlanAnnotationInput, isCurrentPlanDocument } from "@/lib/ops/plan-markup";
import {
  proposeSpokenPlanMark,
  spokenPlanMarkMatches,
  type SpokenPlanProposal,
} from "@/lib/ops/spoken-plan-mark";
import {
  acceptedScheduleDiffNoteId,
  applyApprovedScheduleMoves,
  proposeScheduleDiff,
  scheduleDiffMatchesApproval,
  type ScheduleDiffApproval,
} from "@/lib/ops/schedule-diff";
import {
  addJobPlanAnnotation,
  attachJobVoiceNoteToPlanMark,
  extractJobVoiceNote,
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
  updateJobStatus,
} from "@/lib/ops/store";
import {
  listTranscriptRecords,
  savedTranscriptSelections,
  transcriptRecordMatches,
  type TranscriptRecordProposal,
} from "@/lib/ops/transcript-record";

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
  approval: Pick<
    SpokenPlanProposal,
    | "documentId"
    | "pageNumber"
    | "x"
    | "y"
    | "kind"
    | "status"
    | "title"
    | "body"
    | "taskId"
    | "effect"
  >,
): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  const session = await requireOfficeSession();
  const proposed = await spokenProposal(jobId, documentId, voiceNoteId);
  if (!proposed.ok) return proposed;
  if (
    approval.documentId !== documentId ||
    !spokenPlanMarkMatches(proposed.proposal, approval)
  ) {
    return { ok: false, error: "That transcript changed. Refresh and try again." };
  }
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
  approval: ScheduleDiffApproval,
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
  if (events.some((event) => acceptedScheduleDiffNoteId(event) === approval.noteId)) {
    return { ok: false, error: "That schedule suggestion was already accepted." };
  }
  const note = notes.find((item) => item.id === approval.noteId);
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
  if (!scheduleDiffMatchesApproval(proposal, approval)) {
    return { ok: false, error: "That schedule changed. Refresh and try again." };
  }
  const applied = await applyApprovedScheduleMoves(proposal.moves, async (move, dates) => {
    const result = await rescheduleJobTask({
      projectId: job.projectId!,
      jobId: move.jobId,
      taskId: move.taskId,
      plannedStartAt: new Date(dates.plannedStartAt),
      plannedEndAt: new Date(dates.plannedEndAt),
      dueAt: dates.dueAt ? new Date(dates.dueAt) : null,
      expectedUpdatedAt: new Date(dates.expectedUpdatedAt),
      actor: session.email,
    });
    if (!result.ok) return result;
    return { ok: true, updatedAt: result.task.updatedAt.toISOString() };
  });
  if (!applied.ok) return applied;
  await recordScheduleDiffAccepted({
    jobId,
    actor: session.email,
    noteId: approval.noteId,
  });
  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath(`/app/projects/${job.projectId}`);
  return { ok: true, effect: proposal.effect };
}

export async function rejectScheduleDiff(): Promise<{ ok: true }> {
  await requireOfficeSession();
  return { ok: true };
}

export async function confirmTranscriptRecord(
  jobId: string,
  approval: TranscriptRecordProposal,
): Promise<{ ok: true; effect: string } | { ok: false; error: string }> {
  const session = await requireOfficeSession();
  const [note, events, tasks] = await Promise.all([
    getJobVoiceNote(jobId, approval.voiceNoteId),
    listJobEvents(jobId),
    listJobTasks(jobId),
  ]);
  if (!note || note.status !== "completed" || !note.transcript?.trim()) {
    return { ok: false, error: "Choose a completed transcript." };
  }
  const saved = savedTranscriptSelections(events, note.id);
  if (saved.legacy || saved.texts.includes(approval.selectedText)) {
    return { ok: false, error: "That transcript was already turned into a record." };
  }
  const proposal = listTranscriptRecords({
    voiceNoteId: note.id,
    filename: note.filename,
    transcript: note.transcript,
    savedTexts: saved.texts,
    legacyExtracted: false,
    tasks,
  }).find((candidate) => transcriptRecordMatches(candidate, approval));
  if (!proposal) {
    return { ok: false, error: "That transcript changed. Refresh and try again." };
  }
  const created = await extractJobVoiceNote({
    jobId,
    voiceNoteId: note.id,
    actor: session.email,
    kind: proposal.kind,
    selectedText: proposal.selectedText,
  });
  if (!created.ok) return created;
  if (proposal.kind === "blocker") {
    const blocked = await updateJobStatus({
      jobId,
      actor: session.email,
      status: "blocked",
      blockerNote: proposal.selectedText,
    });
    refreshTranscriptRecord(jobId);
    if (!blocked) {
      return {
        ok: false,
        error: "The blocker was saved, but the job could not be marked blocked.",
      };
    }
    return { ok: true, effect: proposal.effect };
  }
  refreshTranscriptRecord(jobId);
  return { ok: true, effect: proposal.effect };
}

function refreshTranscriptRecord(jobId: string) {
  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath("/app");
  revalidatePath("/field");
  revalidatePath(`/field/jobs/${jobId}`);
  revalidatePath(`/app/field/jobs/${jobId}`);
}
