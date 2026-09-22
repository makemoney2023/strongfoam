import { describe, expect, it } from "vitest";
import { deterministicBidProposal } from "@/lib/ops/commercial-ai";
import type { CommercialEvidencePack } from "@/lib/ops/commercial-ai-evidence";
import { buildAppliedEstimateDraft, prepareEstimateVersion } from "@/lib/ops/estimates";

const pack: CommercialEvidencePack = {
  organizationId: "org-1",
  opportunityId: "opp-1",
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
              id: "chunk-1",
              contentHash: "hash-1",
              startOffset: 0,
              endOffset: 18,
              text: "Foam thickness 2.5 inches.",
            },
          ],
        },
      ],
    },
  ],
  priceRevisions: [],
  estimateVersion: null,
};

const proposal = deterministicBidProposal(pack);
const revision = {
  id: "price-1",
  itemId: "item-1",
  organizationId: "org-1",
  status: "approved",
  active: true,
  trade: "spray-foam",
  description: "Closed-cell",
  unit: "board-foot",
  unitPriceCents: 18500,
};

function apply(overrides: Partial<Parameters<typeof buildAppliedEstimateDraft>[0]> = {}) {
  return buildAppliedEstimateDraft({
    organizationId: "org-1",
    estimateOrganizationId: "org-1",
    estimateId: "est-1",
    opportunityId: "opp-1",
    createdBy: "estimator@strongfoam.demo",
    baseVersionNumber: 1,
    latestVersionNumber: 1,
    overheadBasisPoints: 0,
    markupBasisPoints: 1000,
    taxBasisPoints: 1300,
    proposal,
    storedCitations: [{ chunkId: "chunk-1", contentHash: "hash-1" }],
    revisions: [revision],
    selections: [{ kind: "line", index: 0, quantity: "2.5", priceBookVersionId: "price-1" }],
    ...overrides,
  });
}

describe("apply bid estimate proposal", () => {
  it("turns a confirmed line into the manual version draft", () => {
    const applied = apply();
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.draft.lines[0]).toMatchObject({
      quantity: "2.5",
      priceBookVersionId: "price-1",
      unitPriceCents: null,
    });
    const prepared = prepareEstimateVersion(applied.draft, {
      revisions: [revision],
      citations: [
        {
          id: "chunk-1",
          organizationId: "org-1",
          documentVersionId: "ver-1",
          pageNumber: 1,
          contentHash: "hash-1",
          startOffset: 0,
          endOffset: 18,
        },
      ],
      existingVersionNumbers: [1],
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.version.lines[0]?.lineTotalCents).toBe(46250);
  });

  it("leaves an unconfirmed quantity unpriced", () => {
    const applied = apply({
      selections: [{ kind: "line", index: 0, quantity: null, priceBookVersionId: null }],
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.draft.lines).toEqual([]);
    expect(applied.draft.clauses[0]?.text).toContain("Takeoff required");
  });

  it("rejects a stale base, a changed citation, a retired price, and another organization", () => {
    expect(apply({ baseVersionNumber: 1, latestVersionNumber: 2 }).ok).toBe(false);
    expect(apply({ storedCitations: [{ chunkId: "chunk-1", contentHash: "changed" }] }).ok).toBe(false);
    expect(apply({ revisions: [{ ...revision, active: false }] }).ok).toBe(true);
    const retired = apply({ revisions: [{ ...revision, active: false }] });
    if (retired.ok) expect(retired.draft.lines).toEqual([]);
    expect(apply({ estimateOrganizationId: "org-2" }).ok).toBe(false);
  });
});
