import {
  assertSameOrganization,
  resolveCommercialAccess,
  type CommercialActor,
} from "@/lib/ops/commercial-authorization";

export const COMMERCIAL_EVIDENCE_BUDGET = {
  maxTokens: 8000,
  maxChunks: 80,
  maxPages: 40,
} as const;

export type CommercialEvidenceBudget = {
  maxTokens: number;
  maxChunks: number;
  maxPages: number;
};

export type CommercialEvidenceInput = {
  organizationId: string;
  opportunityId: string;
  mode: "new" | "revision";
  selectedDocumentVersionIds: string[];
  tokenBudget: CommercialEvidenceBudget;
  opportunity: {
    id: string;
    organizationId: string;
    name: string;
    services: string[];
    companyId: string | null;
    contactId: string | null;
    siteId: string | null;
  } | null;
  companies: Array<{ id: string; organizationId: string; name: string }>;
  contacts: Array<{ id: string; organizationId: string; name: string }>;
  sites: Array<{ id: string; organizationId: string; name: string }>;
  estimates: Array<{ id: string; organizationId: string; opportunityId: string }>;
  estimateVersion: {
    id: string;
    organizationId: string;
    opportunityId: string;
    versionNumber: number;
    contentHash: string;
  } | null;
  links: Array<{
    organizationId: string;
    documentVersionId: string;
    entityType: string;
    entityId: string;
    purpose: string;
  }>;
  versions: Array<{
    id: string;
    organizationId: string;
    documentId: string;
    versionNumber: number;
    status: string;
    kind: string;
    sha256: string | null;
    filename: string;
    pathname?: string;
    sizeBytes?: number;
  }>;
  extractions: Array<{
    id: string;
    organizationId: string;
    documentVersionId: string;
    status: string;
  }>;
  pages: Array<{
    id: string;
    organizationId: string;
    documentVersionId: string;
    extractionId: string;
    pageNumber: number;
    sheetLabel: string | null;
    machineText: string;
    correctedText: string | null;
  }>;
  chunks: Array<{
    id: string;
    organizationId: string;
    documentVersionId: string;
    pageId: string;
    startOffset: number;
    endOffset: number;
    contentHash: string;
    text: string;
  }>;
  priceItems: Array<{ id: string; organizationId: string; active: boolean }>;
  priceRevisions: Array<{
    id: string;
    organizationId: string;
    itemId: string;
    versionNumber: number;
    status: string;
    trade: string;
    description: string;
    unit: string;
    unitPriceCents: number;
    contentHash: string;
  }>;
};

export type CommercialEvidencePack = {
  organizationId: string;
  opportunityId: string;
  opportunityName: string;
  services: string[];
  company: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  site: { id: string; name: string } | null;
  documents: Array<{
    documentVersionId: string;
    sha256: string | null;
    kind: string;
    filename: string;
    pages: Array<{
      id: string;
      pageNumber: number;
      sheetLabel: string | null;
      chunks: Array<{
        id: string;
        contentHash: string;
        startOffset: number;
        endOffset: number;
        text: string;
      }>;
    }>;
  }>;
  priceRevisions: Array<{
    id: string;
    itemId: string;
    versionNumber: number;
    status: "approved";
    trade: string;
    description: string;
    unit: string;
    contentHash: string;
  }>;
  estimateVersion: { id: string; versionNumber: number; contentHash: string } | null;
};

function tokensFor(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function kindRank(kind: string): number {
  if (kind === "specification" || kind === "addendum") return 0;
  if (kind === "plan") return 1;
  return 2;
}

function sameOrg<T extends { organizationId: string }>(rows: T[], organizationId: string): T[] {
  return rows.filter((row) => row.organizationId === organizationId);
}

export function buildCommercialEvidencePack(
  actor: CommercialActor,
  input: CommercialEvidenceInput,
): { ok: true; pack: CommercialEvidencePack } | { ok: false; error: string } {
  const access = resolveCommercialAccess(actor, "estimate.edit");
  if (!access.ok) return access;
  const same = assertSameOrganization(access.organizationId, input.organizationId);
  if (!same.ok) return same;
  const opportunity = input.opportunity;
  if (!opportunity || opportunity.id !== input.opportunityId) {
    return { ok: false, error: "That opportunity could not be found." };
  }
  const opportunitySame = assertSameOrganization(
    input.organizationId,
    opportunity.organizationId,
  );
  if (!opportunitySame.ok) return opportunitySame;

  const selected = new Set(input.selectedDocumentVersionIds);
  const estimateIds = new Set(
    sameOrg(input.estimates, input.organizationId)
      .filter((estimate) => estimate.opportunityId === input.opportunityId)
      .map((estimate) => estimate.id),
  );
  const readyExtractionIds = new Set(
    sameOrg(input.extractions, input.organizationId)
      .filter((extraction) => extraction.status === "ready")
      .map((extraction) => extraction.id),
  );
  const versions = sameOrg(input.versions, input.organizationId).filter((version) => {
    if (!selected.has(version.id) || version.status !== "clean" || version.kind === "photo") {
      return false;
    }
    const links = sameOrg(input.links, input.organizationId).filter(
      (link) => link.documentVersionId === version.id && link.organizationId === input.organizationId,
    );
    const commercial = links.some(
      (link) =>
        (link.entityType === "opportunity" &&
          link.entityId === input.opportunityId &&
          (link.purpose === "bid-package" || link.purpose === "estimate-source")) ||
        (link.entityType === "estimate" &&
          estimateIds.has(link.entityId) &&
          link.purpose !== "field-photo" &&
          !link.purpose.startsWith("field")),
    );
    const fieldOnly =
      links.length > 0 &&
      links.every(
        (link) => link.purpose.startsWith("field") || link.entityType === "job" || version.kind === "photo",
      );
    const ready = sameOrg(input.extractions, input.organizationId).some(
      (extraction) =>
        extraction.documentVersionId === version.id && extraction.status === "ready",
    );
    return commercial && !fieldOnly && ready;
  });
  versions.sort(
    (left, right) => kindRank(left.kind) - kindRank(right.kind) || left.filename.localeCompare(right.filename),
  );

  const pages = sameOrg(input.pages, input.organizationId).filter((page) =>
    readyExtractionIds.has(page.extractionId),
  );
  const pageById = new Map(pages.map((page) => [page.id, page]));
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const chunks = sameOrg(input.chunks, input.organizationId)
    .filter((item) => {
      const page = pageById.get(item.pageId);
      return Boolean(page && versionById.has(item.documentVersionId) && page.documentVersionId === item.documentVersionId);
    })
    .sort((left, right) => {
      const leftVersion = versionById.get(left.documentVersionId);
      const rightVersion = versionById.get(right.documentVersionId);
      const leftPage = pageById.get(left.pageId);
      const rightPage = pageById.get(right.pageId);
      return (
        kindRank(leftVersion?.kind ?? "other") - kindRank(rightVersion?.kind ?? "other") ||
        (leftPage?.pageNumber ?? 0) - (rightPage?.pageNumber ?? 0) ||
        left.startOffset - right.startOffset
      );
    });

  const included = new Map<string, Set<string>>();
  let usedTokens = 0;
  let usedChunks = 0;
  const usedPages = new Set<string>();
  for (const item of chunks) {
    const page = pageById.get(item.pageId);
    if (!page) continue;
    const nextTokens = usedTokens + tokensFor(item.text);
    const nextPage = usedPages.has(page.id) ? usedPages.size : usedPages.size + 1;
    if (
      usedChunks + 1 > input.tokenBudget.maxChunks ||
      nextTokens > input.tokenBudget.maxTokens ||
      nextPage > input.tokenBudget.maxPages
    ) {
      continue;
    }
    usedTokens = nextTokens;
    usedChunks += 1;
    usedPages.add(page.id);
    const chunkIds = included.get(item.documentVersionId) ?? new Set<string>();
    chunkIds.add(item.id);
    included.set(item.documentVersionId, chunkIds);
  }

  const documents = versions.flatMap((version) => {
    const chunkIds = included.get(version.id);
    if (!chunkIds) return [];
    const versionPages = pages
      .filter((page) => page.documentVersionId === version.id)
      .sort((left, right) => left.pageNumber - right.pageNumber)
      .flatMap((page) => {
        const pageChunks = chunks.filter(
          (item) => item.pageId === page.id && chunkIds.has(item.id),
        );
        if (!pageChunks.length) return [];
        return [
          {
            id: page.id,
            pageNumber: page.pageNumber,
            sheetLabel: page.sheetLabel,
            chunks: pageChunks.map((item) => ({
              id: item.id,
              contentHash: item.contentHash,
              startOffset: item.startOffset,
              endOffset: item.endOffset,
              text: item.text,
            })),
          },
        ];
      });
    if (!versionPages.length) return [];
    return [
      {
        documentVersionId: version.id,
        sha256: version.sha256,
        kind: version.kind,
        filename: version.filename,
        pages: versionPages,
      },
    ];
  });

  const activeItems = new Set(
    sameOrg(input.priceItems, input.organizationId)
      .filter((item) => item.active)
      .map((item) => item.id),
  );
  const priceRevisions = sameOrg(input.priceRevisions, input.organizationId)
    .filter((revision) => revision.status === "approved" && activeItems.has(revision.itemId))
    .map((revision) => ({
      id: revision.id,
      itemId: revision.itemId,
      versionNumber: revision.versionNumber,
      status: "approved" as const,
      trade: revision.trade,
      description: revision.description,
      unit: revision.unit,
      contentHash: revision.contentHash,
    }));

  const estimateVersion =
    input.mode === "revision" &&
    input.estimateVersion &&
    input.estimateVersion.organizationId === input.organizationId &&
    input.estimateVersion.opportunityId === input.opportunityId
      ? {
          id: input.estimateVersion.id,
          versionNumber: input.estimateVersion.versionNumber,
          contentHash: input.estimateVersion.contentHash,
        }
      : null;

  const company =
    sameOrg(input.companies, input.organizationId).find((item) => item.id === opportunity.companyId) ??
    null;
  const contact =
    sameOrg(input.contacts, input.organizationId).find((item) => item.id === opportunity.contactId) ??
    null;
  const site =
    sameOrg(input.sites, input.organizationId).find((item) => item.id === opportunity.siteId) ?? null;

  return {
    ok: true,
    pack: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      opportunityName: opportunity.name,
      services: [...opportunity.services],
      company: company ? { id: company.id, name: company.name } : null,
      contact: contact ? { id: contact.id, name: contact.name } : null,
      site: site ? { id: site.id, name: site.name } : null,
      documents,
      priceRevisions,
      estimateVersion,
    },
  };
}
