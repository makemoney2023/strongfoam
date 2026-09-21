"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assembleDailyReportBody,
  buildJobEvidencePack,
  type JobEvidencePack,
} from "@/lib/ops/ai-evidence";
import {
  requestJobAi,
  type AiCitedText,
  type AiGatewayResult,
} from "@/lib/ops/ai-gateway";
import { getOpsSession, type OpsSession } from "@/lib/ops/auth";
import { parseFieldNoteInput } from "@/lib/ops/field-workspace";
import { isOfficeMembershipRole } from "@/lib/ops/identity";
import { getOpsNow } from "@/lib/ops/ops-now";
import {
  addJobFieldNote,
  getJob,
  listJobDocuments,
  listJobEvents,
  listJobFieldNotes,
  listJobPlanAnnotations,
  listJobTasks,
  listJobVoiceNotes,
  recordAiJobEvent,
  resolveProjectScheduleCalendar,
} from "@/lib/ops/store";

function citationIds(result: Extract<AiGatewayResult, { status: "demo" | "ready" }>): string[] {
  const ids = new Set<string>();
  const collect = (items: AiCitedText[]) => {
    for (const item of items) {
      for (const citation of item.citations) ids.add(citation.id);
    }
  };
  collect(result.bullets);
  collect(result.sections.completed);
  collect(result.sections.held);
  collect(result.sections.material);
  collect(result.sections.next);
  return [...ids];
}

function sectionText(items: AiCitedText[]): string {
  return items.map((item) => item.text).join(" ");
}

async function loadJobEvidence(jobId: string): Promise<JobEvidencePack | null> {
  const job = await getJob(jobId);
  if (!job) return null;
  const [tasks, fieldNotes, voiceNotes, events, marks, documents, calendar] =
    await Promise.all([
      listJobTasks(jobId),
      listJobFieldNotes(jobId),
      listJobVoiceNotes(jobId),
      listJobEvents(jobId),
      listJobPlanAnnotations(jobId),
      listJobDocuments(jobId),
      resolveProjectScheduleCalendar(job.projectId),
    ]);
  const currentPlans = new Set(
    documents
      .filter((document) => document.kind === "plan" && !document.supersededAt)
      .map((document) => document.id),
  );
  return buildJobEvidencePack({
    job: { id: job.id, name: job.name, status: job.status },
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      dueAt: task.dueAt,
      plannedEndAt: task.plannedEndAt,
      createdAt: task.createdAt,
    })),
    fieldNotes: fieldNotes.map((note) => ({
      id: note.id,
      kind: note.kind,
      body: note.body,
      quantity: note.quantity,
      unit: note.unit,
      taskId: note.taskId,
      workAreaId: note.workAreaId,
      createdAt: note.createdAt,
    })),
    voiceNotes: voiceNotes.map((note) => ({
      id: note.id,
      status: note.status,
      transcript: note.transcript,
      source: note.source,
      taskId: note.taskId,
      filename: note.filename,
      createdAt: note.createdAt,
    })),
    planMarks: marks
      .filter((mark) => currentPlans.has(mark.documentId))
      .map((mark) => ({
        id: mark.id,
        title: mark.title,
        status: mark.status,
        pageNumber: mark.pageNumber,
        documentId: mark.documentId,
        taskId: mark.taskId,
        voidedAt: mark.voidedAt,
        createdAt: mark.createdAt,
      })),
    events: events.map((event) => ({
      id: event.id,
      kind: event.kind,
      summary: event.summary,
      createdAt: event.createdAt,
    })),
    now: getOpsNow(),
    timeZone: calendar.timeZone,
  });
}

function canUseOfficeAi(session: OpsSession): boolean {
  return session.role === "estimator" || isOfficeMembershipRole(session.role);
}

async function requireOfficeSession(): Promise<OpsSession> {
  const session = await getOpsSession();
  if (!session || !canUseOfficeAi(session)) redirect("/app/login");
  return session;
}

async function requestCapability(
  jobId: string,
  purpose: "summary" | "daily_report",
  capabilityId: "AI-008" | "AI-009",
): Promise<AiGatewayResult> {
  const session = await requireOfficeSession();
  const pack = await loadJobEvidence(jobId);
  if (!pack) return { status: "failed", message: "That job could not be found." };
  const result = await requestJobAi({ pack, purpose });
  if (result.status === "demo" || result.status === "ready") {
    await recordAiJobEvent({
      jobId,
      actor: session.email,
      capabilityId,
      provider: result.provider,
      model: result.model,
      citationIds: citationIds(result),
    });
  }
  return result;
}

export async function summarizeJob(jobId: string): Promise<AiGatewayResult> {
  return requestCapability(jobId, "summary", "AI-008");
}

export async function draftJobDailyReport(jobId: string): Promise<
  AiGatewayResult & { body?: string }
> {
  const result = await requestCapability(jobId, "daily_report", "AI-009");
  if (result.status !== "demo" && result.status !== "ready") return result;
  return {
    ...result,
    body: assembleDailyReportBody({
      completed: sectionText(result.sections.completed),
      held: sectionText(result.sections.held),
      material: sectionText(result.sections.material),
      next: sectionText(result.sections.next),
    }),
  };
}

export async function saveJobDailyReport(
  jobId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireOfficeSession();
  const parsed = parseFieldNoteInput({ kind: "daily_report", body });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const note = await addJobFieldNote({
    jobId,
    actor: session.email,
    input: parsed.value,
  });
  if (!note) return { ok: false, error: "That daily report could not be saved." };
  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath("/app");
  return { ok: true };
}

export async function discardJobAiDraft(): Promise<{ ok: true }> {
  await requireOfficeSession();
  return { ok: true };
}
