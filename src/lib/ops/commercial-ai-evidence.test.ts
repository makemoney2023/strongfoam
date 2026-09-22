import { describe, expect, it } from "vitest";
import { buildCommercialEvidencePack } from "@/lib/ops/commercial-ai-evidence";

const ORG = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000099";
const OPP = "99999999-9999-4999-8999-999999999991";

const office = { role: "office" as const, organizationId: ORG };
const field = { role: "field_worker" as const, organizationId: ORG };

function records(extra: Partial<Parameters<typeof buildCommercialEvidencePack>[1]> = {}) {
  return {
    organizationId: ORG,
    opportunityId: OPP,
    mode: "new" as const,
    selectedDocumentVersionIds: ["ver-spec", "ver-plan"],
    tokenBudget: { maxTokens: 40, maxChunks: 8, maxPages: 4 },
    opportunity: {
      id: OPP,
      organizationId: ORG,
      name: "Harbour",
      services: ["spray-foam"],
      companyId: "co-1",
      contactId: "ct-1",
      siteId: "site-1",
    },
    companies: [{ id: "co-1", organizationId: ORG, name: "Acme" }],
    contacts: [{ id: "ct-1", organizationId: ORG, name: "Pat" }],
    sites: [{ id: "site-1", organizationId: ORG, name: "Waterloo yard" }],
    estimates: [{ id: "est-1", organizationId: ORG, opportunityId: OPP }],
    estimateVersion: {
      id: "ver-est",
      organizationId: ORG,
      opportunityId: OPP,
      versionNumber: 2,
      contentHash: "estimate-hash",
    },
    links: [
      link("ver-spec", "opportunity", OPP, "bid-package"),
      link("ver-plan", "opportunity", OPP, "bid-package"),
      link("ver-old", "opportunity", OPP, "bid-package"),
      link("ver-quar", "opportunity", OPP, "bid-package"),
      link("ver-fail", "opportunity", OPP, "bid-package"),
      link("ver-field", "job", "job-1", "field-photo"),
      link("ver-other", "opportunity", OPP, "bid-package"),
    ],
    versions: [
      version("ver-spec", "specification", "clean", 1, "spec-sha"),
      version("ver-plan", "plan", "clean", 1, "plan-sha"),
      version("ver-old", "plan", "clean", 2, "old-sha"),
      version("ver-quar", "plan", "quarantined", 1, "quar-sha"),
      version("ver-fail", "addendum", "clean", 1, "fail-sha"),
      version("ver-field", "photo", "clean", 1, "field-sha"),
      version("ver-other", "specification", "clean", 1, "other-sha", OTHER),
    ],
    extractions: [
      extraction("ex-spec", "ver-spec", "ready"),
      extraction("ex-plan", "ver-plan", "ready"),
      extraction("ex-old", "ver-old", "ready"),
      extraction("ex-quar", "ver-quar", "ready"),
      extraction("ex-fail", "ver-fail", "failed"),
      extraction("ex-field", "ver-field", "ready"),
      extraction("ex-other", "ver-other", "ready", OTHER),
    ],
    pages: [
      page("page-spec", "ver-spec", "ex-spec", 1, "S-1"),
      page("page-plan", "ver-plan", "ex-plan", 1, "A-201"),
      page("page-plan-2", "ver-plan", "ex-plan", 2, "A-202"),
      page("page-old", "ver-old", "ex-old", 1, "A-100"),
      page("page-fail", "ver-fail", "ex-fail", 1, "AD-1"),
      page("page-other", "ver-other", "ex-other", 1, "X-1", OTHER),
    ],
    chunks: [
      chunk("chunk-spec", "ver-spec", "page-spec", "spec-hash", "Closed-cell foam 2.5 inches."),
      chunk("chunk-plan", "ver-plan", "page-plan", "plan-hash", "Title block note: AVB at north elevation."),
      chunk("chunk-plan-2", "ver-plan", "page-plan-2", "plan-hash-2", "Second plan sheet with a long note that should lose the budget."),
      chunk("chunk-old", "ver-old", "page-old", "old-hash", "Superseded plan note."),
      chunk("chunk-fail", "ver-fail", "page-fail", "fail-hash", "Addendum that failed extraction."),
      chunk("chunk-other", "ver-other", "page-other", "other-hash", "Foreign organization text.", OTHER),
    ],
    priceItems: [
      { id: "item-live", organizationId: ORG, active: true },
      { id: "item-retired", organizationId: ORG, active: false },
      { id: "item-other", organizationId: OTHER, active: true },
    ],
    priceRevisions: [
      revision("rev-live", "item-live", "approved", "live-hash"),
      revision("rev-draft", "item-live", "draft", "draft-hash"),
      revision("rev-retired", "item-retired", "approved", "retired-hash"),
      revision("rev-other", "item-other", "approved", "other-price-hash", OTHER),
    ],
    ...extra,
  };
}

function link(documentVersionId: string, entityType: string, entityId: string, purpose: string) {
  return { organizationId: ORG, documentVersionId, entityType, entityId, purpose };
}

function version(
  id: string,
  kind: string,
  status: string,
  versionNumber: number,
  sha256: string,
  organizationId = ORG,
) {
  return {
    id,
    organizationId,
    documentId: `doc-${id}`,
    versionNumber,
    status,
    kind,
    sha256,
    filename: `${id}.pdf`,
    pathname: `secret/${id}.pdf`,
    sizeBytes: 99999,
  };
}

function extraction(id: string, documentVersionId: string, status: string, organizationId = ORG) {
  return { id, organizationId, documentVersionId, status };
}

function page(
  id: string,
  documentVersionId: string,
  extractionId: string,
  pageNumber: number,
  sheetLabel: string,
  organizationId = ORG,
) {
  return {
    id,
    organizationId,
    documentVersionId,
    extractionId,
    pageNumber,
    sheetLabel,
    machineText: "machine",
    correctedText: null,
  };
}

function chunk(
  id: string,
  documentVersionId: string,
  pageId: string,
  contentHash: string,
  text: string,
  organizationId = ORG,
) {
  return {
    id,
    organizationId,
    documentVersionId,
    pageId,
    startOffset: 0,
    endOffset: text.length,
    contentHash,
    text,
  };
}

function revision(
  id: string,
  itemId: string,
  status: string,
  contentHash: string,
  organizationId = ORG,
) {
  return {
    id,
    organizationId,
    itemId,
    versionNumber: 1,
    status,
    trade: "spray-foam",
    description: id,
    unit: "board-foot",
    unitPriceCents: 18500,
    contentHash,
  };
}

describe("commercial evidence pack", () => {
  it("refuses readers who cannot edit estimates", () => {
    const packed = buildCommercialEvidencePack(field, records());
    expect(packed.ok).toBe(false);
  });

  it("keeps the requested organization and selected ready evidence", () => {
    const packed = buildCommercialEvidencePack(office, records());
    expect(packed.ok).toBe(true);
    if (!packed.ok) return;
    expect(packed.pack.organizationId).toBe(ORG);
    expect(packed.pack.opportunityId).toBe(OPP);
    expect(packed.pack.company?.name).toBe("Acme");
    const versionIds = packed.pack.documents.map((document) => document.documentVersionId);
    expect(versionIds).toEqual(["ver-spec", "ver-plan"]);
    expect(JSON.stringify(packed.pack)).not.toContain(OTHER);
    expect(JSON.stringify(packed.pack)).not.toContain("secret/");
    expect(JSON.stringify(packed.pack.documents)).not.toContain("sizeBytes");
    expect(JSON.stringify(packed.pack.documents)).not.toContain("pathname");
    expect(packed.pack.estimateVersion).toBeNull();
  });

  it("drops quarantined, failed, unselected, and field-only versions", () => {
    const packed = buildCommercialEvidencePack(
      office,
      records({ selectedDocumentVersionIds: ["ver-spec", "ver-quar", "ver-fail", "ver-field"] }),
    );
    expect(packed.ok).toBe(true);
    if (!packed.ok) return;
    expect(packed.pack.documents.map((document) => document.documentVersionId)).toEqual(["ver-spec"]);
  });

  it("prefers specification text and stops at the token and page budget", () => {
    const packed = buildCommercialEvidencePack(
      office,
      records({
        tokenBudget: { maxTokens: 12, maxChunks: 1, maxPages: 1 },
      }),
    );
    expect(packed.ok).toBe(true);
    if (!packed.ok) return;
    const chunks = packed.pack.documents.flatMap((document) =>
      document.pages.flatMap((page) => page.chunks),
    );
    expect(chunks.map((item) => item.id)).toEqual(["chunk-spec"]);
    expect(chunks[0]).toMatchObject({
      id: "chunk-spec",
      contentHash: "spec-hash",
      startOffset: 0,
      endOffset: "Closed-cell foam 2.5 inches.".length,
    });
  });

  it("includes only active approved price revisions and their hashes", () => {
    const packed = buildCommercialEvidencePack(office, records());
    expect(packed.ok).toBe(true);
    if (!packed.ok) return;
    expect(packed.pack.priceRevisions).toEqual([
      expect.objectContaining({
        id: "rev-live",
        itemId: "item-live",
        contentHash: "live-hash",
        status: "approved",
      }),
    ]);
    expect(JSON.stringify(packed.pack.priceRevisions)).not.toContain("18500");
  });

  it("includes the current estimate version only when revising", () => {
    const packed = buildCommercialEvidencePack(office, records({ mode: "revision" }));
    expect(packed.ok).toBe(true);
    if (!packed.ok) return;
    expect(packed.pack.estimateVersion).toEqual({
      id: "ver-est",
      versionNumber: 2,
      contentHash: "estimate-hash",
    });
  });

  it("returns no documents when nothing was selected", () => {
    const packed = buildCommercialEvidencePack(
      office,
      records({ selectedDocumentVersionIds: [] }),
    );
    expect(packed.ok).toBe(true);
    if (!packed.ok) return;
    expect(packed.pack.documents).toEqual([]);
  });
});
