import type { InboundProposal } from "@/lib/leads/inbound-mail";
import type { ReviewDraft } from "@/lib/ops/review-drafts";

type DemoInbox = {
  proposals: InboundProposal[];
  drafts: ReviewDraft[];
};

const memory = globalThis as { __strongfoamDemoInbox?: DemoInbox };

function bucket(): DemoInbox {
  memory.__strongfoamDemoInbox ??= { proposals: [], drafts: [] };
  return memory.__strongfoamDemoInbox;
}

export function resetDemoInbox(): void {
  memory.__strongfoamDemoInbox = { proposals: [], drafts: [] };
}

export function listDemoInboundProposals(organizationId?: string): InboundProposal[] {
  return bucket().proposals.filter(
    (proposal) => !organizationId || proposal.organizationId === organizationId,
  );
}

export function findDemoInboundProposal(
  organizationId: string,
  dedupeKey: string,
): InboundProposal | null {
  return (
    bucket().proposals.find(
      (proposal) => proposal.organizationId === organizationId && proposal.dedupeKey === dedupeKey,
    ) ?? null
  );
}

export function saveDemoInboundProposal(proposal: InboundProposal): "created" | "duplicate" {
  const rows = bucket().proposals;
  const index = rows.findIndex(
    (item) => item.organizationId === proposal.organizationId && item.dedupeKey === proposal.dedupeKey,
  );
  if (index >= 0) {
    rows[index] = proposal;
    return "duplicate";
  }
  rows.unshift(proposal);
  return "created";
}

export function listDemoReviewDrafts(organizationId: string): ReviewDraft[] {
  return bucket().drafts.filter((draft) => draft.organizationId === organizationId);
}

export function saveDemoReviewDraft(draft: ReviewDraft): void {
  const rows = bucket().drafts;
  const index = rows.findIndex((item) => item.id === draft.id);
  if (index >= 0) rows[index] = draft;
  else rows.unshift(draft);
}

export function updateDemoReviewDrafts(organizationId: string, drafts: ReviewDraft[]): void {
  for (const draft of drafts) {
    if (draft.organizationId !== organizationId) continue;
    saveDemoReviewDraft(draft);
  }
}

export function removeDemoInboxIds(ids: readonly string[]): void {
  const inbox = bucket();
  inbox.proposals = inbox.proposals.filter((proposal) => !ids.includes(proposal.dedupeKey));
  inbox.drafts = inbox.drafts.filter((draft) => !ids.includes(draft.id));
}
