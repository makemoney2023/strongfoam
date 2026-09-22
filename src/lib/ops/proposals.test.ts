import { describe, expect, it } from "vitest";
import { APPROVAL_DECISION_TTL_MS, type EstimateApproval } from "@/lib/ops/estimate-approvals";
import type { PreparedEstimateVersion } from "@/lib/ops/estimates";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import {
  PROPOSAL_ACCEPTANCE_TERMS,
  decideProposal,
  generateProposal,
  hashProposalToken,
  recordProposalDelivery,
  recordProposalView,
  revealProposal,
  revokeProposal,
} from "@/lib/ops/proposals";

const ORG = STRONG_FOAM_ORGANIZATION_ID;
const NOW = new Date("2026-09-22T15:00:00.000Z");
const TOKEN = "proposal-token-0123456789abcdef";

const admin = {
  email: "admin@strongfoam.demo",
  role: "administrator" as const,
  organizationId: ORG,
};

const version: PreparedEstimateVersion = {
  organizationId: ORG,
  estimateId: "22222222-2222-4222-8222-222222222201",
  opportunityId: "99999999-9999-4999-8999-999999999991",
  versionId: "22222222-2222-4222-8222-222222222211",
  versionNumber: 1,
  createdBy: admin.email,
  overheadBasisPoints: 0,
  markupBasisPoints: 1000,
  taxBasisPoints: 1300,
  calculationOrder: "overhead-markup-tax",
  baseSubtotalCents: 78250,
  alternateTotalCents: 0,
  overheadCents: 0,
  markupCents: 7825,
  taxCents: 11190,
  totalCents: 97265,
  contentHash: "harbour-v1",
  clauses: [
    { id: "c1", kind: "inclusion", text: "Closed-cell at the podium", sortOrder: 0 },
    { id: "c2", kind: "exclusion", text: "Interior finishes", sortOrder: 1 },
    { id: "c3", kind: "assumption", text: "Internal cost note", sortOrder: 2 },
  ],
  alternates: [
    {
      id: "a1",
      key: "intumescent",
      name: "Intumescent upgrade",
      description: "Add intumescent coating at the podium",
      included: false,
      sortOrder: 0,
    },
  ],
  lines: [
    {
      id: "l1",
      sortOrder: 0,
      category: "material",
      description: "Closed-cell spray foam",
      trade: "spray-foam",
      location: "Podium",
      method: "unit",
      quantity: "2.5000",
      unit: "bags",
      unitPriceCents: 18500,
      basisPoints: null,
      basisCategories: [],
      taxable: true,
      alternateId: null,
      alternateKey: null,
      priceBookItemId: null,
      priceBookVersionId: null,
      lineTotalCents: 46250,
      includedInTotal: true,
    },
  ],
  sources: [],
  jobPackages: [
    {
      id: "p1",
      key: "podium",
      name: "Podium closed-cell spray foam",
      trade: "spray-foam",
      scope: "Podium closed-cell",
      sortOrder: 0,
      workAreas: [],
      tasks: [],
    },
  ],
};

function approval(overrides: Partial<EstimateApproval> = {}): EstimateApproval {
  return {
    id: "ap-1",
    organizationId: ORG,
    estimateId: version.estimateId,
    estimateVersionId: version.versionId,
    versionNumber: 1,
    contentHash: version.contentHash,
    ruleId: "rule-1",
    actorEmail: admin.email,
    decision: "approved",
    comment: "Approved for the customer.",
    expiresAt: new Date(NOW.getTime() + APPROVAL_DECISION_TTL_MS),
    createdAt: NOW,
    ...overrides,
  };
}

function loaded(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: ORG,
    organizationName: "Strong Foam Insulation Inc.",
    companyName: "Acme Construction Ltd",
    siteName: "Waterloo yard, Waterloo",
    estimateNumber: "EST-1001",
    estimateTitle: "Harbour bid package",
    version,
    latestVersionNumber: 1,
    approvals: [approval()],
    rules: [
      {
        id: "rule-1",
        organizationId: ORG,
        name: "Administrator approval",
        active: true,
        secondApproverTotalCents: null,
      },
    ],
    ...overrides,
  };
}

describe("proposal lifecycle", () => {
  it("requires the current approval and writes no delivery event", async () => {
    const unapproved = await generateProposal({
      actor: admin,
      now: NOW,
      token: TOKEN,
      loaded: loaded({ approvals: [] }),
    });
    expect(unapproved.ok).toBe(false);

    const generated = await generateProposal({
      actor: admin,
      now: NOW,
      token: TOKEN,
      loaded: loaded(),
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    expect(generated.events.map((event) => event.kind)).toEqual(["generated"]);
    expect(generated.proposal.tokenHash).toBe(hashProposalToken(TOKEN));
    expect(generated.proposal.tokenHash).not.toBe(TOKEN);
    expect(JSON.stringify(generated.proposal)).not.toContain(TOKEN);
    expect(JSON.stringify(generated.events)).not.toContain(TOKEN);
    expect(generated.proposal.snapshot.totalCents).toBe(97265);
    expect(JSON.stringify(generated.proposal.snapshot)).not.toContain("Internal cost note");
    expect(JSON.stringify(generated.proposal.snapshot)).not.toContain("Approved for the customer.");
    expect(generated.proposal.pdfSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Buffer.from(generated.proposal.pdfBase64, "base64").subarray(0, 4).toString()).toBe("%PDF");
  });

  it("records the first view once and hides revoked or expired tokens", async () => {
    const generated = await generateProposal({
      actor: admin,
      now: NOW,
      token: TOKEN,
      loaded: loaded(),
    });
    if (!generated.ok) throw new Error("expected a proposal");
    const first = recordProposalView({
      proposal: generated.proposal,
      events: generated.events,
      now: new Date(NOW.getTime() + 1000),
    });
    expect(first.ok).toBe(true);
    if (!first.ok || !first.event) throw new Error("expected a view");
    expect(first.event.kind).toBe("viewed");
    expect(first.snapshot.estimateNumber).toBe("EST-1001");

    const second = recordProposalView({
      proposal: generated.proposal,
      events: [...generated.events, first.event],
      now: new Date(NOW.getTime() + 2000),
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.event).toBeNull();

    const revoked = revokeProposal({
      actor: admin,
      proposal: generated.proposal,
      events: [...generated.events, first.event],
      now: new Date(NOW.getTime() + 3000),
    });
    expect(revoked.ok).toBe(true);
    if (!revoked.ok) return;
    expect(
      revealProposal({
        proposal: generated.proposal,
        events: [...generated.events, first.event, revoked.event],
        now: new Date(NOW.getTime() + 4000),
      }).ok,
    ).toBe(false);

    expect(
      revealProposal({
        proposal: generated.proposal,
        events: generated.events,
        now: new Date(generated.proposal.expiresAt.getTime() + 1),
      }).ok,
    ).toBe(false);
  });

  it("accepts and rejects once and returns the original decision", async () => {
    const generated = await generateProposal({
      actor: admin,
      now: NOW,
      token: TOKEN,
      loaded: loaded(),
    });
    if (!generated.ok) throw new Error("expected a proposal");
    const viewed = recordProposalView({
      proposal: generated.proposal,
      events: generated.events,
      now: NOW,
    });
    if (!viewed.ok || !viewed.event) throw new Error("expected a view");
    const events = [...generated.events, viewed.event];
    const recipient = {
      recipientName: "Alex Lee",
      recipientEmail: "alex@acme-gc.example",
      attestation: PROPOSAL_ACCEPTANCE_TERMS,
      ipAddress: "203.0.113.5",
      userAgent: "vitest",
    };
    const accepted = decideProposal({
      proposal: generated.proposal,
      events,
      now: new Date(NOW.getTime() + 5000),
      decision: "accepted",
      latestVersionNumber: 1,
      approvalSatisfied: true,
      existingAcceptance: null,
      ...recipient,
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok || accepted.decision !== "accepted") return;
    const replay = decideProposal({
      proposal: generated.proposal,
      events: [...events, accepted.event],
      now: new Date(NOW.getTime() + 6000),
      decision: "accepted",
      latestVersionNumber: 1,
      approvalSatisfied: true,
      existingAcceptance: accepted.acceptance,
      ...recipient,
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok || replay.decision !== "accepted") return;
    expect(replay.replayed).toBe(true);
    expect(replay.acceptance.id).toBe(accepted.acceptance.id);

    const rejected = decideProposal({
      proposal: generated.proposal,
      events,
      now: NOW,
      decision: "rejected",
      latestVersionNumber: 1,
      approvalSatisfied: true,
      existingAcceptance: null,
      ...recipient,
    });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok || rejected.decision !== "rejected") return;
    const rejectReplay = decideProposal({
      proposal: generated.proposal,
      events: [...events, rejected.event],
      now: new Date(NOW.getTime() + 1000),
      decision: "rejected",
      latestVersionNumber: 1,
      approvalSatisfied: true,
      existingAcceptance: null,
      ...recipient,
    });
    expect(rejectReplay.ok).toBe(true);
    if (!rejectReplay.ok || rejectReplay.decision !== "rejected") return;
    expect(rejectReplay.replayed).toBe(true);
    expect(rejectReplay.event.id).toBe(rejected.event.id);

    const conflict = decideProposal({
      proposal: generated.proposal,
      events: [...events, accepted.event],
      now: NOW,
      decision: "rejected",
      latestVersionNumber: 1,
      approvalSatisfied: true,
      existingAcceptance: accepted.acceptance,
      ...recipient,
    });
    expect(conflict.ok).toBe(false);
  });

  it("records delivery separately from generation", async () => {
    const generated = await generateProposal({
      actor: admin,
      now: NOW,
      token: TOKEN,
      loaded: loaded(),
    });
    if (!generated.ok) throw new Error("expected a proposal");
    const delivered = recordProposalDelivery({
      actor: admin,
      proposal: generated.proposal,
      now: new Date(NOW.getTime() + 1000),
      channel: "email",
      recipientName: "Alex Lee",
      recipientEmail: "alex@acme-gc.example",
      externalMessageId: "msg-100",
    });
    expect(delivered.ok).toBe(true);
    if (!delivered.ok) return;
    expect(delivered.event.kind).toBe("delivered");
    expect(delivered.event.channel).toBe("email");
    expect(delivered.event.externalMessageId).toBe("msg-100");
    expect(generated.events.some((event) => event.kind === "delivered")).toBe(false);
  });
});
