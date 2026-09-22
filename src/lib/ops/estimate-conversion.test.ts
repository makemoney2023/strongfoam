import { describe, expect, it } from "vitest";
import {
  buildEstimateConversionPreview,
  commitEstimateConversion,
  createMemoryLedger,
  emptyConversionDraft,
} from "@/lib/ops/estimate-conversion";
import type { PreparedEstimateVersion } from "@/lib/ops/estimates";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";
import { PROPOSAL_ACCEPTANCE_TERMS, type EstimateAcceptance, type ProposalEvent } from "@/lib/ops/proposals";

const ORG = STRONG_FOAM_ORGANIZATION_ID;
const NOW = new Date("2026-09-22T16:00:00.000Z");

function version(): PreparedEstimateVersion {
  const areas = Array.from({ length: 7 }, (_, index) => ({
    id: `area-${index}`,
    key: `area-${index}`,
    name: `Area ${index + 1}`,
    kind: "area",
    sortOrder: index,
  }));
  const groups = [areas.slice(0, 3), areas.slice(3, 5), areas.slice(5)];
  const tasks = Array.from({ length: 18 }, (_, index) => ({
    id: `task-${index}`,
    title: `Task ${index + 1}`,
    workAreaId: areas[index % 7]!.id,
    sortOrder: index,
  }));
  return {
    organizationId: ORG,
    estimateId: "est-1",
    opportunityId: "opp-1",
    versionId: "ver-1",
    versionNumber: 4,
    createdBy: "admin@strongfoam.demo",
    overheadBasisPoints: 0,
    markupBasisPoints: 0,
    taxBasisPoints: 0,
    calculationOrder: "overhead-markup-tax",
    baseSubtotalCents: 10000,
    alternateTotalCents: 0,
    overheadCents: 0,
    markupCents: 0,
    taxCents: 0,
    totalCents: 10000,
    contentHash: "accepted-hash",
    clauses: [],
    alternates: [],
    lines: [
      {
        id: "line-1",
        sortOrder: 0,
        category: "material",
        description: "Closed-cell spray foam",
        trade: "spray-foam",
        location: null,
        method: "unit",
        quantity: "1.0000",
        unit: "bags",
        unitPriceCents: 10000,
        basisPoints: null,
        basisCategories: [],
        taxable: true,
        alternateId: null,
        alternateKey: null,
        priceBookItemId: "item-1",
        priceBookVersionId: "price-rev-1",
        lineTotalCents: 10000,
        includedInTotal: true,
      },
    ],
    sources: [],
    jobPackages: groups.map((workAreas, index) => ({
      id: `pkg-${index}`,
      key: `pkg-${index}`,
      name: ["Podium closed-cell spray foam", "North elevation AVB", "Structural steel fireproofing"][index]!,
      trade: "spray-foam",
      scope: `Scope ${index + 1}`,
      sortOrder: index,
      workAreas,
      tasks: tasks.filter((task) => workAreas.some((area) => area.id === task.workAreaId)),
    })),
  };
}

const documents = ["doc-1", "doc-2", "doc-3", "doc-4", "doc-5"];

const acceptance: EstimateAcceptance = {
  id: "acc-1",
  organizationId: ORG,
  proposalId: "prop-1",
  estimateId: "est-1",
  estimateVersionId: "ver-1",
  contentHash: "accepted-hash",
  recipientName: "Alex Lee",
  recipientEmail: "alex@acme-gc.example",
  attestation: PROPOSAL_ACCEPTANCE_TERMS,
  ipAddress: null,
  userAgent: null,
  createdAt: NOW,
};

const events: ProposalEvent[] = [
  {
    id: "ev-1",
    organizationId: ORG,
    proposalId: "prop-1",
    kind: "accepted",
    actorEmail: null,
    recipientName: "Alex Lee",
    recipientEmail: "alex@acme-gc.example",
    channel: null,
    externalMessageId: null,
    attestation: PROPOSAL_ACCEPTANCE_TERMS,
    ipAddress: null,
    userAgent: null,
    createdAt: NOW,
  },
];

const actor = {
  email: "admin@strongfoam.demo",
  role: "administrator" as const,
  organizationId: ORG,
};

function input(ledger = createMemoryLedger(), failAtTask?: number) {
  return {
    actor,
    now: NOW,
    idempotencyKey: "convert-acc-1",
    expectedHash: "accepted-hash",
    acceptance,
    events,
    version: version(),
    latestVersionNumber: 4,
    approvalSatisfied: true,
    acceptanceExpired: false,
    opportunity: {
      id: "opp-1",
      organizationId: ORG,
      name: "Acme podium insulation",
      companyId: "co-1",
      siteId: "site-1",
      sourceLeadId: null,
      projectId: null,
      stage: "qualification",
    },
    documentVersionIds: documents,
    ledger,
    failAtTask,
  };
}

describe("estimate conversion", () => {
  it("matches the preview and rolls back an injected task failure", async () => {
    const graph = version();
    const preview = buildEstimateConversionPreview({
      projectName: "Acme podium insulation",
      version: graph,
      documentVersionIds: documents,
    });
    expect(preview.jobs).toHaveLength(3);
    expect(preview.jobs.reduce((sum, job) => sum + job.workAreas.length, 0)).toBe(7);
    expect(preview.jobs.reduce((sum, job) => sum + job.tasks.length, 0)).toBe(18);
    expect(preview.documentVersionIds).toEqual(documents);
    expect(preview.budgetTotalCents).toBe(10000);

    const failed = createMemoryLedger();
    const blown = await commitEstimateConversion(input(failed, 10));
    expect(blown.ok).toBe(false);
    expect(failed.read()).toEqual(emptyConversionDraft());

    const ledger = createMemoryLedger();
    const created = await commitEstimateConversion(input(ledger));
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const state = ledger.read();
    expect(state.projects).toHaveLength(1);
    expect(state.jobs).toHaveLength(3);
    expect(state.workAreas).toHaveLength(7);
    expect(state.tasks).toHaveLength(18);
    expect(state.budgets).toHaveLength(1);
    expect(state.projects[0]?.name).toBe(preview.project.name);
    expect(state.jobs.map((job) => job.name)).toEqual(preview.jobs.map((job) => job.name));
    expect(state.budgets[0]?.estimateVersionId).toBe(graph.versionId);
    expect(state.budgetLines[0]?.priceBookVersionId).toBe("price-rev-1");
    expect(state.budgetLines[0]?.estimateVersionId).toBe(graph.versionId);
    expect(new Set(state.documentLinks.map((link) => link.documentVersionId))).toEqual(new Set(documents));
    expect(state.documentLinks.some((link) => "bytes" in link)).toBe(false);
    expect(state.opportunityStage).toBe("won");
    expect(state.opportunityProjectId).toBe(created.result.projectId);
    expect(state.audits).toHaveLength(1);
    expect(state.outbox).toHaveLength(1);
    expect(state.conversions).toHaveLength(1);

    const replay = await commitEstimateConversion(input(ledger));
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.replayed).toBe(true);
    expect(replay.result.projectId).toBe(created.result.projectId);
    expect(replay.result.jobIds).toEqual(created.result.jobIds);
    expect(ledger.read().projects).toHaveLength(1);
    expect(ledger.read().jobs).toHaveLength(3);
  });

  it("lets two concurrent conversions create one result", async () => {
    const ledger = createMemoryLedger();
    const [first, second] = await Promise.all([
      commitEstimateConversion(input(ledger)),
      commitEstimateConversion(input(ledger)),
    ]);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.result.projectId).toBe(second.result.projectId);
    expect(ledger.read().projects).toHaveLength(1);
    expect(ledger.read().conversions).toHaveLength(1);
  });
});
