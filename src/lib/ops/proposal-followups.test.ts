import { describe, expect, it, vi } from "vitest";
import {
  FOLLOWUP_GAPS,
  cancelFollowupInstance,
  classifyProposalReply,
  confirmedStatusEvent,
  createFollowupInstance,
  followupDraft,
  proposalReplyMatch,
  readReplyLabel,
  runFollowupSteps,
  statusChangeProposal,
  type FollowupParams,
  type FollowupStep,
  type OpenProposalRef,
} from "@/lib/ops/proposal-followups";

const PARAMS: FollowupParams = {
  organizationId: "org-1",
  proposalId: "proposal-1",
  estimateId: "estimate-1",
  estimateNumber: "E-100",
  recipientName: "Ada Lovelace",
  recipientEmail: "ada@example.com",
};

function stepRecorder() {
  const sleeps: string[] = [];
  const step: FollowupStep = {
    async sleep(_name, duration) {
      sleeps.push(duration);
    },
    async do(_name, callback) {
      return callback();
    },
  };
  return { step, sleeps };
}

const OPEN: OpenProposalRef = {
  id: "proposal-1",
  organizationId: "org-1",
  estimateNumber: "E-100",
  recipientEmail: "ada@example.com",
  status: "delivered",
};

describe("proposal follow-ups", () => {
  it("sleeps 3 days, then 4 days, then 7 days and never sends", async () => {
    expect(FOLLOWUP_GAPS.map((gap) => gap.sleep)).toEqual(["3 days", "4 days", "7 days"]);
    const { step, sleeps } = stepRecorder();
    const send = vi.fn();
    const saved: string[] = [];
    const drafts = await runFollowupSteps(step, PARAMS, {
      isOpen: async () => true,
      saveDraft: async (draft) => {
        saved.push(draft.body);
      },
      send,
    });
    expect(sleeps).toEqual(["3 days", "4 days", "7 days"]);
    expect(drafts.map((draft) => draft.day)).toEqual([3, 7, 14]);
    expect(saved).toHaveLength(3);
    expect(send).not.toHaveBeenCalled();
    for (const body of saved) {
      expect(body).toContain("E-100");
      expect(body).not.toMatch(/\$\d/);
      expect(body.toLowerCase()).not.toContain("approved");
    }
  });

  it("stops after the proposal closes", async () => {
    const { step, sleeps } = stepRecorder();
    let checks = 0;
    const drafts = await runFollowupSteps(step, PARAMS, {
      isOpen: async () => {
        checks += 1;
        return checks === 1;
      },
      saveDraft: async () => undefined,
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.day).toBe(3);
    expect(sleeps).toEqual(["3 days", "4 days"]);
  });

  it("names the estimate and the day without a price", () => {
    const draft = followupDraft({ ...PARAMS, day: 7, workingDay: "day-7" });
    expect(draft.body).toContain("estimate E-100");
    expect(draft.body).toContain("day 7");
    expect(draft.sendsToCustomer).toBe(false);
    expect(draft.requiresConfirmation).toBe(true);
  });

  it("drops an accepted model label the email does not support", () => {
    const result = classifyProposalReply({
      subject: "Re: E-100",
      text: "Can you clarify the start date?",
      modelLabel: "accepted",
    });
    expect(result.classification).toBe("question");
    expect("Can you clarify the start date?".includes(result.quote)).toBe(true);
  });

  it("keeps a model label when the text supports it", () => {
    const email = "We accept the proposal.";
    const result = classifyProposalReply({
      subject: "Re: E-100",
      text: email,
      modelLabel: "accepted",
    });
    expect(result.classification).toBe("accepted");
    expect(email.includes(result.quote) || `Re: E-100\n${email}`.includes(result.quote)).toBe(true);
    expect(readReplyLabel('{"label":"lost"}')).toBe("lost");
    expect(readReplyLabel("not json")).toBeNull();
  });

  it("matches one estimate number, then one recipient, and refuses two matches", () => {
    const other: OpenProposalRef = { ...OPEN, id: "proposal-2", estimateNumber: "E-200", recipientEmail: "bea@example.com" };
    expect(
      proposalReplyMatch({
        fromEmail: "other@example.com",
        subject: "Re: E-100",
        text: "Thanks",
        open: [OPEN, other],
      })?.id,
    ).toBe("proposal-1");
    expect(
      proposalReplyMatch({
        fromEmail: "ada@example.com",
        subject: "Hello",
        text: "Checking in",
        open: [OPEN, other],
      })?.id,
    ).toBe("proposal-1");
    expect(
      proposalReplyMatch({
        fromEmail: "ada@example.com",
        subject: "E-100 and E-200",
        text: "Which one?",
        open: [OPEN, other],
      }),
    ).toBeNull();
    expect(
      proposalReplyMatch({
        fromEmail: "ada@example.com",
        subject: "Hello",
        text: "Two of us",
        open: [OPEN, { ...OPEN, id: "proposal-3" }],
      }),
    ).toBeNull();
  });

  it("stores a status proposal whose quote is in the email", () => {
    const quote = "We accept the proposal.";
    const draft = statusChangeProposal({
      match: OPEN,
      classification: "accepted",
      quote,
      fromEmail: "ada@example.com",
      subject: "Re: E-100",
      text: quote,
      workingDay: "2026-10-13",
      dedupeKey: "abc",
    });
    expect(draft.requiresConfirmation).toBe(true);
    expect(draft.sendsToCustomer).toBe(false);
    expect(draft.quote).toBe(quote);
    expect(draft.body.toLowerCase()).not.toContain("approved");
    const invented = statusChangeProposal({
      ...{
        match: OPEN,
        classification: "accepted",
        quote: "A sentence that was not in the email.",
        fromEmail: "ada@example.com",
        subject: "Re: E-100",
        text: quote,
        workingDay: "2026-10-13",
        dedupeKey: "abc",
      },
    });
    expect(invented.quote).toBe("");
  });

  it("creates an instance with the proposal id and terminates on cancel", async () => {
    const terminate = vi.fn(async () => undefined);
    const create = vi.fn(async () => ({ terminate }));
    const get = vi.fn(async () => ({ terminate }));
    const binding = { create, get };
    expect(await createFollowupInstance(binding, PARAMS)).toBe("started");
    expect(create).toHaveBeenCalledWith({ id: "proposal-1", params: PARAMS });
    expect(await cancelFollowupInstance(binding, "proposal-1")).toBe("terminated");
    expect(get).toHaveBeenCalledWith("proposal-1");
    expect(terminate).toHaveBeenCalledOnce();
    expect(await createFollowupInstance(null, PARAMS)).toBe("unavailable");
    expect(await cancelFollowupInstance(undefined, "proposal-1")).toBe("unavailable");
  });

  it("records a confirmed status event without a price", () => {
    const event = confirmedStatusEvent({
      organizationId: "org-1",
      proposalId: "proposal-1",
      kind: "accepted",
      quote: "We accept the proposal.",
      actorEmail: "owner@strongfoam.com",
      now: new Date("2026-10-13T12:00:00Z"),
    });
    expect(event.kind).toBe("accepted");
    expect(event.attestation).toBe("We accept the proposal.");
    expect(event.channel).toBe("email-reply");
    expect(JSON.stringify(event)).not.toMatch(/\$\d/);
  });
});
