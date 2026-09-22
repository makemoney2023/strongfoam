import {
  ALLOWED_UPLOAD_TYPES,
  isAllowedUploadContentType,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
} from "@/lib/leads/uploads";
import { hasAllowedJobDocumentSignature } from "@/lib/ops/job-workspace";

export const BID_DOCUMENT_KINDS = [
  "plan",
  "specification",
  "addendum",
  "schedule",
  "photo",
  "other",
] as const;

export type BidDocumentKind = (typeof BID_DOCUMENT_KINDS)[number];

export const BID_DOCUMENT_LABELS: Record<BidDocumentKind, string> = {
  plan: "Plan",
  specification: "Specification",
  addendum: "Addendum",
  schedule: "Schedule",
  photo: "Photo",
  other: "Other",
};

export const DOCUMENT_VERSION_STATUSES = [
  "quarantined",
  "clean",
  "rejected",
] as const;

export type DocumentVersionStatus = (typeof DOCUMENT_VERSION_STATUSES)[number];

export const DOCUMENT_LINK_ENTITY_TYPES = [
  "request",
  "opportunity",
  "estimate",
  "project",
  "job",
] as const;

export type DocumentLinkEntityType = (typeof DOCUMENT_LINK_ENTITY_TYPES)[number];

export const MAX_BID_UPLOAD_FILES = MAX_UPLOAD_FILES;

const CONTENT_TYPE_EXTENSIONS: Record<string, readonly string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export type BidDocumentInput = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  kind: BidDocumentKind;
  revisionLabel: string | null;
};

export type DocumentCitation = {
  documentVersionId: string;
  pageNumber: number;
  sheetLabel: string | null;
  chunkId: string;
  contentHash: string;
  startOffset: number;
  endOffset: number;
  bbox: { x: number; y: number; width: number; height: number } | null;
};

export type CitationScope = {
  organizationId: string;
  version: { id: string; organizationId: string } | null;
  chunk: {
    id: string;
    organizationId: string;
    documentVersionId: string;
    pageNumber: number;
    contentHash: string;
    startOffset: number;
    endOffset: number;
  } | null;
};

export function isBidDocumentKind(value: string): value is BidDocumentKind {
  return BID_DOCUMENT_KINDS.includes(value as BidDocumentKind);
}

export function sanitizeBidFilename(filename: string): string | null {
  const trimmed = filename.trim();
  if (!trimmed || trimmed.length > 180) return null;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;
  if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
    return null;
  }
  return trimmed;
}

export function parseBidDocumentInput(input: {
  filename?: string;
  contentType?: string;
  sizeBytes?: number;
  kind?: string;
  revisionLabel?: string | null;
}): { ok: true; value: BidDocumentInput } | { ok: false; error: string } {
  const filename = sanitizeBidFilename(input.filename ?? "");
  if (!filename) return { ok: false, error: "A document filename is required." };
  const contentType = input.contentType ?? "";
  if (!isAllowedUploadContentType(contentType)) {
    return { ok: false, error: "Upload a PDF, JPEG, PNG, or WebP file." };
  }
  if (
    !CONTENT_TYPE_EXTENSIONS[contentType]?.some((extension) =>
      filename.toLowerCase().endsWith(extension),
    )
  ) {
    return { ok: false, error: "The filename extension does not match the document type." };
  }
  const sizeBytes = input.sizeBytes ?? 0;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "The document is empty." };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Each document must be 25 MB or smaller." };
  }
  const kind = input.kind?.trim() ?? "";
  if (!isBidDocumentKind(kind)) {
    return { ok: false, error: "Choose a valid document type." };
  }
  const revisionLabel = input.revisionLabel?.trim() || null;
  if (revisionLabel && revisionLabel.length > 80) {
    return { ok: false, error: "Revision labels must be 80 characters or fewer." };
  }
  return { ok: true, value: { filename, contentType, sizeBytes, kind, revisionLabel } };
}

export function hasAllowedBidDocumentSignature(
  bytes: Uint8Array,
  contentType: string,
): boolean {
  return hasAllowedJobDocumentSignature(bytes, contentType);
}

export function nextDocumentVersion(
  versions: readonly { versionNumber: number }[],
): number {
  return versions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;
}

export function appendDocumentVersion<
  T extends { versionNumber: number; pathname: string; status: DocumentVersionStatus },
>(
  existing: readonly T[],
  next: { id: string; pathname: string },
): {
  versions: Array<
    T | { id: string; pathname: string; versionNumber: number; status: "quarantined" }
  >;
  created: { id: string; pathname: string; versionNumber: number; status: "quarantined" };
} {
  const created = {
    id: next.id,
    pathname: next.pathname,
    versionNumber: nextDocumentVersion(existing),
    status: "quarantined" as const,
  };
  return {
    versions: [...existing, created],
    created,
  };
}

export function findDuplicateDocumentVersion<
  T extends { id: string; organizationId: string; sha256: string | null },
>(versions: readonly T[], organizationId: string, sha256: string): T | null {
  return (
    versions.find(
      (version) =>
        version.organizationId === organizationId && version.sha256 === sha256,
    ) ?? null
  );
}

export function isOwnedOpportunityPath(
  organizationId: string,
  opportunityId: string,
  pathname: string,
): boolean {
  if (!organizationId || !opportunityId) return false;
  if (pathname.includes("..") || pathname.startsWith("/") || pathname.includes("\\")) {
    return false;
  }
  return pathname.startsWith(`opportunities/${organizationId}/${opportunityId}/`);
}

export function addDocumentLink(
  links: readonly {
    documentVersionId: string;
    entityType: string;
    entityId: string;
    purpose: string;
  }[],
  input: {
    organizationId: string;
    versionOrganizationId: string;
    documentVersionId: string;
    entityType: DocumentLinkEntityType;
    entityId: string;
    purpose: string;
  },
):
  | { ok: true; link: typeof input }
  | { ok: false; error: string } {
  if (input.organizationId !== input.versionOrganizationId) {
    return { ok: false, error: "That document is outside this organization." };
  }
  if (!DOCUMENT_LINK_ENTITY_TYPES.includes(input.entityType)) {
    return { ok: false, error: "Choose a valid document link." };
  }
  const duplicate = links.some(
    (link) =>
      link.documentVersionId === input.documentVersionId &&
      link.entityType === input.entityType &&
      link.entityId === input.entityId &&
      link.purpose === input.purpose,
  );
  if (duplicate) return { ok: true, link: input };
  return { ok: true, link: input };
}

export function validateCitation(
  citation: DocumentCitation,
  scope: CitationScope,
): { ok: true } | { ok: false; error: string } {
  if (
    !scope.version ||
    scope.version.organizationId !== scope.organizationId ||
    scope.version.id !== citation.documentVersionId
  ) {
    return { ok: false, error: "That citation is outside this organization." };
  }
  if (
    !scope.chunk ||
    scope.chunk.organizationId !== scope.organizationId ||
    scope.chunk.id !== citation.chunkId ||
    scope.chunk.documentVersionId !== citation.documentVersionId ||
    scope.chunk.pageNumber !== citation.pageNumber ||
    scope.chunk.contentHash !== citation.contentHash ||
    scope.chunk.startOffset !== citation.startOffset ||
    scope.chunk.endOffset !== citation.endOffset
  ) {
    return { ok: false, error: "That citation does not match the stored extraction." };
  }
  if (citation.pageNumber < 1 || citation.endOffset <= citation.startOffset) {
    return { ok: false, error: "That citation does not match the stored extraction." };
  }
  return { ok: true };
}

export { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES };
