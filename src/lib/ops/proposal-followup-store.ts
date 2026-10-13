import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { backgroundJobs, estimates, proposalEvents, proposals } from "@/db/schema";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import {
  cancelFollowupInstance,
  createFollowupInstance,
  followupStillOpen,
  type FollowupParams,
  type OpenProposalRef,
} from "@/lib/ops/proposal-followups";
import {
  proposalLifecycleStatus,
  type ProposalEvent,
  type ProposalLifecycleStatus,
  type ProposalRecord,
} from "@/lib/ops/proposals";
import type { DigestQuote } from "@/lib/ops/morning-digest";
import {
  asReviewDraft,
  reviewIdempotencyKey,
  type ReviewDraft,
  type ReviewDraftInput,
} from "@/lib/ops/review-drafts";

export async function saveReviewDraft(draft: ReviewDraftInput): Promise<void> {
  if (isDemoOpsStore()) return;
  try {
    await getDb()
      .insert(backgroundJobs)
      .values({
        organizationId: draft.organizationId,
        kind: "ops.proposal",
        aggregateType: "automation_proposal",
        aggregateId: draft.proposalId ?? draft.recordId,
        idempotencyKey: reviewIdempotencyKey(draft),
        status: "completed",
        attempts: 1,
        maxAttempts: 1,
        checkpoint: { proposalStatus: draft.status },
        payload: { ...draft },
        updatedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [backgroundJobs.organizationId, backgroundJobs.idempotencyKey],
      });
  } catch (error) {
    console.error("Review draft was not stored.", error);
  }
}

export async function listReviewDrafts(organizationId: string): Promise<ReviewDraft[]> {
  if (isDemoOpsStore()) return [];
  try {
    const rows = await getDb()
      .select({ id: backgroundJobs.id, payload: backgroundJobs.payload })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.organizationId, organizationId),
          eq(backgroundJobs.kind, "ops.proposal"),
          eq(backgroundJobs.status, "completed"),
        ),
      )
      .orderBy(desc(backgroundJobs.updatedAt))
      .limit(50);
    return rows
      .map((row) => asReviewDraft(row.id, row.payload))
      .filter((draft): draft is ReviewDraft => draft !== null)
      .filter((draft) => draft.status === "proposed" || draft.status === "confirmed");
  } catch (error) {
    console.error("Review drafts could not be listed.", error);
    return [];
  }
}

export async function updateReviewDrafts(
  organizationId: string,
  drafts: ReviewDraft[],
): Promise<void> {
  if (isDemoOpsStore() || drafts.length === 0) return;
  const db = getDb();
  for (const draft of drafts) {
    const { id, ...payload } = draft;
    await db
      .update(backgroundJobs)
      .set({
        payload,
        checkpoint: { proposalStatus: draft.status },
        updatedAt: new Date(),
      })
      .where(and(eq(backgroundJobs.id, id), eq(backgroundJobs.organizationId, organizationId)));
  }
}

export async function saveDigestOptIn(input: {
  organizationId: string;
  userId: string;
  email: string;
  optedIn: boolean;
}): Promise<void> {
  if (isDemoOpsStore()) return;
  const payload = {
    userId: input.userId,
    email: input.email.trim().toLowerCase(),
    optedIn: input.optedIn,
  };
  await getDb()
    .insert(backgroundJobs)
    .values({
      organizationId: input.organizationId,
      kind: "staff.digest-opt-in",
      aggregateType: "user",
      aggregateId: input.userId,
      idempotencyKey: `staff.digest-opt-in:${input.userId}`,
      status: "completed",
      attempts: 1,
      maxAttempts: 1,
      checkpoint: { optedIn: input.optedIn },
      payload,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [backgroundJobs.organizationId, backgroundJobs.idempotencyKey],
      set: {
        payload,
        checkpoint: { optedIn: input.optedIn },
        status: "completed",
        updatedAt: new Date(),
      },
    });
}

export async function readDigestOptIn(organizationId: string, userId: string): Promise<boolean> {
  if (isDemoOpsStore()) return false;
  try {
    const rows = await getDb()
      .select({ payload: backgroundJobs.payload })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.organizationId, organizationId),
          eq(backgroundJobs.idempotencyKey, `staff.digest-opt-in:${userId}`),
        ),
      )
      .limit(1);
    const payload = rows[0]?.payload as { optedIn?: boolean } | undefined;
    return payload?.optedIn === true;
  } catch (error) {
    console.error("Digest opt-in could not be read.", error);
    return false;
  }
}

export async function listDigestOptInRows(
  organizationId: string,
): Promise<Array<{ email: string; optedIn: boolean }>> {
  if (isDemoOpsStore()) return [];
  try {
    const rows = await getDb()
      .select({ payload: backgroundJobs.payload })
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.organizationId, organizationId),
          eq(backgroundJobs.kind, "staff.digest-opt-in"),
          eq(backgroundJobs.status, "completed"),
        ),
      );
    return rows.flatMap((row) => {
      const payload = row.payload as { email?: unknown; optedIn?: unknown };
      if (typeof payload.email !== "string") return [];
      return [{ email: payload.email, optedIn: payload.optedIn === true }];
    });
  } catch (error) {
    console.error("Digest opt-in rows could not be listed.", error);
    return [];
  }
}

export async function proposalIsOpen(proposalId: string): Promise<boolean> {
  if (isDemoOpsStore()) return false;
  const db = getDb();
  const rows = await db.select().from(proposals).where(eq(proposals.id, proposalId)).limit(1);
  const row = rows[0];
  if (!row) return false;
  const events = await db
    .select()
    .from(proposalEvents)
    .where(eq(proposalEvents.proposalId, proposalId));
  return followupStillOpen(lifecycle(row.expiresAt, events));
}

export async function listOpenProposalRefs(organizationId: string): Promise<OpenProposalRef[]> {
  const loaded = await loadProposalRows(organizationId);
  return loaded.filter((row) => followupStillOpen(row.status));
}

export async function listQuotesAwaitingDecision(organizationId: string): Promise<DigestQuote[]> {
  const loaded = await loadProposalRows(organizationId);
  return loaded
    .filter((row) => row.status === "delivered" || row.status === "viewed")
    .map((row) => ({
      id: row.id,
      estimateNumber: row.estimateNumber,
      status: row.status,
      href: row.href,
    }));
}

export async function startProposalFollowup(params: FollowupParams): Promise<void> {
  try {
    const { getPlatform } = await import("@/lib/cloudflare/platform");
    const platform = await getPlatform();
    await createFollowupInstance(platform?.PROPOSAL_FOLLOWUPS, params);
  } catch (error) {
    console.error("Proposal follow-up workflow did not start.", error);
  }
}

export async function cancelProposalFollowup(proposalId: string): Promise<void> {
  try {
    const { getPlatform } = await import("@/lib/cloudflare/platform");
    const platform = await getPlatform();
    await cancelFollowupInstance(platform?.PROPOSAL_FOLLOWUPS, proposalId);
  } catch (error) {
    console.error("Proposal follow-up workflow did not stop.", error);
  }
}

type LoadedProposal = OpenProposalRef & { href: string };

async function loadProposalRows(organizationId: string): Promise<LoadedProposal[]> {
  if (isDemoOpsStore()) return [];
  try {
    const db = getDb();
    const proposalRows = await db
      .select({
        id: proposals.id,
        organizationId: proposals.organizationId,
        estimateId: proposals.estimateId,
        expiresAt: proposals.expiresAt,
        snapshot: proposals.publicSnapshot,
        opportunityId: estimates.opportunityId,
      })
      .from(proposals)
      .innerJoin(estimates, eq(estimates.id, proposals.estimateId))
      .where(eq(proposals.organizationId, organizationId))
      .orderBy(desc(proposals.createdAt))
      .limit(200);
    if (proposalRows.length === 0) return [];
    const events = await db
      .select()
      .from(proposalEvents)
      .where(
        inArray(
          proposalEvents.proposalId,
          proposalRows.map((row) => row.id),
        ),
      );
    const now = new Date();
    return proposalRows.map((row) => {
      const related = events.filter((event) => event.proposalId === row.id);
      const status = lifecycle(row.expiresAt, related, now);
      const delivered = [...related].reverse().find((event) => event.kind === "delivered" && event.recipientEmail);
      return {
        id: row.id,
        organizationId: row.organizationId,
        estimateNumber: estimateNumberOf(row.snapshot),
        recipientEmail: delivered?.recipientEmail ?? "",
        status,
        href: `/app/opportunities/${row.opportunityId}/estimates/${row.estimateId}`,
      };
    });
  } catch (error) {
    console.error("Proposals could not be listed for follow-up.", error);
    return [];
  }
}

function lifecycle(
  expiresAt: Date,
  events: Array<{ kind: string }>,
  now = new Date(),
): ProposalLifecycleStatus {
  return proposalLifecycleStatus(
    { expiresAt } as ProposalRecord,
    events.map((event) => ({ kind: event.kind }) as ProposalEvent),
    now,
  );
}

function estimateNumberOf(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== "object") return "";
  const number = (snapshot as { estimateNumber?: unknown }).estimateNumber;
  return typeof number === "string" ? number : "";
}
