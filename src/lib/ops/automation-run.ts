import { buildJobEvidencePack } from "@/lib/ops/ai-evidence";
import { listOperationsExceptions } from "@/lib/ops/ai-exceptions";
import { requestJobAi } from "@/lib/ops/ai-gateway";
import {
  briefLines,
  dailyAutopilotMessages,
  dailyReportProposal,
  morningBriefProposal,
  staleSweepProposal,
  workingDayFor,
  type AutomationProposal,
  type ScheduledMessage,
} from "@/lib/ops/automation-schedule";
import {
  listActiveAutomationJobs,
  recordAutomationProposal,
} from "@/lib/ops/automation-store";
import { publishQueuedJob } from "@/lib/cloudflare/platform";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

async function enqueue(message: ScheduledMessage): Promise<boolean> {
  const { getPlatform } = await import("@/lib/cloudflare/platform");
  const platform = await getPlatform();
  if (!platform?.JOBS) return false;
  await publishQueuedJob(message);
  return true;
}

async function storeProposal(proposal: AutomationProposal): Promise<void> {
  await recordAutomationProposal(proposal);
}

export async function runDailyAutopilot(
  data: Record<string, unknown>,
): Promise<AutomationProposal[]> {
  if (data.fanout === true) {
    const messages = dailyAutopilotMessages(await listActiveAutomationJobs());
    const proposals: AutomationProposal[] = [];
    for (const message of messages) {
      const queued = await enqueue(message);
      if (!queued) proposals.push(...(await runDailyAutopilot(message.data)));
    }
    return proposals;
  }
  const organizationId = String(data.organizationId ?? "");
  const jobId = String(data.jobId ?? "");
  const jobName = String(data.jobName ?? "Job");
  if (!organizationId || !jobId) return [];
  const workingDay = workingDayFor();
  let paragraph = `${jobName} daily report is waiting for review. Open the job to confirm it. This schedule does not save the note.`;
  try {
    const pack = await loadPack(jobId, organizationId);
    if (pack) {
      const result = await requestJobAi({ pack, organizationId, purpose: "daily_report" });
      if (result.status === "ready" || result.status === "demo") {
        paragraph = result.paragraph;
      }
    }
  } catch (error) {
    console.error("Daily autopilot draft failed.", error);
  }
  const proposal = dailyReportProposal({
    organizationId,
    jobId,
    jobName,
    workingDay,
    paragraph,
  });
  await storeProposal(proposal);
  return [proposal];
}

export async function runMorningBrief(
  data: Record<string, unknown>,
): Promise<AutomationProposal[]> {
  if (data.fanout !== true && data.jobId && data.userId) {
    const proposal = morningBriefProposal({
      organizationId: String(data.organizationId),
      jobId: String(data.jobId),
      userId: String(data.userId),
      workingDay: String(data.workingDay ?? workingDayFor()),
      lines: briefLines(normalizeBrief(data.brief)),
    });
    await storeProposal(proposal);
    return [proposal];
  }
  const proposals: AutomationProposal[] = [];
  const jobs = await listActiveAutomationJobs();
  for (const job of jobs) {
    const drafts = await briefsForJob(job.organizationId, job.id);
    for (const draft of drafts) {
      const message: ScheduledMessage = {
        kind: "ops.morning-brief",
        data: { fanout: false, ...draft },
      };
      const queued = await enqueue(message);
      if (!queued) proposals.push(...(await runMorningBrief(message.data)));
    }
  }
  await deliverMorningDigest();
  return proposals;
}

export async function runStaleSweep(
  data: Record<string, unknown>,
): Promise<AutomationProposal[]> {
  const organizationId = String(data.organizationId ?? STRONG_FOAM_ORGANIZATION_ID);
  let exceptions: Parameters<typeof staleSweepProposal>[0]["exceptions"] = [];
  try {
    const { listHomeExceptionSource } = await import("@/lib/ops/store");
    const source = await listHomeExceptionSource();
    exceptions = listOperationsExceptions({
      ...source,
      now: new Date(),
      viewerOrganizationId: organizationId,
    }).filter((row) =>
      row.kind === "missing_daily_log" ||
      row.kind === "blocked_job" ||
      row.kind === "overdue_task" ||
      row.kind === "unextracted_voice_note",
    );
  } catch (error) {
    console.error("Stale sweep could not read records.", error);
  }
  const proposal = staleSweepProposal({
    organizationId,
    workingDay: workingDayFor(),
    exceptions,
  });
  await storeProposal(proposal);
  return [proposal];
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function normalizeBrief(value: unknown): Parameters<typeof briefLines>[0] {
  const brief = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const tasks = Array.isArray(brief.tasks) ? brief.tasks : [];
  const notes = Array.isArray(brief.notes) ? brief.notes : [];
  return {
    jobId: String(brief.jobId ?? ""),
    userId: String(brief.userId ?? ""),
    now: asDate(brief.now) ?? new Date(),
    siteLabel: typeof brief.siteLabel === "string" ? brief.siteLabel : null,
    tasks: tasks.map((task) => {
      const row = task as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        title: String(row.title ?? ""),
        status: String(row.status ?? ""),
        assigneeUserId: typeof row.assigneeUserId === "string" ? row.assigneeUserId : null,
        plannedStartAt: asDate(row.plannedStartAt),
        plannedEndAt: asDate(row.plannedEndAt),
        dueAt: asDate(row.dueAt),
      };
    }),
    notes: notes.map((note) => {
      const row = note as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        kind: String(row.kind ?? ""),
        body: String(row.body ?? ""),
        taskId: typeof row.taskId === "string" ? row.taskId : null,
      };
    }),
    plan: null,
  };
}

async function loadPack(jobId: string, organizationId: string) {
  const store = await import("@/lib/ops/store");
  const job = await store.getJob(jobId);
  if (!job || job.organizationId !== organizationId) return null;
  const [tasks, fieldNotes, voiceNotes, events, marks, documents, calendar] = await Promise.all([
    store.listJobTasks(jobId),
    store.listJobFieldNotes(jobId),
    store.listJobVoiceNotes(jobId),
    store.listJobEvents(jobId),
    store.listJobPlanAnnotations(jobId),
    store.listJobDocuments(jobId),
    job.projectId ? store.resolveProjectScheduleCalendar(job.projectId) : Promise.resolve(null),
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
    now: new Date(),
    timeZone: calendar?.timeZone,
  });
}

async function briefsForJob(organizationId: string, jobId: string) {
  const store = await import("@/lib/ops/store");
  const job = await store.getJob(jobId);
  if (!job || job.organizationId !== organizationId) return [];
  const [tasks, notes] = await Promise.all([
    store.listJobTasks(jobId),
    store.listJobFieldNotes(jobId),
  ]);
  const assignees = [
    ...new Set(tasks.map((task) => task.assigneeUserId).filter((id): id is string => Boolean(id))),
  ];
  const workingDay = workingDayFor();
  return assignees.map((userId) => ({
    organizationId,
    jobId,
    userId,
    workingDay,
    brief: {
      jobId,
      userId,
      now: new Date(),
      siteLabel: job.name,
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        assigneeUserId: task.assigneeUserId,
        plannedStartAt: task.plannedStartAt,
        plannedEndAt: task.plannedEndAt,
        dueAt: task.dueAt,
      })),
      notes: notes.map((note) => ({
        id: note.id,
        kind: note.kind,
        body: note.body,
        taskId: note.taskId,
      })),
      plan: null,
    },
  }));
}

async function deliverMorningDigest(): Promise<void> {
  try {
    const { STRONG_FOAM_ORGANIZATION_ID } = await import("@/lib/ops/identity");
    const organizationId = STRONG_FOAM_ORGANIZATION_ID;
    const now = new Date();
    const { listEstimateRequests, listHomeExceptionSource, listJobs, listUsers } = await import(
      "@/lib/ops/store"
    );
    const { listOperationsExceptions } = await import("@/lib/ops/ai-exceptions");
    const { listAutomationProposals } = await import("@/lib/ops/automation-store");
    const { listDigestOptInRows, listQuotesAwaitingDecision, saveReviewDraft } = await import(
      "@/lib/ops/proposal-followup-store"
    );
    const {
      buildMorningDigest,
      leadDigestRow,
      morningDigestDraft,
      optedInStaffEmails,
      staffDigestMessage,
    } = await import("@/lib/ops/morning-digest");
    const requests = await listEstimateRequests();
    const jobs = await listJobs();
    const source = await listHomeExceptionSource();
    const exceptions = listOperationsExceptions({
      ...source,
      now,
      viewerOrganizationId: organizationId,
    });
    const missing = new Set(
      exceptions.filter((row) => row.kind === "missing_daily_log").map((row) => row.href),
    );
    const digest = buildMorningDigest({
      now,
      leads: requests
        .filter((request) => request.organizationId === organizationId)
        .map(leadDigestRow),
      quotes: await listQuotesAwaitingDecision(organizationId),
      jobs: jobs
        .filter((job) => job.organizationId === organizationId)
        .map((job) => ({
          id: job.id,
          name: job.name,
          status: job.status,
          missingDailyLog: missing.has(`/app/jobs/${job.id}#field-log`),
          href: `/app/jobs/${job.id}`,
        })),
      drafts: (await listAutomationProposals(organizationId)).map((proposal) => ({
        id: proposal.recordId,
        title: proposal.title,
        kind: proposal.kind,
      })),
    });
    await saveReviewDraft(
      morningDigestDraft({ organizationId, workingDay: workingDayFor(now), digest }),
    );
    const { getPlatform } = await import("@/lib/cloudflare/platform");
    const platform = await getPlatform();
    if (!platform?.EMAIL) return;
    const staff = (await listUsers())
      .filter(
        (user) => user.active && user.membershipActive && user.organizationId === organizationId,
      )
      .map((user) => user.email);
    const allowed = optedInStaffEmails(await listDigestOptInRows(organizationId), staff);
    const { sendThroughCloudflareEmail } = await import("@/lib/cloudflare/email");
    const from = platform.EMAIL_FROM ?? "Strong Foam <estimates@strongfoam.com>";
    for (const email of allowed) {
      const message = staffDigestMessage(digest, email, allowed);
      if (!message) continue;
      await sendThroughCloudflareEmail(platform.EMAIL, { ...message, from });
    }
  } catch (error) {
    console.error("Morning digest was not stored.", error);
  }
}
