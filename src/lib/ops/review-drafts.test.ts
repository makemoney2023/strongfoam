import { describe, expect, it } from "vitest";
import { applyBatchDecision, decideFollowupSend, type ReviewDraft } from "@/lib/ops/review-drafts";

function draft(overrides: Partial<ReviewDraft> = {}): ReviewDraft {
  return {
    id: "draft-1",
    kind: "proposal_followup",
    status: "proposed",
    requiresConfirmation: true,
    sendsToCustomer: false,
    setsPrice: false,
    approves: false,
    organizationId: "org-1",
    recordId: "proposal-1:day-3",
    title: "Follow-up draft · E-100 · day 3",
    body: "Following up on estimate E-100, day 3.",
    href: "/app/automation",
    workingDay: "day-3",
    proposalId: "proposal-1",
    recipientEmail: "ada@example.com",
    ...overrides,
  };
}

describe("batch review", () => {
  it("confirms non-status drafts without an event, a cancel, or a send", () => {
    const kinds = ["proposal_followup", "morning_brief", "stale_sweep", "daily_report", "morning_digest"] as const;
    for (const kind of kinds) {
      const result = applyBatchDecision({
        drafts: [draft({ id: kind, kind })],
        ids: [kind],
        decision: "confirm",
      });
      expect(result.updated.map((row) => row.status)).toEqual(["confirmed"]);
      expect(result.statusEvents).toEqual([]);
      expect(result.cancelProposalIds).toEqual([]);
      expect(Object.keys(result).sort()).toEqual(["cancelProposalIds", "statusEvents", "updated"]);
    }
  });

  it("confirms accepted and lost replies into status events and cancels", () => {
    const accepted = applyBatchDecision({
      drafts: [draft({ id: "a", kind: "status_change", classification: "accepted", quote: "We accept." })],
      ids: ["a"],
      decision: "confirm",
    });
    expect(accepted.statusEvents).toEqual([
      { proposalId: "proposal-1", organizationId: "org-1", kind: "accepted", quote: "We accept." },
    ]);
    expect(accepted.cancelProposalIds).toEqual(["proposal-1"]);
    const lost = applyBatchDecision({
      drafts: [draft({ id: "l", kind: "status_change", classification: "lost", quote: "We decline." })],
      ids: ["l"],
      decision: "confirm",
    });
    expect(lost.statusEvents[0]?.kind).toBe("rejected");
    expect(lost.cancelProposalIds).toEqual(["proposal-1"]);
  });

  it("confirms a question or other without a proposal event", () => {
    for (const classification of ["question", "other"] as const) {
      const result = applyBatchDecision({
        drafts: [draft({ id: classification, kind: "status_change", classification, quote: "Hello" })],
        ids: [classification],
        decision: "confirm",
      });
      expect(result.updated[0]?.status).toBe("confirmed");
      expect(result.statusEvents).toEqual([]);
      expect(result.cancelProposalIds).toEqual([]);
    }
  });

  it("dismisses without an event or a cancel and ignores unknown ids", () => {
    const result = applyBatchDecision({
      drafts: [draft(), draft({ id: "other", kind: "morning_brief" })],
      ids: ["missing", "other"],
      decision: "dismiss",
    });
    expect(result.updated).toEqual([expect.objectContaining({ id: "other", status: "dismissed" })]);
    expect(result.statusEvents).toEqual([]);
    expect(result.cancelProposalIds).toEqual([]);
  });

  it("sends a follow-up only for an administrator confirmation of the stored draft", () => {
    const stored = draft();
    expect(decideFollowupSend({ draft: stored, role: "office", confirmSend: true, from: "Strong Foam <estimates@strongfoam.com>" }).send).toBe(false);
    expect(decideFollowupSend({ draft: stored, role: "administrator", confirmSend: false, from: "Strong Foam <estimates@strongfoam.com>" }).send).toBe(false);
    expect(decideFollowupSend({ draft: draft({ kind: "morning_digest" }), role: "administrator", confirmSend: true, from: "Strong Foam <estimates@strongfoam.com>" }).send).toBe(false);
    const decision = decideFollowupSend({
      draft: stored,
      role: "administrator",
      confirmSend: true,
      from: "Strong Foam <estimates@strongfoam.com>",
    });
    expect(decision.send).toBe(true);
    if (decision.send) {
      expect(decision.message.text).toBe(stored.body);
      expect(decision.message.to).toEqual(["ada@example.com"]);
    }
  });
});
