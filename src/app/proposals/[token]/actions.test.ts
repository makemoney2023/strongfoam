import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOpsSession } = vi.hoisted(() => ({
  getOpsSession: vi.fn(),
}));

vi.mock("@/lib/ops/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ops/auth")>();
  return { ...actual, getOpsSession };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": "vitest", "x-forwarded-for": "203.0.113.5" }),
}));

import { generateProposalAction } from "@/app/app/opportunities/[id]/estimates/actions";
import { recordProposalDecision } from "@/app/proposals/[token]/actions";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_USER_ID,
  DEMO_ESTIMATE_ID,
} from "@/lib/ops/demo-data";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { PROPOSAL_ACCEPTANCE_TERMS, hashProposalToken } from "@/lib/ops/proposals";
import { listDemoJobs, listDemoProjects } from "@/lib/ops/demo-store";
import {
  getEstimateAcceptance,
  listEstimateGraphs,
  listProposalEvents,
  listProposals,
  openProposalByToken,
} from "@/lib/ops/store";

const adminSession = {
  userId: DEMO_ADMIN_USER_ID,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
  email: DEMO_ADMIN_EMAIL,
  role: "administrator" as const,
  sessionVersion: 1,
  issuedAt: 1,
  expiresAt: 2,
  displayName: "Demo Administrator",
  legacy: false,
};

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("public proposal decision", () => {
  beforeEach(() => {
    process.env.OPS_DEMO = "1";
    getOpsSession.mockReset();
  });

  it("hides an unknown token and does not create an acceptance", async () => {
    const result = await recordProposalDecision(
      form({
        token: "missing-token",
        decision: "accepted",
        recipientName: "Alex Lee",
        recipientEmail: "alex@acme-gc.example",
        attestation: PROPOSAL_ACCEPTANCE_TERMS,
      }),
    );
    expect(result.error).toMatch(/unavailable/i);
  });

  it("stores a hashed token, views once, and replays acceptance", async () => {
    getOpsSession.mockResolvedValue(adminSession);
    const graph = (await listEstimateGraphs(DEMO_ESTIMATE_ID)).at(-1);
    expect(graph).toBeTruthy();
    if (!graph) return;
    const { decideEstimateVersionAction } = await import(
      "@/app/app/opportunities/[id]/estimates/actions"
    );
    await decideEstimateVersionAction(
      form({
        estimateId: DEMO_ESTIMATE_ID,
        estimateVersionId: graph.versionId,
        expectedHash: graph.contentHash,
        decision: "approved",
        comment: "Approved for the customer",
      }),
    );
    const projects = listDemoProjects().length;
    const jobs = listDemoJobs().length;
    const generated = await generateProposalAction(
      form({ estimateId: DEMO_ESTIMATE_ID, estimateVersionId: graph.versionId }),
    );
    expect(generated.notice?.message).toBe("Proposal generated. Delivery was not recorded.");
    const token = generated.reviewPath?.replace("/proposals/", "") ?? "";
    expect(token).not.toBe("");
    const stored = (await listProposals(DEMO_ESTIMATE_ID)).find(
      (proposal) => proposal.estimateVersionId === graph.versionId,
    );
    expect(stored?.tokenHash).toBe(hashProposalToken(token));
    expect(JSON.stringify(stored)).not.toContain(token);
    const generatedEvents = stored ? await listProposalEvents(stored.id) : [];
    expect(generatedEvents.map((event) => event.kind)).toEqual(["generated"]);

    const firstView = await openProposalByToken(token);
    const secondView = await openProposalByToken(token);
    expect(firstView.ok).toBe(true);
    expect(secondView.ok).toBe(true);
    const viewed = stored ? await listProposalEvents(stored.id) : [];
    expect(viewed.filter((event) => event.kind === "viewed")).toHaveLength(1);

    const decision = {
      token,
      decision: "accepted",
      recipientName: "Alex Lee",
      recipientEmail: "alex@acme-gc.example",
      attestation: PROPOSAL_ACCEPTANCE_TERMS,
    };
    const accepted = await recordProposalDecision(form(decision));
    const again = await recordProposalDecision(form(decision));
    expect(accepted.notice?.message).toBe("Proposal accepted. Work has not started.");
    expect(again.notice?.message).toBe("This proposal was already accepted.");
    const acceptance = stored ? await getEstimateAcceptance(stored.id) : null;
    expect(acceptance?.contentHash).toBe(graph.contentHash);
    expect(listDemoProjects()).toHaveLength(projects);
    expect(listDemoJobs()).toHaveLength(jobs);
  });
});
