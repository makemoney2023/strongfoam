export const JOB_STATUSES = [
  "draft",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "blocked",
  "ready_for_inspection",
  "complete",
  "closed",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  ready_to_schedule: "Ready to schedule",
  scheduled: "Scheduled",
  in_progress: "In progress",
  blocked: "Blocked",
  ready_for_inspection: "Ready for inspection",
  complete: "Complete",
  closed: "Closed",
};

export type JobConversionInput = {
  projectName: string;
  jobName: string;
  scope: string;
  projectManager: string | null;
  foreman: string | null;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
};

export function isJobStatus(value: string): value is JobStatus {
  return JOB_STATUSES.includes(value as JobStatus);
}

export function formatJobNumber(id: string): string {
  return `JOB-${id.slice(0, 8).toUpperCase()}`;
}

export function canConvertWonWork(args: {
  workflowStatus?: string | null;
  opportunityStage?: string | null;
}): boolean {
  return args.workflowStatus === "won" || args.opportunityStage === "won";
}

export function parseJobConversion(input: {
  projectName?: string;
  jobName?: string;
  scope?: string;
  projectManager?: string | null;
  foreman?: string | null;
  plannedStartAt?: string;
  plannedEndAt?: string;
}):
  | { ok: true; value: JobConversionInput }
  | { ok: false; error: string; field?: string } {
  const projectName = input.projectName?.trim() ?? "";
  const jobName = input.jobName?.trim() ?? "";
  if (!projectName) return { ok: false, error: "A project name is required.", field: "projectName" };
  if (!jobName) return { ok: false, error: "A job name is required.", field: "jobName" };

  const plannedStartAt = input.plannedStartAt
    ? new Date(input.plannedStartAt)
    : null;
  const plannedEndAt = input.plannedEndAt ? new Date(input.plannedEndAt) : null;
  if (plannedStartAt && Number.isNaN(plannedStartAt.getTime())) {
    return { ok: false, error: "Planned start date is invalid.", field: "plannedStartAt" };
  }
  if (plannedEndAt && Number.isNaN(plannedEndAt.getTime())) {
    return { ok: false, error: "Planned end date is invalid.", field: "plannedEndAt" };
  }
  if (
    plannedStartAt &&
    plannedEndAt &&
    plannedEndAt.getTime() < plannedStartAt.getTime()
  ) {
    return { ok: false, error: "Planned end must be on or after the start date.", field: "plannedEndAt" };
  }

  return {
    ok: true,
    value: {
      projectName,
      jobName,
      scope: input.scope?.trim() ?? "",
      projectManager: input.projectManager?.trim() || null,
      foreman: input.foreman?.trim() || null,
      plannedStartAt,
      plannedEndAt,
    },
  };
}

export type JobDetailsInput = {
  name: string;
  scope: string | null;
  projectManager: string | null;
  foreman: string | null;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
};

export function parseJobDetails(input: {
  name?: string;
  scope?: string;
  projectManager?: string | null;
  foreman?: string | null;
  plannedStartAt?: string;
  plannedEndAt?: string;
}): { ok: true; value: JobDetailsInput } | { ok: false; error: string; field?: string } {
  const parsed = parseJobConversion({
    projectName: "Project",
    jobName: input.name,
    scope: input.scope,
    projectManager: input.projectManager,
    foreman: input.foreman,
    plannedStartAt: input.plannedStartAt,
    plannedEndAt: input.plannedEndAt,
  });
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: {
      name: parsed.value.jobName,
      scope: parsed.value.scope || null,
      projectManager: parsed.value.projectManager,
      foreman: parsed.value.foreman,
      plannedStartAt: parsed.value.plannedStartAt,
      plannedEndAt: parsed.value.plannedEndAt,
    },
  };
}

export function parseJobStatusUpdate(input: {
  status?: string;
  blockerNote?: string;
}):
  | { ok: true; value: { status: JobStatus; blockerNote: string | null } }
  | { ok: false; error: string; field?: string } {
  const status = input.status ?? "";
  if (!isJobStatus(status)) {
    return { ok: false, error: "Choose a valid job status.", field: "status" };
  }
  const blockerNote = input.blockerNote?.trim() || null;
  if (status === "blocked" && !blockerNote) {
    return { ok: false, error: "A blocker note is required when a job is blocked.", field: "blockerNote" };
  }
  return {
    ok: true,
    value: {
      status,
      blockerNote: status === "blocked" ? blockerNote : null,
    },
  };
}

export function draftJobFromOpportunity(opportunity: {
  name: string;
  owner: string | null;
  projectType: string | null;
}): { projectName: string; jobName: string; scope: string } {
  return {
    projectName: opportunity.name,
    jobName: `${opportunity.name} · field work`,
    scope: opportunity.projectType ?? "",
  };
}
