import { describe, expect, it } from "vitest";
import { DEMO_OPEN_OPPORTUNITY_ID } from "@/lib/ops/demo-data";
import {
  listDemoJobs,
  listDemoProjects,
  recordDemoQuarantinedBidDocument,
} from "@/lib/ops/demo-store";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import {
  addDocumentLink,
  appendDocumentVersion,
  findDuplicateDocumentVersion,
  hasAllowedBidDocumentSignature,
  isOwnedOpportunityPath,
  nextDocumentVersion,
  parseBidDocumentInput,
  validateCitation,
  type DocumentCitation,
} from "@/lib/ops/commercial-documents";

const validPdf = {
  filename: "podium-plan.pdf",
  contentType: "application/pdf",
  sizeBytes: 2048,
  kind: "plan",
  revisionLabel: "Addendum 2",
};

const citation: DocumentCitation = {
  documentVersionId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
  pageNumber: 2,
  sheetLabel: "A-201",
  chunkId: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
  contentHash: "abc123",
  startOffset: 0,
  endOffset: 40,
  bbox: null,
};

describe("bid document input", () => {
  it("accepts a PDF plan and rejects an unknown kind", () => {
    expect(parseBidDocumentInput(validPdf).ok).toBe(true);
    expect(parseBidDocumentInput({ ...validPdf, kind: "invoice" }).ok).toBe(
      false,
    );
  });

  it("checks file signatures for PDF, JPEG, PNG, and WebP", () => {
    expect(
      hasAllowedBidDocumentSignature(
        new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
        "application/pdf",
      ),
    ).toBe(true);
    expect(
      hasAllowedBidDocumentSignature(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        "application/pdf",
      ),
    ).toBe(false);
  });
});

describe("immutable document versions", () => {
  it("numbers the next revision from the existing versions", () => {
    expect(nextDocumentVersion([{ versionNumber: 1 }, { versionNumber: 2 }])).toBe(
      3,
    );
  });

  it("appends a quarantined version without changing the previous one", () => {
    const existing = [
      {
        id: "version-1",
        versionNumber: 1,
        pathname: "opportunities/org-a/opp-a/version-1/plan.pdf",
        status: "clean" as const,
      },
    ];
    const result = appendDocumentVersion(existing, {
      id: "version-2",
      pathname: "opportunities/org-a/opp-a/version-2/plan.pdf",
    });
    expect(result.created.versionNumber).toBe(2);
    expect(result.created.status).toBe("quarantined");
    expect(existing[0]?.pathname).toBe(
      "opportunities/org-a/opp-a/version-1/plan.pdf",
    );
  });

  it("reuses a version with the same SHA-256 inside the organization", () => {
    const versions = [
      {
        id: "version-1",
        organizationId: "org-a",
        sha256: "same-hash",
      },
      {
        id: "version-2",
        organizationId: "org-b",
        sha256: "same-hash",
      },
    ];
    expect(findDuplicateDocumentVersion(versions, "org-a", "same-hash")?.id).toBe(
      "version-1",
    );
    expect(findDuplicateDocumentVersion(versions, "org-a", "other-hash")).toBeNull();
  });
});

describe("document links and citations", () => {
  it("rejects a link or citation from another organization", () => {
    expect(
      addDocumentLink([], {
        organizationId: "org-a",
        versionOrganizationId: "org-b",
        documentVersionId: citation.documentVersionId,
        entityType: "opportunity",
        entityId: "opp-a",
        purpose: "bid-package",
      }).ok,
    ).toBe(false);

    const wrongOrganization = {
      organizationId: "org-b",
      version: {
        id: citation.documentVersionId,
        organizationId: "org-a",
      },
      chunk: {
        id: citation.chunkId,
        organizationId: "org-a",
        documentVersionId: citation.documentVersionId,
        pageNumber: citation.pageNumber,
        contentHash: citation.contentHash,
        startOffset: citation.startOffset,
        endOffset: citation.endOffset,
      },
    };
    expect(validateCitation(citation, wrongOrganization).ok).toBe(false);
  });

  it("accepts a citation that matches the stored chunk and organization", () => {
    expect(
      validateCitation(citation, {
        organizationId: "org-a",
        version: {
          id: citation.documentVersionId,
          organizationId: "org-a",
        },
        chunk: {
          id: citation.chunkId,
          organizationId: "org-a",
          documentVersionId: citation.documentVersionId,
          pageNumber: citation.pageNumber,
          contentHash: citation.contentHash,
          startOffset: citation.startOffset,
          endOffset: citation.endOffset,
        },
      }).ok,
    ).toBe(true);
  });
});

describe("quarantine does not create operational records", () => {
  it("keeps the opportunity without a project or job", () => {
    const projects = listDemoProjects().length;
    const jobs = listDemoJobs().length;
    const recorded = recordDemoQuarantinedBidDocument({
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      documentId: null,
      actor: "office@strongfoam.demo",
      input: {
        filename: "harbour-plan.pdf",
        contentType: "application/pdf",
        sizeBytes: 128,
        kind: "plan",
        revisionLabel: null,
      },
      pathname: `opportunities/${STRONG_FOAM_ORGANIZATION_ID}/${DEMO_OPEN_OPPORTUNITY_ID}/harbour-plan.pdf`,
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
    });
    expect(recorded?.versionId).toBeTruthy();
    expect(listDemoProjects()).toHaveLength(projects);
    expect(listDemoJobs()).toHaveLength(jobs);
  });
});

describe("opportunity upload paths", () => {
  const validPath = "opportunities/org-a/opp-a/version-1/podium-plan.pdf";

  it("accepts only a path owned by that organization and opportunity", () => {
    expect(isOwnedOpportunityPath("org-a", "opp-a", validPath)).toBe(true);
    expect(isOwnedOpportunityPath("org-a", "opp-b", validPath)).toBe(false);
    expect(
      isOwnedOpportunityPath("org-a", "opp-a", "../secrets/podium-plan.pdf"),
    ).toBe(false);
  });
});
