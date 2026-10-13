import type { ReplyClass } from "@/lib/ops/proposal-followups";

export const REVIEW_DRAFT_KINDS = [
  "daily_report",
  "morning_brief",
  "stale_sweep",
  "proposal_followup",
  "morning_digest",
  "status_change",
] as const;

export type ReviewDraftKind = (typeof REVIEW_DRAFT_KINDS)[number];
export type ReviewDraftStatus = "proposed" | "confirmed" | "dismissed" | "sent";

export type ReviewDraft = {
  id: string;
  kind: ReviewDraftKind;
  status: ReviewDraftStatus;
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
  proposalId?: string;
  classification?: ReplyClass;
  quote?: string;
  recipientEmail?: string;
  day?: number;
};

export type ReviewDraftInput = Omit<ReviewDraft, "id">;

export type StatusDecision = {
  proposalId: string;
  organizationId: string;
  kind: "accepted" | "rejected";
  quote: string;
};

export function applyBatchDecision(input: {
  drafts: ReviewDraft[];
  ids: string[];
  decision: "confirm" | "dismiss";
}): {
  updated: ReviewDraft[];
  statusEvents: StatusDecision[];
  cancelProposalIds: string[];
} {
  const selected = new Set(input.ids);
  const updated: ReviewDraft[] = [];
  const statusEvents: StatusDecision[] = [];
  const cancelProposalIds: string[] = [];
  for (const draft of input.drafts) {
    if (!selected.has(draft.id) || draft.status !== "proposed") continue;
    if (input.decision === "dismiss") {
      updated.push({ ...draft, status: "dismissed" });
      continue;
    }
    updated.push({ ...draft, status: "confirmed" });
    if (
      draft.kind === "status_change" &&
      draft.proposalId &&
      (draft.classification === "accepted" || draft.classification === "lost")
    ) {
      statusEvents.push({
        proposalId: draft.proposalId,
        organizationId: draft.organizationId,
        kind: draft.classification === "accepted" ? "accepted" : "rejected",
        quote: draft.quote ?? "",
      });
      cancelProposalIds.push(draft.proposalId);
    }
  }
  return { updated, statusEvents, cancelProposalIds };
}

export function decideFollowupSend(input: {
  draft: ReviewDraft;
  role: string;
  confirmSend: boolean;
  from: string;
}):
  | { send: false }
  | { send: true; message: { to: string[]; from: string; subject: string; text: string } } {
  if (input.draft.kind !== "proposal_followup") return { send: false };
  if (input.draft.status !== "proposed" && input.draft.status !== "confirmed") return { send: false };
  if (input.role !== "administrator" || !input.confirmSend) return { send: false };
  const to = input.draft.recipientEmail?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { send: false };
  const text = input.draft.body.trim();
  if (!text) return { send: false };
  return {
    send: true,
    message: {
      to: [to],
      from: input.from,
      subject: input.draft.title,
      text: input.draft.body,
    },
  };
}

export function asReviewDraft(id: string, payload: unknown): ReviewDraft | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (row.status !== "proposed" && row.status !== "confirmed" && row.status !== "sent") return null;
  if (row.requiresConfirmation !== true) return null;
  if (typeof row.kind !== "string" || !REVIEW_DRAFT_KINDS.includes(row.kind as ReviewDraftKind)) {
    return null;
  }
  if (typeof row.organizationId !== "string" || typeof row.title !== "string" || typeof row.body !== "string") {
    return null;
  }
  const classification = row.classification;
  return {
    id,
    kind: row.kind as ReviewDraftKind,
    status: row.status,
    requiresConfirmation: true,
    sendsToCustomer: false,
    setsPrice: false,
    approves: false,
    organizationId: row.organizationId,
    recordId: typeof row.recordId === "string" ? row.recordId : id,
    title: row.title,
    body: row.body,
    href: typeof row.href === "string" ? row.href : "/app",
    workingDay: typeof row.workingDay === "string" ? row.workingDay : "",
    proposalId: typeof row.proposalId === "string" ? row.proposalId : undefined,
    classification:
      classification === "accepted" ||
      classification === "question" ||
      classification === "lost" ||
      classification === "other"
        ? classification
        : undefined,
    quote: typeof row.quote === "string" ? row.quote : undefined,
    recipientEmail: typeof row.recipientEmail === "string" ? row.recipientEmail : undefined,
    day: typeof row.day === "number" ? row.day : undefined,
  };
}

export function reviewIdempotencyKey(draft: {
  kind: string;
  recordId: string;
  workingDay: string;
  proposalId?: string;
  day?: number;
}): string {
  if (draft.kind === "proposal_followup") {
    return `ops.proposal:proposal_followup:${draft.proposalId ?? draft.recordId}:day-${draft.day ?? draft.workingDay}`;
  }
  if (draft.kind === "status_change") return `ops.proposal:status_change:${draft.recordId}`;
  if (draft.kind === "morning_digest") {
    return `ops.proposal:morning_digest:${draft.recordId}:${draft.workingDay}`;
  }
  return `ops.proposal:${draft.kind}:${draft.recordId}:${draft.workingDay}`;
}
