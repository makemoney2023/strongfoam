import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEMO_ESTIMATE_ID,
  DEMO_OPEN_OPPORTUNITY_ID,
} from "@/lib/ops/demo-data";
import {
  createDemoEstimateVersion,
  listDemoEstimateGraphs,
  listDemoJobs,
  listDemoProjects,
  updateDemoEstimateLine,
} from "@/lib/ops/demo-store";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import {
  compareEstimateVersions,
  prepareEstimateVersion,
  rejectEstimateContentMutation,
  type EstimateVersionDraft,
} from "@/lib/ops/estimates";
import { updateEstimateVersionContent } from "@/lib/ops/store";

const revision = {
  id: "11111111-1111-4111-8111-111111111201",
  itemId: "11111111-1111-4111-8111-111111111101",
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
  status: "approved",
  active: true,
  trade: "spray-foam",
  description: "Closed-cell spray foam",
  unit: "bags",
  unitPriceCents: 18500,
};

const citation = {
  id: "33333333-3333-4333-8333-333333333304",
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
  documentVersionId: "33333333-3333-4333-8333-333333333302",
  pageNumber: 1,
  contentHash: "abc123",
  startOffset: 0,
  endOffset: 12,
};

function draft(overrides: Partial<EstimateVersionDraft> = {}): EstimateVersionDraft {
  return {
    organizationId: STRONG_FOAM_ORGANIZATION_ID,
    estimateId: "22222222-2222-4222-8222-222222222201",
    opportunityId: "99999999-9999-4999-8999-999999999991",
    createdBy: "office@strongfoam.demo",
    overheadBasisPoints: 0,
    markupBasisPoints: 0,
    taxBasisPoints: 0,
    clauses: [
      { kind: "inclusion", text: "Closed-cell at the podium", sortOrder: 0 },
      { kind: "exclusion", text: "Interior finishes", sortOrder: 1 },
    ],
    alternates: [
      {
        key: "intumescent",
        name: "Intumescent upgrade",
        description: "Add intumescent coating",
        included: false,
        sortOrder: 0,
      },
    ],
    lines: [
      {
        sortOrder: 0,
        category: "material",
        description: "Closed-cell spray foam",
        trade: "spray-foam",
        location: "Podium",
        method: "unit",
        quantity: "2.5000",
        unit: "bags",
        unitPriceCents: null,
        basisPoints: null,
        basisCategories: [],
        taxable: true,
        alternateKey: null,
        priceBookItemId: null,
        priceBookVersionId: revision.id,
        sources: [
          {
            documentVersionId: citation.documentVersionId,
            pageNumber: citation.pageNumber,
            sheetLabel: "A-201",
            chunkId: citation.id,
            contentHash: citation.contentHash,
            startOffset: citation.startOffset,
            endOffset: citation.endOffset,
          },
        ],
      },
    ],
    jobPackages: [
      {
        key: "podium",
        name: "Podium closed-cell spray foam",
        trade: "spray-foam",
        scope: "Podium",
        sortOrder: 0,
        workAreas: [{ key: "podium-area", name: "Podium", kind: "area", sortOrder: 0 }],
        tasks: [{ title: "Mask podium", workAreaKey: "podium-area", sortOrder: 0 }],
      },
      {
        key: "avb",
        name: "North elevation AVB",
        trade: "avb",
        scope: "North elevation",
        sortOrder: 1,
        workAreas: [{ key: "north", name: "North elevation", kind: "area", sortOrder: 0 }],
        tasks: [{ title: "Install AVB", workAreaKey: "north", sortOrder: 0 }],
      },
    ],
    ...overrides,
  };
}

describe("estimate versions", () => {
  it("rejects an unknown price revision and a client-supplied line total", () => {
    const missing = prepareEstimateVersion(
      draft({
        lines: [
          {
            ...draft().lines[0],
            priceBookVersionId: "11111111-1111-4111-8111-111111111299",
          },
        ],
      }),
      { revisions: [revision], citations: [citation], existingVersionNumbers: [] },
    );
    expect(missing).toEqual({ ok: false, error: "unknown-price-revision" });

    const clientTotal = prepareEstimateVersion(
      draft({
        lines: [{ ...draft().lines[0], clientLineTotalCents: 1 }],
      }),
      { revisions: [revision], citations: [citation], existingVersionNumbers: [] },
    );
    expect(clientTotal).toEqual({ ok: false, error: "client-total" });
  });

  it("snapshots the approved price and diffs the next version", () => {
    const first = prepareEstimateVersion(draft(), {
      revisions: [revision],
      citations: [citation],
      existingVersionNumbers: [],
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.version.versionNumber).toBe(1);
    expect(first.version.lines[0]?.lineTotalCents).toBe(46250);
    expect(first.version.lines[0]?.unitPriceCents).toBe(18500);
    expect(first.version.sources).toHaveLength(1);
    expect(first.version.jobPackages).toHaveLength(2);
    expect(rejectEstimateContentMutation()).toEqual({ ok: false, error: "immutable" });

    const second = prepareEstimateVersion(
      draft({
        lines: [{ ...draft().lines[0], quantity: "3.0000" }],
      }),
      { revisions: [revision], citations: [citation], existingVersionNumbers: [1] },
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.version.versionNumber).toBe(2);
    const diff = compareEstimateVersions(first.version, second.version);
    expect(diff.lines.changed).toEqual(["Closed-cell spray foam"]);
    expect(diff.totals.deltaCents).toBe(9250);
    expect(second.version.contentHash).not.toBe(first.version.contentHash);
  });

  it("rejects estimate content updates in SQL", () => {
    const sql = readFileSync("drizzle/0022_estimates.sql", "utf8");
    expect(sql).toContain("RAISE EXCEPTION 'immutable'");
  });

  it("keeps the demo estimate immutable and free of jobs", async () => {
    const projects = listDemoProjects().length;
    const jobs = listDemoJobs().length;
    const graphs = listDemoEstimateGraphs(DEMO_ESTIMATE_ID);
    expect(graphs).toHaveLength(1);
    const seeded = graphs[0];
    expect(seeded?.lines.map((line) => line.description)).toEqual([
      "Closed-cell spray foam",
      "Air and vapor barrier",
      "Intumescent coating",
    ]);
    expect(seeded?.clauses.map((clause) => clause.kind)).toEqual(["inclusion", "exclusion"]);
    expect(seeded?.alternates[0]?.included).toBe(false);
    expect(seeded?.jobPackages).toHaveLength(2);
    expect(seeded?.sources).toHaveLength(1);
    expect(seeded?.lines[0]?.lineTotalCents).toBe(46250);
    expect(seeded?.totalCents).toBe(97265);
    expect(seeded?.opportunityId).toBe(DEMO_OPEN_OPPORTUNITY_ID);
    const lineId = seeded?.lines[0]?.id ?? "";
    expect(updateDemoEstimateLine()).toEqual({ ok: false, error: "immutable" });
    expect(await updateEstimateVersionContent()).toEqual({ ok: false, error: "immutable" });
    expect(listDemoEstimateGraphs(DEMO_ESTIMATE_ID)[0]?.lines[0]?.id).toBe(lineId);
    expect(listDemoEstimateGraphs(DEMO_ESTIMATE_ID)[0]?.lines[0]?.quantity).toBe("2.5000");

    const next = createDemoEstimateVersion({
      organizationId: seeded.organizationId,
      estimateId: seeded.estimateId,
      opportunityId: seeded.opportunityId,
      createdBy: "office@strongfoam.demo",
      overheadBasisPoints: seeded.overheadBasisPoints,
      markupBasisPoints: seeded.markupBasisPoints,
      taxBasisPoints: seeded.taxBasisPoints,
      clauses: seeded.clauses.map((clause) => ({
        kind: clause.kind,
        text: clause.text,
        sortOrder: clause.sortOrder,
      })),
      alternates: seeded.alternates.map((alternate) => ({
        key: alternate.key,
        name: alternate.name,
        description: alternate.description,
        included: alternate.included,
        sortOrder: alternate.sortOrder,
      })),
      lines: seeded.lines.map((line) => ({
        sortOrder: line.sortOrder,
        category: line.category,
        description: line.description,
        trade: line.trade,
        location: line.location,
        method: line.method,
        quantity:
          line.description === "Closed-cell spray foam" ? "3.0000" : line.quantity,
        unit: line.unit,
        unitPriceCents: line.method === "unit" ? null : line.unitPriceCents,
        basisPoints: line.basisPoints,
        basisCategories: line.basisCategories,
        taxable: line.taxable,
        alternateKey: line.alternateKey,
        priceBookItemId: line.priceBookItemId,
        priceBookVersionId: line.priceBookVersionId,
        sources: seeded.sources
          .filter((source) => source.lineId === line.id)
          .map((source) => ({
            documentVersionId: source.documentVersionId,
            pageNumber: source.pageNumber,
            sheetLabel: source.sheetLabel,
            chunkId: source.chunkId,
            contentHash: source.contentHash,
            startOffset: source.startOffset,
            endOffset: source.endOffset,
          })),
      })),
      jobPackages: seeded.jobPackages.map((pkg) => ({
        key: pkg.key,
        name: pkg.name,
        trade: pkg.trade,
        scope: pkg.scope,
        sortOrder: pkg.sortOrder,
        workAreas: pkg.workAreas.map((area) => ({
          key: area.key,
          name: area.name,
          kind: area.kind,
          sortOrder: area.sortOrder,
        })),
        tasks: pkg.tasks.map((task) => ({
          title: task.title,
          workAreaKey:
            pkg.workAreas.find((area) => area.id === task.workAreaId)?.key ?? null,
          sortOrder: task.sortOrder,
        })),
      })),
    });
    expect(next.ok).toBe(true);
    if (!next.ok || !seeded) return;
    const diff = compareEstimateVersions(seeded, next.version);
    expect(diff.lines.changed).toContain("Closed-cell spray foam");
    expect(listDemoProjects()).toHaveLength(projects);
    expect(listDemoJobs()).toHaveLength(jobs);
  });
});
