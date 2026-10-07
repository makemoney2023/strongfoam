import { describe, expect, it, vi } from "vitest";
import {
  COMMERCIAL_AI_SYSTEM_INSTRUCTIONS,
  commercialModelTransport,
  deterministicBidProposal,
  recordCommercialDraft,
  requestCommercialProposal,
  type DraftMemory,
} from "@/lib/ops/commercial-ai";
import type { CommercialEvidencePack } from "@/lib/ops/commercial-ai-evidence";

const pack: CommercialEvidencePack = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  opportunityId: "99999999-9999-4999-8999-999999999991",
  opportunityName: "Harbour",
  services: ["spray-foam"],
  company: null,
  contact: null,
  site: null,
  documents: [
    {
      documentVersionId: "ver-1",
      sha256: "sha",
      kind: "specification",
      filename: "spec.pdf",
      pages: [
        {
          id: "page-1",
          pageNumber: 1,
          sheetLabel: "A-201",
          chunks: [
            {
              id: "chunk-qty",
              contentHash: "hash-qty",
              startOffset: 0,
              endOffset: 42,
              text: "Install 2.5 inches of closed-cell foam.",
            },
            {
              id: "chunk-note",
              contentHash: "hash-note",
              startOffset: 0,
              endOffset: 24,
              text: "See architectural drawings.",
            },
          ],
        },
      ],
    },
  ],
  priceRevisions: [
    {
      id: "rev-1",
      itemId: "item-1",
      versionNumber: 1,
      status: "approved",
      trade: "spray-foam",
      description: "Closed-cell",
      unit: "board-foot",
      contentHash: "price-hash",
    },
  ],
  estimateVersion: null,
};

function memory(): DraftMemory {
  return { runs: [], proposals: [], citations: [], toolExecutions: [] };
}

describe("commercial AI gateway", () => {
  it("states that document text is untrusted and the output schema is fixed", () => {
    expect(COMMERCIAL_AI_SYSTEM_INSTRUCTIONS).toContain("untrusted");
    expect(COMMERCIAL_AI_SYSTEM_INSTRUCTIONS).toContain("BidEstimateProposal");
  });

  it("drafts a deterministic proposal without a network call", async () => {
    const transport = vi.fn();
    const drafted = await requestCommercialProposal({ pack, transport });
    expect(transport).not.toHaveBeenCalled();
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    const written = drafted.proposal.lines.find((line) => line.quantitySource === "explicit_written");
    const missing = drafted.proposal.lines.find((line) => line.quantitySource === "manual_required");
    expect(written?.quantity).toEqual({ value: "2.5", unit: "inches" });
    expect(written?.citations[0]?.chunkId).toBe("chunk-qty");
    expect(missing?.quantity).toBeNull();
    expect(drafted.proposal).not.toHaveProperty("totalCents");
    expect(JSON.stringify(drafted.proposal)).not.toMatch(/"markup"|"unitPriceCents"|"totalCents"|"approval"/);
  });

  it("validates a model response against the evidence pack", async () => {
    const proposal = deterministicBidProposal(pack);
    const transport = vi.fn(async () => proposal);
    const drafted = await requestCommercialProposal({
      pack,
      model: "commercial-test",
      transport,
    });
    expect(transport).toHaveBeenCalledOnce();
    expect(drafted.ok).toBe(true);
  });

  it("replays the original proposal for the same idempotency key", async () => {
    const drafted = deterministicBidProposal(pack);
    const state = memory();
    const first = await recordCommercialDraft({
      memory: state,
      organizationId: pack.organizationId,
      opportunityId: pack.opportunityId,
      actorEmail: "admin@strongfoam.demo",
      idempotencyKey: "draft-1",
      selectedSourceIds: ["ver-1"],
      pack,
      proposal: drafted,
      model: null,
      provider: "deterministic",
    });
    const second = await recordCommercialDraft({
      memory: state,
      organizationId: pack.organizationId,
      opportunityId: pack.opportunityId,
      actorEmail: "admin@strongfoam.demo",
      idempotencyKey: "draft-1",
      selectedSourceIds: ["ver-1"],
      pack,
      proposal: { ...drafted, summary: "different" },
      model: null,
      provider: "deterministic",
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.replayed).toBe(true);
    expect(second.proposalId).toBe(first.proposalId);
    expect(state.proposals).toHaveLength(1);
    expect(JSON.stringify(state.runs[0])).not.toMatch(/chainOfThought|reasoning/);
  });
});

describe("commercial model transport", () => {
  const request = { model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", system: "system", pack };

  it("asks the named opportunity instance of the agent and does not call fetch", async () => {
    const draft = vi.fn(async () => '```json\n{"lines":[]}\n```');
    const stub = { __unsafe_ensureInitialized: vi.fn(async () => undefined), draft };
    const agentNamespace = { idFromName: vi.fn((name: string) => name), get: vi.fn(() => stub) };
    const fetchImpl = vi.fn();
    const output = await commercialModelTransport(request, { agentNamespace, fetchImpl });
    expect(output).toEqual({ lines: [] });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(agentNamespace.idFromName).toHaveBeenCalledWith(
      `org:${pack.organizationId}:opportunity:${pack.opportunityId}`,
    );
    expect(draft).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: "commercial_proposal",
        model: request.model,
        json: true,
        messages: [
          { role: "system", content: "system" },
          { role: "user", content: JSON.stringify(pack) },
        ],
      }),
    );
  });

  it("uses the gateway over HTTP when there is no agent binding", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '{"lines":[]}' } }] }), {
          status: 200,
        }),
    ) as unknown as typeof fetch;
    await expect(commercialModelTransport(request, { fetchImpl })).resolves.toEqual({ lines: [] });
  });

  it("reports model-unavailable when the agent returns nothing", async () => {
    const stub = {
      __unsafe_ensureInitialized: vi.fn(async () => undefined),
      draft: vi.fn(async () => ""),
    };
    await expect(
      commercialModelTransport(request, {
        agentNamespace: { idFromName: (name: string) => name, get: () => stub },
      }),
    ).rejects.toThrow("model-unavailable");
  });
});
