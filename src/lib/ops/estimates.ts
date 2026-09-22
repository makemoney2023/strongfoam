import { createHash } from "node:crypto";
import type { BidEstimateProposal } from "@/lib/ops/commercial-ai";
import {
  ESTIMATE_CALCULATION_ORDER,
  ESTIMATE_LINE_CATEGORIES,
  EstimateCalculationError,
  calculateEstimate,
  formatQuantity,
  parseQuantityScaled,
  type EstimateLineCategory,
} from "@/lib/ops/estimate-calculator";

export const ESTIMATE_CLAUSE_KINDS = ["inclusion", "exclusion", "assumption"] as const;

export type EstimateClauseKind = (typeof ESTIMATE_CLAUSE_KINDS)[number];

export type EstimatePriceRevision = {
  id: string;
  itemId: string;
  organizationId: string;
  status: string;
  active: boolean;
  trade: string;
  description: string;
  unit: string;
  unitPriceCents: number;
};

export type EstimateCitationChunk = {
  id: string;
  organizationId: string;
  documentVersionId: string;
  pageNumber: number;
  contentHash: string;
  startOffset: number;
  endOffset: number;
};

export type EstimateSourceDraft = {
  id?: string;
  documentVersionId: string;
  pageNumber: number;
  sheetLabel: string | null;
  chunkId: string;
  contentHash: string;
  startOffset: number;
  endOffset: number;
};

export type EstimateLineDraft = {
  id?: string;
  sortOrder: number;
  category: EstimateLineCategory;
  description: string;
  trade: string;
  location: string | null;
  method: "unit" | "fixed" | "percent";
  quantity: string | null;
  unit: string | null;
  unitPriceCents: number | null;
  basisPoints: number | null;
  basisCategories: EstimateLineCategory[];
  taxable: boolean;
  alternateKey: string | null;
  priceBookItemId: string | null;
  priceBookVersionId: string | null;
  clientLineTotalCents?: number;
  sources: EstimateSourceDraft[];
};

export type EstimateVersionDraft = {
  organizationId: string;
  estimateId: string;
  opportunityId: string;
  createdBy: string;
  title?: string;
  versionId?: string;
  overheadBasisPoints: number;
  markupBasisPoints: number;
  taxBasisPoints: number;
  clauses: Array<{
    id?: string;
    kind: EstimateClauseKind;
    text: string;
    sortOrder: number;
  }>;
  alternates: Array<{
    id?: string;
    key: string;
    name: string;
    description: string;
    included: boolean;
    sortOrder: number;
  }>;
  lines: EstimateLineDraft[];
  jobPackages: Array<{
    id?: string;
    key: string;
    name: string;
    trade: string;
    scope: string;
    sortOrder: number;
    workAreas: Array<{
      id?: string;
      key: string;
      name: string;
      kind: string;
      sortOrder: number;
    }>;
    tasks: Array<{
      id?: string;
      title: string;
      workAreaKey: string | null;
      sortOrder: number;
    }>;
  }>;
};

export type PreparedEstimateLine = {
  id: string;
  sortOrder: number;
  category: EstimateLineCategory;
  description: string;
  trade: string;
  location: string | null;
  method: "unit" | "fixed" | "percent";
  quantity: string | null;
  unit: string | null;
  unitPriceCents: number | null;
  basisPoints: number | null;
  basisCategories: EstimateLineCategory[];
  taxable: boolean;
  alternateId: string | null;
  alternateKey: string | null;
  priceBookItemId: string | null;
  priceBookVersionId: string | null;
  lineTotalCents: number;
  includedInTotal: boolean;
};

export type PreparedEstimateVersion = {
  organizationId: string;
  estimateId: string;
  opportunityId: string;
  versionId: string;
  versionNumber: number;
  createdBy: string;
  overheadBasisPoints: number;
  markupBasisPoints: number;
  taxBasisPoints: number;
  calculationOrder: string;
  baseSubtotalCents: number;
  alternateTotalCents: number;
  overheadCents: number;
  markupCents: number;
  taxCents: number;
  totalCents: number;
  contentHash: string;
  clauses: Array<{
    id: string;
    kind: EstimateClauseKind;
    text: string;
    sortOrder: number;
  }>;
  alternates: Array<{
    id: string;
    key: string;
    name: string;
    description: string;
    included: boolean;
    sortOrder: number;
  }>;
  lines: PreparedEstimateLine[];
  sources: Array<EstimateSourceDraft & { id: string; lineId: string }>;
  jobPackages: Array<{
    id: string;
    key: string;
    name: string;
    trade: string;
    scope: string;
    sortOrder: number;
    workAreas: Array<{ id: string; key: string; name: string; kind: string; sortOrder: number }>;
    tasks: Array<{
      id: string;
      title: string;
      workAreaId: string | null;
      sortOrder: number;
    }>;
  }>;
};

export type EstimateDiff = {
  lines: { added: string[]; removed: string[]; changed: string[] };
  clauses: { added: string[]; removed: string[]; changed: string[] };
  alternates: { added: string[]; removed: string[]; changed: string[] };
  jobPackages: { added: string[]; removed: string[]; changed: string[] };
  totals: { fromCents: number; toCents: number; deltaCents: number };
};

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }
  return value;
}

export function nextEstimateNumber(numbers: string[]): string {
  const max = numbers.reduce((highest, number) => {
    const match = /^EST-(\d+)$/.exec(number);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 1000);
  return `EST-${max + 1}`;
}

export function estimateContentHash(content: unknown): string {
  return createHash("sha256").update(JSON.stringify(sortValue(content))).digest("hex");
}

function hashPayload(version: Omit<PreparedEstimateVersion, "contentHash" | "createdBy" | "opportunityId">) {
  return {
    estimateId: version.estimateId,
    versionNumber: version.versionNumber,
    calculationOrder: version.calculationOrder,
    overheadBasisPoints: version.overheadBasisPoints,
    markupBasisPoints: version.markupBasisPoints,
    taxBasisPoints: version.taxBasisPoints,
    baseSubtotalCents: version.baseSubtotalCents,
    alternateTotalCents: version.alternateTotalCents,
    overheadCents: version.overheadCents,
    markupCents: version.markupCents,
    taxCents: version.taxCents,
    totalCents: version.totalCents,
    clauses: [...version.clauses]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((clause) => ({
        id: clause.id,
        kind: clause.kind,
        text: clause.text,
        sortOrder: clause.sortOrder,
      })),
    alternates: [...version.alternates]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((alternate) => ({
        id: alternate.id,
        name: alternate.name,
        description: alternate.description,
        included: alternate.included,
        sortOrder: alternate.sortOrder,
      })),
    lines: [...version.lines]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((line) => ({
        id: line.id,
        category: line.category,
        description: line.description,
        trade: line.trade,
        unit: line.unit,
        method: line.method,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        basisPoints: line.basisPoints,
        basisCategories: [...line.basisCategories].sort(),
        taxable: line.taxable,
        alternateId: line.alternateId,
        priceBookItemId: line.priceBookItemId,
        priceBookVersionId: line.priceBookVersionId,
        lineTotalCents: line.lineTotalCents,
        sortOrder: line.sortOrder,
      })),
    jobPackages: [...version.jobPackages]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        trade: pkg.trade,
        scope: pkg.scope,
        sortOrder: pkg.sortOrder,
        workAreas: [...pkg.workAreas]
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
          .map((area) => ({
            id: area.id,
            name: area.name,
            kind: area.kind,
            sortOrder: area.sortOrder,
          })),
        tasks: [...pkg.tasks]
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
          .map((task) => ({
            id: task.id,
            title: task.title,
            workAreaId: task.workAreaId,
            sortOrder: task.sortOrder,
          })),
      })),
    sources: [...version.sources]
      .sort((a, b) => a.lineId.localeCompare(b.lineId) || a.chunkId.localeCompare(b.chunkId))
      .map((source) => ({
        lineId: source.lineId,
        documentVersionId: source.documentVersionId,
        pageNumber: source.pageNumber,
        chunkId: source.chunkId,
        contentHash: source.contentHash,
        startOffset: source.startOffset,
        endOffset: source.endOffset,
      })),
  };
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function prepareEstimateVersion(
  draft: EstimateVersionDraft,
  context: {
    revisions: EstimatePriceRevision[];
    citations: EstimateCitationChunk[];
    existingVersionNumbers: number[];
  },
): { ok: true; version: PreparedEstimateVersion } | { ok: false; error: string } {
  if (draft.organizationId.length === 0) return fail("organization");
  const alternates = draft.alternates.map((alternate) => ({
    ...alternate,
    id: alternate.id ?? crypto.randomUUID(),
  }));
  const alternateByKey = new Map(alternates.map((alternate) => [alternate.key, alternate]));
  const lines: PreparedEstimateLine[] = [];

  for (const line of draft.lines) {
    if (line.clientLineTotalCents != null) return fail("client-total");
    if (!ESTIMATE_LINE_CATEGORIES.includes(line.category)) return fail("line");
    let unitPriceCents = line.unitPriceCents;
    let priceBookItemId = line.priceBookItemId;
    let quantity = line.quantity;
    if (line.method === "unit") {
      const revision = context.revisions.find(
        (item) =>
          item.id === line.priceBookVersionId &&
          item.organizationId === draft.organizationId,
      );
      if (!revision || revision.status !== "approved" || !revision.active) {
        return fail("unknown-price-revision");
      }
      if (unitPriceCents != null && unitPriceCents !== revision.unitPriceCents) {
        return fail("price");
      }
      unitPriceCents = revision.unitPriceCents;
      priceBookItemId = revision.itemId;
      if (!quantity) return fail("quantity");
      try {
        quantity = formatQuantity(parseQuantityScaled(quantity));
      } catch (error) {
        if (error instanceof EstimateCalculationError) return fail(error.code);
        throw error;
      }
    }
    if (line.alternateKey && !alternateByKey.has(line.alternateKey)) return fail("alternate");
    for (const source of line.sources) {
      const chunk = context.citations.find(
        (item) =>
          item.id === source.chunkId && item.organizationId === draft.organizationId,
      );
      if (
        !chunk ||
        chunk.documentVersionId !== source.documentVersionId ||
        chunk.pageNumber !== source.pageNumber ||
        chunk.contentHash !== source.contentHash ||
        chunk.startOffset !== source.startOffset ||
        chunk.endOffset !== source.endOffset
      ) {
        return fail("citation");
      }
    }
    lines.push({
      id: line.id ?? crypto.randomUUID(),
      sortOrder: line.sortOrder,
      category: line.category,
      description: line.description,
      trade: line.trade,
      location: line.location,
      method: line.method,
      quantity,
      unit: line.unit,
      unitPriceCents,
      basisPoints: line.basisPoints,
      basisCategories: line.basisCategories,
      taxable: line.taxable,
      alternateId: line.alternateKey ? (alternateByKey.get(line.alternateKey)?.id ?? null) : null,
      alternateKey: line.alternateKey,
      priceBookItemId,
      priceBookVersionId: line.priceBookVersionId,
      lineTotalCents: 0,
      includedInTotal: true,
    });
  }

  let calculation;
  try {
    calculation = calculateEstimate({
      overheadBasisPoints: draft.overheadBasisPoints,
      markupBasisPoints: draft.markupBasisPoints,
      taxBasisPoints: draft.taxBasisPoints,
      alternates: alternates.map((alternate) => ({
        key: alternate.key,
        included: alternate.included,
      })),
      lines: lines.map((line) => ({
        key: line.id,
        category: line.category,
        method: line.method,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        basisPoints: line.basisPoints,
        basisCategories: line.basisCategories,
        taxable: line.taxable,
        alternateKey: line.alternateKey,
      })),
    });
  } catch (error) {
    if (error instanceof EstimateCalculationError) return fail(error.code);
    throw error;
  }

  const totalsById = new Map(calculation.lines.map((line) => [line.key, line]));
  for (const line of lines) {
    const calculated = totalsById.get(line.id);
    line.lineTotalCents = calculated?.lineTotalCents ?? 0;
    line.includedInTotal = calculated?.includedInTotal ?? false;
  }

  const jobPackages = draft.jobPackages.map((pkg) => {
    const id = pkg.id ?? crypto.randomUUID();
    const workAreas = pkg.workAreas.map((area) => ({
      ...area,
      id: area.id ?? crypto.randomUUID(),
    }));
    const areaByKey = new Map(workAreas.map((area) => [area.key, area]));
    return {
      id,
      key: pkg.key,
      name: pkg.name,
      trade: pkg.trade,
      scope: pkg.scope,
      sortOrder: pkg.sortOrder,
      workAreas,
      tasks: pkg.tasks.map((task) => ({
        id: task.id ?? crypto.randomUUID(),
        title: task.title,
        workAreaId: task.workAreaKey ? (areaByKey.get(task.workAreaKey)?.id ?? null) : null,
        sortOrder: task.sortOrder,
      })),
    };
  });

  const sources = lines.flatMap((line, index) =>
    draft.lines[index].sources.map((source) => ({
      ...source,
      id: source.id ?? crypto.randomUUID(),
      lineId: line.id,
    })),
  );

  const versionNumber =
    context.existingVersionNumbers.reduce((max, number) => Math.max(max, number), 0) + 1;
  const withoutHash = {
    organizationId: draft.organizationId,
    estimateId: draft.estimateId,
    opportunityId: draft.opportunityId,
    versionId: draft.versionId ?? crypto.randomUUID(),
    versionNumber,
    createdBy: draft.createdBy,
    overheadBasisPoints: draft.overheadBasisPoints,
    markupBasisPoints: draft.markupBasisPoints,
    taxBasisPoints: draft.taxBasisPoints,
    calculationOrder: ESTIMATE_CALCULATION_ORDER.join(","),
    baseSubtotalCents: calculation.baseSubtotalCents,
    alternateTotalCents: calculation.alternateTotalCents,
    overheadCents: calculation.overheadCents,
    markupCents: calculation.markupCents,
    taxCents: calculation.taxCents,
    totalCents: calculation.totalCents,
    clauses: draft.clauses.map((clause) => ({
      id: clause.id ?? crypto.randomUUID(),
      kind: clause.kind,
      text: clause.text,
      sortOrder: clause.sortOrder,
    })),
    alternates,
    lines,
    sources,
    jobPackages,
  };

  return {
    ok: true,
    version: {
      ...withoutHash,
      contentHash: estimateContentHash(hashPayload(withoutHash)),
    },
  };
}

export function rejectEstimateContentMutation(): { ok: false; error: "immutable" } {
  return { ok: false, error: "immutable" };
}

function changedKeys<T>(
  before: T[],
  after: T[],
  key: (item: T) => string,
  label: (item: T) => string,
  same: (left: T, right: T) => boolean,
): { added: string[]; removed: string[]; changed: string[] } {
  const previous = new Map(before.map((item) => [key(item), item]));
  const next = new Map(after.map((item) => [key(item), item]));
  const added = after.filter((item) => !previous.has(key(item))).map(label);
  const removed = before.filter((item) => !next.has(key(item))).map(label);
  const changed = after
    .filter((item) => {
      const prior = previous.get(key(item));
      return prior != null && !same(prior, item);
    })
    .map(label);
  return { added, removed, changed };
}

export function compareEstimateVersions(
  before: PreparedEstimateVersion,
  after: PreparedEstimateVersion,
): EstimateDiff {
  const alternateName = (id: string | null, version: PreparedEstimateVersion) =>
    version.alternates.find((alternate) => alternate.id === id)?.name ?? "";
  return {
    lines: changedKeys(
      before.lines,
      after.lines,
      (line) =>
        `${line.category}|${line.description}|${line.trade}|${alternateName(line.alternateId, before) || alternateName(line.alternateId, after)}`,
      (line) => line.description,
      (left, right) =>
        left.quantity === right.quantity &&
        left.unit === right.unit &&
        left.priceBookVersionId === right.priceBookVersionId &&
        left.lineTotalCents === right.lineTotalCents,
    ),
    clauses: changedKeys(
      before.clauses,
      after.clauses,
      (clause) => `${clause.kind}|${clause.sortOrder}`,
      (clause) => clause.text,
      (left, right) => left.text === right.text,
    ),
    alternates: changedKeys(
      before.alternates,
      after.alternates,
      (alternate) => alternate.name,
      (alternate) => alternate.name,
      (left, right) => left.included === right.included && left.description === right.description,
    ),
    jobPackages: changedKeys(
      before.jobPackages,
      after.jobPackages,
      (pkg) => `${pkg.name}|${pkg.trade}`,
      (pkg) => pkg.name,
      (left, right) =>
        left.scope === right.scope &&
        left.workAreas.length === right.workAreas.length &&
        left.tasks.length === right.tasks.length,
    ),
    totals: {
      fromCents: before.totalCents,
      toCents: after.totalCents,
      deltaCents: after.totalCents - before.totalCents,
    },
  };
}

export function estimateRecords(version: PreparedEstimateVersion, createdAt: Date) {
  return {
    version: {
      id: version.versionId,
      organizationId: version.organizationId,
      estimateId: version.estimateId,
      versionNumber: version.versionNumber,
      createdAt,
      createdBy: version.createdBy,
      overheadBasisPoints: version.overheadBasisPoints,
      markupBasisPoints: version.markupBasisPoints,
      taxBasisPoints: version.taxBasisPoints,
      calculationOrder: version.calculationOrder,
      baseSubtotalCents: version.baseSubtotalCents,
      alternateTotalCents: version.alternateTotalCents,
      overheadCents: version.overheadCents,
      markupCents: version.markupCents,
      taxCents: version.taxCents,
      totalCents: version.totalCents,
      contentHash: version.contentHash,
    },
    alternates: version.alternates.map((alternate) => ({
      id: alternate.id,
      organizationId: version.organizationId,
      estimateVersionId: version.versionId,
      name: alternate.name,
      description: alternate.description,
      included: alternate.included,
      sortOrder: alternate.sortOrder,
    })),
    lines: version.lines.map((line) => ({
      id: line.id,
      organizationId: version.organizationId,
      estimateVersionId: version.versionId,
      sortOrder: line.sortOrder,
      category: line.category,
      description: line.description,
      trade: line.trade,
      location: line.location,
      method: line.method,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      basisPoints: line.basisPoints,
      basisCategories: line.basisCategories,
      taxable: line.taxable,
      alternateId: line.alternateId,
      priceBookItemId: line.priceBookItemId,
      priceBookVersionId: line.priceBookVersionId,
      lineTotalCents: line.lineTotalCents,
    })),
    clauses: version.clauses.map((clause) => ({
      id: clause.id,
      organizationId: version.organizationId,
      estimateVersionId: version.versionId,
      kind: clause.kind,
      text: clause.text,
      sortOrder: clause.sortOrder,
    })),
    jobPackages: version.jobPackages.map((pkg) => ({
      id: pkg.id,
      organizationId: version.organizationId,
      estimateVersionId: version.versionId,
      name: pkg.name,
      trade: pkg.trade,
      scope: pkg.scope,
      sortOrder: pkg.sortOrder,
    })),
    workAreas: version.jobPackages.flatMap((pkg) =>
      pkg.workAreas.map((area) => ({
        id: area.id,
        organizationId: version.organizationId,
        packageId: pkg.id,
        name: area.name,
        kind: area.kind,
        sortOrder: area.sortOrder,
      })),
    ),
    tasks: version.jobPackages.flatMap((pkg) =>
      pkg.tasks.map((task) => ({
        id: task.id,
        organizationId: version.organizationId,
        packageId: pkg.id,
        workAreaId: task.workAreaId,
        title: task.title,
        sortOrder: task.sortOrder,
      })),
    ),
    sources: version.sources.map((source) => ({
      id: source.id,
      organizationId: version.organizationId,
      lineId: source.lineId,
      documentVersionId: source.documentVersionId,
      pageNumber: source.pageNumber,
      sheetLabel: source.sheetLabel,
      chunkId: source.chunkId,
      contentHash: source.contentHash,
      startOffset: source.startOffset,
      endOffset: source.endOffset,
    })),
  };
}

export function rehydrateEstimateVersion(input: {
  opportunityId: string;
  version: {
    id: string;
    organizationId: string;
    estimateId: string;
    versionNumber: number;
    createdBy: string;
    overheadBasisPoints: number;
    markupBasisPoints: number;
    taxBasisPoints: number;
    calculationOrder: string;
    baseSubtotalCents: number;
    alternateTotalCents: number;
    overheadCents: number;
    markupCents: number;
    taxCents: number;
    totalCents: number;
    contentHash: string;
  };
  clauses: PreparedEstimateVersion["clauses"];
  alternates: Array<{
    id: string;
    name: string;
    description: string;
    included: boolean;
    sortOrder: number;
  }>;
  lines: Array<Omit<PreparedEstimateLine, "alternateKey" | "includedInTotal">>;
  sources: PreparedEstimateVersion["sources"];
  packages: Array<{
    id: string;
    name: string;
    trade: string;
    scope: string;
    sortOrder: number;
  }>;
  workAreas: Array<{
    id: string;
    packageId: string;
    name: string;
    kind: string;
    sortOrder: number;
  }>;
  tasks: Array<{
    id: string;
    packageId: string;
    workAreaId: string | null;
    title: string;
    sortOrder: number;
  }>;
}): PreparedEstimateVersion {
  const alternates = input.alternates.map((alternate) => ({ ...alternate, key: alternate.id }));
  const included = new Set(alternates.filter((alternate) => alternate.included).map((alternate) => alternate.id));
  return {
    organizationId: input.version.organizationId,
    estimateId: input.version.estimateId,
    opportunityId: input.opportunityId,
    versionId: input.version.id,
    versionNumber: input.version.versionNumber,
    createdBy: input.version.createdBy,
    overheadBasisPoints: input.version.overheadBasisPoints,
    markupBasisPoints: input.version.markupBasisPoints,
    taxBasisPoints: input.version.taxBasisPoints,
    calculationOrder: input.version.calculationOrder,
    baseSubtotalCents: input.version.baseSubtotalCents,
    alternateTotalCents: input.version.alternateTotalCents,
    overheadCents: input.version.overheadCents,
    markupCents: input.version.markupCents,
    taxCents: input.version.taxCents,
    totalCents: input.version.totalCents,
    contentHash: input.version.contentHash,
    clauses: input.clauses,
    alternates,
    lines: input.lines.map((line) => ({
      ...line,
      alternateKey: line.alternateId,
      includedInTotal: !line.alternateId || included.has(line.alternateId),
    })),
    sources: input.sources,
    jobPackages: input.packages.map((pkg) => ({
      ...pkg,
      key: pkg.id,
      workAreas: input.workAreas
        .filter((area) => area.packageId === pkg.id)
        .map((area) => ({ ...area, key: area.id })),
      tasks: input.tasks
        .filter((task) => task.packageId === pkg.id)
        .map((task) => ({
          id: task.id,
          title: task.title,
          workAreaId: task.workAreaId,
          sortOrder: task.sortOrder,
        })),
    })),
  };
}

export function buildAppliedEstimateDraft(input: {
  organizationId: string;
  estimateOrganizationId: string;
  estimateId: string;
  opportunityId: string;
  createdBy: string;
  baseVersionNumber: number;
  latestVersionNumber: number;
  overheadBasisPoints: number;
  markupBasisPoints: number;
  taxBasisPoints: number;
  proposal: BidEstimateProposal;
  storedCitations: Array<{ chunkId: string; contentHash: string }>;
  revisions: EstimatePriceRevision[];
  selections: Array<{
    kind: "line" | "package" | "inclusion" | "exclusion" | "alternate";
    index: number;
    quantity: string | null;
    priceBookVersionId: string | null;
  }>;
}): { ok: true; draft: EstimateVersionDraft } | { ok: false; error: string } {
  if (input.organizationId !== input.estimateOrganizationId) return { ok: false, error: "organization" };
  if (input.baseVersionNumber !== input.latestVersionNumber) return { ok: false, error: "stale-version" };
  const stored = new Map(input.storedCitations.map((citation) => [citation.chunkId, citation.contentHash]));
  const clauses: EstimateVersionDraft["clauses"] = [];
  const lines: EstimateLineDraft[] = [];
  const jobPackages: EstimateVersionDraft["jobPackages"] = [];
  const alternates: EstimateVersionDraft["alternates"] = [];
  for (const selection of input.selections) {
    if (selection.kind === "line") {
      const line = input.proposal.lines[selection.index];
      if (!line) return { ok: false, error: "line" };
      for (const citation of line.citations) {
        if (stored.get(citation.chunkId) !== citation.contentHash) {
          return { ok: false, error: "citation" };
        }
      }
      const revision = input.revisions.find(
        (item) => item.id === selection.priceBookVersionId && item.organizationId === input.organizationId,
      );
      const confirmed = selection.quantity?.trim() || null;
      if (!confirmed || !revision || revision.status !== "approved" || !revision.active) {
        clauses.push({
          kind: "assumption",
          text: `Takeoff required: ${line.description}`,
          sortOrder: clauses.length,
        });
        continue;
      }
      lines.push({
        sortOrder: lines.length,
        category: line.category,
        description: line.description,
        trade: revision.trade,
        location: line.location,
        method: "unit",
        quantity: confirmed,
        unit: revision.unit,
        unitPriceCents: null,
        basisPoints: null,
        basisCategories: [],
        taxable: true,
        alternateKey: null,
        priceBookItemId: revision.itemId,
        priceBookVersionId: revision.id,
        sources: line.citations.map((citation) => ({
          documentVersionId: citation.documentVersionId,
          pageNumber: citation.pageNumber,
          sheetLabel: citation.sheetLabel,
          chunkId: citation.chunkId,
          contentHash: citation.contentHash,
          startOffset: citation.startOffset,
          endOffset: citation.endOffset,
        })),
      });
    }
    if (selection.kind === "package") {
      const pkg = input.proposal.jobPackages[selection.index];
      if (!pkg) return { ok: false, error: "line" };
      const key = `package-${selection.index}`;
      jobPackages.push({
        key,
        name: pkg.name,
        trade: pkg.trade,
        scope: pkg.scope,
        sortOrder: jobPackages.length,
        workAreas: pkg.workAreas.map((area, index) => ({
          key: `${key}-area-${index}`,
          name: area.name,
          kind: area.kind,
          sortOrder: index,
        })),
        tasks: pkg.tasks.map((task, index) => {
          const areaIndex = pkg.workAreas.findIndex((area) => area.name === task.workAreaName);
          return {
            title: task.title,
            workAreaKey: task.workAreaName && areaIndex >= 0 ? `${key}-area-${areaIndex}` : null,
            sortOrder: index,
          };
        }),
      });
    }
    if (selection.kind === "inclusion" || selection.kind === "exclusion") {
      const clause = (selection.kind === "inclusion" ? input.proposal.inclusions : input.proposal.exclusions)[
        selection.index
      ];
      if (!clause) return { ok: false, error: "line" };
      clauses.push({ kind: selection.kind, text: clause.text, sortOrder: clauses.length });
    }
    if (selection.kind === "alternate") {
      const alternate = input.proposal.alternates[selection.index];
      if (!alternate) return { ok: false, error: "line" };
      alternates.push({
        key: `alternate-${selection.index}`,
        name: alternate.name,
        description: alternate.description,
        included: false,
        sortOrder: alternates.length,
      });
    }
  }
  return {
    ok: true,
    draft: {
      organizationId: input.organizationId,
      estimateId: input.estimateId,
      opportunityId: input.opportunityId,
      createdBy: input.createdBy,
      overheadBasisPoints: input.overheadBasisPoints,
      markupBasisPoints: input.markupBasisPoints,
      taxBasisPoints: input.taxBasisPoints,
      clauses,
      alternates,
      lines,
      jobPackages,
    },
  };
}
