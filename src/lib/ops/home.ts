import { isFieldActiveJobStatus } from "@/lib/ops/field-workspace";

const CLOSED_REQUEST_STATUSES = new Set(["won", "lost", "archived"]);

type RequestLike = {
  id: string;
  workflowStatus: string;
  nextActionDueAt: Date | null;
  createdAt: Date;
};

type OpportunityLike = { stage: string };
type ProjectLike = { status: string };
type JobLike = { status: string };

export type HomeSummary<R extends RequestLike> = {
  now: number;
  newRequests: number;
  overdueFollowUps: number;
  openOpportunities: number;
  activeProjects: number;
  fieldJobs: number;
  blockedJobs: number;
  nextUp: R[];
};

export function isOverdue(request: { nextActionDueAt: Date | null }, now: number): boolean {
  return Boolean(request.nextActionDueAt && request.nextActionDueAt.getTime() < now);
}

export function isOpenRequest(request: { workflowStatus: string }): boolean {
  return !CLOSED_REQUEST_STATUSES.has(request.workflowStatus);
}

/**
 * Counts and the short "next up" list for the Home page. `now` defaults to the
 * current time; pass it explicitly in tests.
 */
export function buildHomeSummary<R extends RequestLike>(
  input: {
    requests: R[];
    opportunities: OpportunityLike[];
    projects: ProjectLike[];
    jobs: JobLike[];
  },
  now: number = Date.now(),
  nextUpLimit = 5,
): HomeSummary<R> {
  const openRequests = input.requests.filter(isOpenRequest);
  const nextUp = [...openRequests]
    .sort((a, b) => {
      const aDue = a.nextActionDueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bDue = b.nextActionDueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, nextUpLimit);

  return {
    now,
    newRequests: openRequests.filter((request) => request.workflowStatus === "new").length,
    overdueFollowUps: openRequests.filter((request) => isOverdue(request, now)).length,
    openOpportunities: input.opportunities.filter(
      (opportunity) => opportunity.stage !== "won" && opportunity.stage !== "lost",
    ).length,
    activeProjects: input.projects.filter((project) => project.status === "active").length,
    fieldJobs: input.jobs.filter((job) => isFieldActiveJobStatus(job.status)).length,
    blockedJobs: input.jobs.filter((job) => job.status === "blocked").length,
    nextUp,
  };
}
