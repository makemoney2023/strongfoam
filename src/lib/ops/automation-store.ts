import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { backgroundJobs, jobs } from "@/db/schema";
import type { AutomationJob, AutomationProposal } from "@/lib/ops/automation-schedule";
import { listDemoReviewDrafts } from "@/lib/ops/demo-inbox";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { FIELD_ACTIVE_JOB_STATUSES } from "@/lib/ops/field-workspace";

export function automationIdempotencyKey(proposal: AutomationProposal): string {
  return `ops.proposal:${proposal.kind}:${proposal.recordId}:${proposal.workingDay}`;
}

export async function recordAutomationProposal(proposal: AutomationProposal): Promise<void> {
  try {
    await getDb()
      .insert(backgroundJobs)
      .values({
        organizationId: proposal.organizationId,
        kind: "ops.proposal",
        aggregateType: "automation_proposal",
        aggregateId: proposal.recordId,
        idempotencyKey: automationIdempotencyKey(proposal),
        status: "completed",
        attempts: 1,
        maxAttempts: 1,
        checkpoint: { proposalStatus: "proposed" },
        payload: proposal,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [backgroundJobs.organizationId, backgroundJobs.idempotencyKey],
        set: {
          payload: proposal,
          checkpoint: { proposalStatus: "proposed" },
          status: "completed",
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("Automation proposal was not stored.", error);
  }
}

function isAutomationKind(kind: string): kind is AutomationProposal["kind"] {
  return kind === "daily_report" || kind === "morning_brief" || kind === "stale_sweep";
}

export async function listAutomationProposals(
  organizationId: string,
): Promise<AutomationProposal[]> {
  if (isDemoOpsStore()) {
    return listDemoReviewDrafts(organizationId)
      .filter((draft) => draft.status === "proposed" && isAutomationKind(draft.kind))
      .map((draft) => ({
        kind: draft.kind as AutomationProposal["kind"],
        status: "proposed",
        requiresConfirmation: true,
        sendsToCustomer: false,
        setsPrice: false,
        approves: false,
        organizationId: draft.organizationId,
        recordId: draft.recordId,
        title: draft.title,
        body: draft.body,
        href: draft.href,
        workingDay: draft.workingDay,
      }));
  }
  try {
    const rows = await getDb()
      .select({ payload: backgroundJobs.payload })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.organizationId, organizationId),
          eq(backgroundJobs.kind, "ops.proposal"),
          eq(backgroundJobs.status, "completed"),
        ),
      )
      .orderBy(desc(backgroundJobs.updatedAt))
      .limit(20);
    return rows
      .map((row) => row.payload as AutomationProposal)
      .filter((proposal) => proposal?.status === "proposed" && proposal.requiresConfirmation);
  } catch (error) {
    console.error("Automation proposals could not be listed.", error);
    return [];
  }
}

export async function listActiveAutomationJobs(): Promise<AutomationJob[]> {
  try {
    const rows = await getDb()
      .select({
        organizationId: jobs.organizationId,
        id: jobs.id,
        name: jobs.name,
        status: jobs.status,
      })
      .from(jobs)
      .where(inArray(jobs.status, [...FIELD_ACTIVE_JOB_STATUSES]));
    return rows;
  } catch (error) {
    console.error("Active jobs could not be listed for automation.", error);
    return [];
  }
}
