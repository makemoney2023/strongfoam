import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { FIELD_ACTIVE_JOB_STATUSES } from "@/lib/ops/field-workspace";
import { buildMorningBrief, type MorningBriefLine } from "@/lib/ops/morning-brief";
import type { OperationsException } from "@/lib/ops/ai-exceptions";

export const HEARTBEAT_CRON = "* * * * *";
export const RETAIN_CRON = "15 9 * * *";
export const MORNING_BRIEF_CRON = "0 10 * * *";
export const STALE_SWEEP_CRON = "0 11 * * *";
export const DAILY_AUTOPILOT_CRON = "30 21 * * *";

export const SCHEDULED_CRONS = [
  HEARTBEAT_CRON,
  RETAIN_CRON,
  MORNING_BRIEF_CRON,
  STALE_SWEEP_CRON,
  DAILY_AUTOPILOT_CRON,
] as const;

export type ScheduledMessage = {
  kind: string;
  data: Record<string, unknown>;
};

export type AutomationProposal = {
  kind: "daily_report" | "morning_brief" | "stale_sweep";
  status: "proposed";
  requiresConfirmation: true;
  sendsToCustomer: false;
  setsPrice: false;
  approves: false;
  organizationId: string;
  recordId: string;
  title: string;
  body: string;
  href: string;
  workingDay: string;
};

export type AutomationJob = {
  organizationId: string;
  id: string;
  name: string;
  status: string;
};

const ACTIVE = new Set<string>(FIELD_ACTIVE_JOB_STATUSES);

export function schedulePlan(cron: string): ScheduledMessage[] {
  switch (cron) {
    case HEARTBEAT_CRON:
      return [{ kind: "worker-heartbeat", data: {} }];
    case RETAIN_CRON:
      return [{ kind: "data-import.retain", data: {} }];
    case MORNING_BRIEF_CRON:
      return [{ kind: "ops.morning-brief", data: { fanout: true } }];
    case STALE_SWEEP_CRON:
      return [{ kind: "ops.stale-sweep", data: { fanout: true } }];
    case DAILY_AUTOPILOT_CRON:
      return [{ kind: "ops.daily-autopilot", data: { fanout: true } }];
    default:
      return [];
  }
}

function proposalBase(
  kind: AutomationProposal["kind"],
  input: {
    organizationId: string;
    recordId: string;
    title: string;
    body: string;
    href: string;
    workingDay: string;
  },
): AutomationProposal {
  return {
    kind,
    status: "proposed",
    requiresConfirmation: true,
    sendsToCustomer: false,
    setsPrice: false,
    approves: false,
    ...input,
  };
}

export function dailyAutopilotMessages(jobs: AutomationJob[]): ScheduledMessage[] {
  return jobs
    .filter((job) => ACTIVE.has(job.status))
    .map((job) => ({
      kind: "ops.daily-autopilot",
      data: {
        fanout: false,
        organizationId: job.organizationId,
        jobId: job.id,
        jobName: job.name,
        status: job.status,
      },
    }));
}

export function dailyReportProposal(input: {
  organizationId: string;
  jobId: string;
  jobName: string;
  workingDay: string;
  paragraph: string;
}): AutomationProposal {
  return proposalBase("daily_report", {
    organizationId: input.organizationId,
    recordId: input.jobId,
    title: `Daily report draft · ${input.jobName}`,
    body: input.paragraph,
    href: `/app/jobs/${input.jobId}`,
    workingDay: input.workingDay,
  });
}

export function morningBriefProposal(input: {
  organizationId: string;
  jobId: string;
  userId: string;
  workingDay: string;
  lines: MorningBriefLine[];
}): AutomationProposal {
  return proposalBase("morning_brief", {
    organizationId: input.organizationId,
    recordId: `${input.jobId}:${input.userId}`,
    title: "Morning brief",
    body: input.lines.map((line) => `${line.label}: ${line.detail}`).join("\n"),
    href: `/field/jobs/${input.jobId}`,
    workingDay: input.workingDay,
  });
}

export function staleSweepProposal(input: {
  organizationId: string;
  workingDay: string;
  exceptions: OperationsException[];
}): AutomationProposal {
  const body = input.exceptions.length
    ? input.exceptions.map((row) => row.label).join("\n")
    : "No stale records.";
  return proposalBase("stale_sweep", {
    organizationId: input.organizationId,
    recordId: input.organizationId,
    title: "Stale record sweep",
    body,
    href: "/app",
    workingDay: input.workingDay,
  });
}

export function workingDayFor(now = new Date(), timeZone = "America/Toronto"): string {
  return workingDayLabel(now, timeZone);
}

export function briefLines(input: Parameters<typeof buildMorningBrief>[0]): MorningBriefLine[] {
  return buildMorningBrief(input);
}
