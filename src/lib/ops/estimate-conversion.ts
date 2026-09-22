import { createHash } from "node:crypto";
import {
  assertSameOrganization,
  resolveCommercialAccess,
  type CommercialActor,
} from "@/lib/ops/commercial-authorization";
import type { PreparedEstimateVersion } from "@/lib/ops/estimates";
import type { EstimateAcceptance, ProposalEvent } from "@/lib/ops/proposals";

export type EstimateConversionPreview = {
  project: { name: string };
  jobs: Array<{
    packageId: string;
    name: string;
    scope: string;
    services: string[];
    workAreas: Array<{ name: string; kind: string }>;
    tasks: Array<{ title: string; workAreaIndex: number | null }>;
  }>;
  documentVersionIds: string[];
  budgetTotalCents: number;
};

export type ConversionBudgetLine = {
  id: string;
  estimateLineId: string;
  estimateVersionId: string;
  priceBookVersionId: string | null;
  description: string;
  amountCents: number;
  sortOrder: number;
};

export type ConversionResult = {
  id: string;
  organizationId: string;
  acceptanceId: string;
  estimateId: string;
  estimateVersionId: string;
  contentHash: string;
  idempotencyKey: string;
  payloadHash: string;
  projectId: string;
  jobIds: string[];
  workAreaIds: string[];
  taskIds: string[];
  budgetId: string;
  documentVersionIds: string[];
  createdAt: Date;
};

export type ConversionDraft = {
  projects: Array<{
    id: string;
    organizationId: string;
    companyId: string | null;
    siteId: string | null;
    opportunityId: string;
    sourceLeadId: string | null;
    name: string;
    status: "active";
    projectManager: string | null;
  }>;
  jobs: Array<{
    id: string;
    organizationId: string;
    projectId: string;
    companyId: string | null;
    siteId: string | null;
    opportunityId: string;
    name: string;
    status: "draft";
    scope: string | null;
    services: string[];
    projectManager: string | null;
  }>;
  workAreas: Array<{
    id: string;
    jobId: string;
    name: string;
    kind: string;
    sortOrder: number;
  }>;
  tasks: Array<{
    id: string;
    jobId: string;
    workAreaId: string | null;
    title: string;
    status: "open";
    createdBy: string;
  }>;
  budgets: Array<{
    id: string;
    organizationId: string;
    projectId: string;
    estimateVersionId: string;
    contentHash: string;
    totalCents: number;
  }>;
  budgetLines: Array<ConversionBudgetLine & { organizationId: string; budgetId: string }>;
  documentLinks: Array<{
    id: string;
    organizationId: string;
    documentVersionId: string;
    entityType: "project" | "job";
    entityId: string;
    purpose: string;
  }>;
  conversions: ConversionResult[];
  audits: Array<{
    id: string;
    organizationId: string;
    actor: string;
    action: string;
    entityType: string;
    entityId: string;
    result: "success";
    correlationId: string;
  }>;
  outbox: Array<{
    id: string;
    organizationId: string;
    kind: string;
    aggregateType: string;
    aggregateId: string;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }>;
  jobEvents: Array<{
    id: string;
    jobId: string;
    actor: string;
    kind: string;
    summary: string;
    payload: Record<string, unknown>;
  }>;
  opportunityProjectId: string | null;
  opportunityStage: string;
};

export function emptyConversionDraft(stage = "qualification"): ConversionDraft {
  return {
    projects: [],
    jobs: [],
    workAreas: [],
    tasks: [],
    budgets: [],
    budgetLines: [],
    documentLinks: [],
    conversions: [],
    audits: [],
    outbox: [],
    jobEvents: [],
    opportunityProjectId: null,
    opportunityStage: stage,
  };
}

export type ConversionLedger = {
  read(): ConversionDraft;
  transaction<T>(run: (draft: ConversionDraft) => Promise<T>): Promise<T>;
};

export function createMemoryLedger(initial?: ConversionDraft): ConversionLedger {
  let current = initial ?? emptyConversionDraft();
  let tail: Promise<void> = Promise.resolve();
  return {
    read: () => current,
    transaction(run) {
      const previous = tail;
      let release: () => void = () => {};
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      return previous.then(async () => {
        const snapshot = structuredClone(current);
        const draft = structuredClone(current);
        try {
          const result = await run(draft);
          current = draft;
          return result;
        } catch (error) {
          current = snapshot;
          throw error;
        } finally {
          release();
        }
      });
    },
  };
}

export function buildEstimateConversionPreview(input: {
  projectName: string;
  version: PreparedEstimateVersion;
  documentVersionIds: string[];
}): EstimateConversionPreview {
  return {
    project: { name: input.projectName.trim() || "Project" },
    jobs: [...input.version.jobPackages]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((pkg) => {
        const areas = [...pkg.workAreas].sort((left, right) => left.sortOrder - right.sortOrder);
        return {
          packageId: pkg.id,
          name: pkg.name,
          scope: pkg.scope,
          services: [pkg.trade],
          workAreas: areas.map((area) => ({ name: area.name, kind: area.kind })),
          tasks: [...pkg.tasks]
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((task) => ({
              title: task.title,
              workAreaIndex: task.workAreaId
                ? areas.findIndex((area) => area.id === task.workAreaId)
                : null,
            }))
            .map((task) => ({
              ...task,
              workAreaIndex: task.workAreaIndex != null && task.workAreaIndex >= 0 ? task.workAreaIndex : null,
            })),
        };
      }),
    documentVersionIds: [...input.documentVersionIds],
    budgetTotalCents: input.version.totalCents,
  };
}

export function conversionPayloadHash(preview: EstimateConversionPreview): string {
  return createHash("sha256").update(JSON.stringify(preview)).digest("hex");
}

function accepted(events: ProposalEvent[], acceptance: EstimateAcceptance | null): boolean {
  return Boolean(acceptance) && events.some((event) => event.kind === "accepted");
}

export async function commitEstimateConversion(input: {
  actor: CommercialActor & { email: string };
  now: Date;
  idempotencyKey: string;
  expectedHash: string;
  acceptance: EstimateAcceptance;
  events: ProposalEvent[];
  version: PreparedEstimateVersion;
  latestVersionNumber: number;
  approvalSatisfied: boolean;
  acceptanceExpired: boolean;
  opportunity: {
    id: string;
    organizationId: string;
    name: string;
    companyId: string | null;
    siteId: string | null;
    sourceLeadId: string | null;
    projectId: string | null;
    stage: string;
  };
  documentVersionIds: string[];
  ledger: ConversionLedger;
  failAtTask?: number;
}): Promise<
  | { ok: true; result: ConversionResult; preview: EstimateConversionPreview; replayed: boolean }
  | { ok: false; error: string }
> {
  const access = resolveCommercialAccess(input.actor, "estimate.convert");
  if (!access.ok) return { ok: false, error: access.error };
  const same = assertSameOrganization(access.organizationId, input.opportunity.organizationId);
  if (!same.ok) return { ok: false, error: same.error };
  if (input.acceptance.organizationId !== input.opportunity.organizationId) {
    return { ok: false, error: "That record is outside this organization." };
  }
  if (input.expectedHash !== input.version.contentHash || input.acceptance.contentHash !== input.version.contentHash) {
    return { ok: false, error: "stale-hash" };
  }
  if (!accepted(input.events, input.acceptance)) return { ok: false, error: "not-accepted" };
  if (input.acceptanceExpired) return { ok: false, error: "expired" };
  if (input.version.versionNumber !== input.latestVersionNumber || !input.approvalSatisfied) {
    return { ok: false, error: "stale-approval" };
  }
  const preview = buildEstimateConversionPreview({
    projectName: input.opportunity.name,
    version: input.version,
    documentVersionIds: input.documentVersionIds,
  });
  const payloadHash = conversionPayloadHash(preview);
  try {
    return await input.ledger.transaction(async (draft) => {
      const existing = draft.conversions.find(
        (item) =>
          item.acceptanceId === input.acceptance.id ||
          item.idempotencyKey === input.idempotencyKey,
      );
      if (existing) return { ok: true as const, result: existing, preview, replayed: true };
      if (draft.opportunityProjectId || input.opportunity.projectId) {
        return { ok: false as const, error: "already-has-project" };
      }
      const projectId = crypto.randomUUID();
      const budgetId = crypto.randomUUID();
      const correlationId = crypto.randomUUID();
      draft.projects.push({
        id: projectId,
        organizationId: input.opportunity.organizationId,
        companyId: input.opportunity.companyId,
        siteId: input.opportunity.siteId,
        opportunityId: input.opportunity.id,
        sourceLeadId: input.opportunity.sourceLeadId,
        name: preview.project.name,
        status: "active",
        projectManager: null,
      });
      const jobIds: string[] = [];
      const workAreaIds: string[] = [];
      const taskIds: string[] = [];
      for (const job of preview.jobs) {
        const jobId = crypto.randomUUID();
        jobIds.push(jobId);
        draft.jobs.push({
          id: jobId,
          organizationId: input.opportunity.organizationId,
          projectId,
          companyId: input.opportunity.companyId,
          siteId: input.opportunity.siteId,
          opportunityId: input.opportunity.id,
          name: job.name,
          status: "draft",
          scope: job.scope,
          services: job.services,
          projectManager: null,
        });
        const areaIds = job.workAreas.map((area, index) => {
          const id = crypto.randomUUID();
          workAreaIds.push(id);
          draft.workAreas.push({
            id,
            jobId,
            name: area.name,
            kind: area.kind,
            sortOrder: index,
          });
          return id;
        });
        for (const task of job.tasks) {
          const id = crypto.randomUUID();
          taskIds.push(id);
          draft.tasks.push({
            id,
            jobId,
            workAreaId: task.workAreaIndex == null ? null : (areaIds[task.workAreaIndex] ?? null),
            title: task.title,
            status: "open",
            createdBy: input.actor.email,
          });
          if (input.failAtTask != null && draft.tasks.length === input.failAtTask) {
            throw new Error("injected-task-failure");
          }
        }
        draft.jobEvents.push({
          id: crypto.randomUUID(),
          jobId,
          actor: input.actor.email,
          kind: "job_created",
          summary: `job created from accepted estimate: ${job.name}`,
          payload: { projectId, estimateVersionId: input.version.versionId },
        });
        for (const documentVersionId of preview.documentVersionIds) {
          draft.documentLinks.push({
            id: crypto.randomUUID(),
            organizationId: input.opportunity.organizationId,
            documentVersionId,
            entityType: "job",
            entityId: jobId,
            purpose: "estimate-source",
          });
        }
      }
      for (const documentVersionId of preview.documentVersionIds) {
        draft.documentLinks.push({
          id: crypto.randomUUID(),
          organizationId: input.opportunity.organizationId,
          documentVersionId,
          entityType: "project",
          entityId: projectId,
          purpose: "estimate-source",
        });
      }
      draft.budgets.push({
        id: budgetId,
        organizationId: input.opportunity.organizationId,
        projectId,
        estimateVersionId: input.version.versionId,
        contentHash: input.version.contentHash,
        totalCents: preview.budgetTotalCents,
      });
      for (const line of input.version.lines.filter((item) => item.includedInTotal)) {
        draft.budgetLines.push({
          id: crypto.randomUUID(),
          organizationId: input.opportunity.organizationId,
          budgetId,
          estimateLineId: line.id,
          estimateVersionId: input.version.versionId,
          priceBookVersionId: line.priceBookVersionId,
          description: line.description,
          amountCents: line.lineTotalCents,
          sortOrder: line.sortOrder,
        });
      }
      draft.opportunityProjectId = projectId;
      draft.opportunityStage = "won";
      draft.audits.push({
        id: crypto.randomUUID(),
        organizationId: input.opportunity.organizationId,
        actor: input.actor.email,
        action: "estimate.convert",
        entityType: "estimate_acceptance",
        entityId: input.acceptance.id,
        result: "success",
        correlationId,
      });
      draft.outbox.push({
        id: crypto.randomUUID(),
        organizationId: input.opportunity.organizationId,
        kind: "estimate.converted",
        aggregateType: "project",
        aggregateId: projectId,
        idempotencyKey: `estimate.converted:${input.acceptance.id}`,
        payload: { projectId, jobIds, acceptanceId: input.acceptance.id },
      });
      const result: ConversionResult = {
        id: crypto.randomUUID(),
        organizationId: input.opportunity.organizationId,
        acceptanceId: input.acceptance.id,
        estimateId: input.version.estimateId,
        estimateVersionId: input.version.versionId,
        contentHash: input.version.contentHash,
        idempotencyKey: input.idempotencyKey,
        payloadHash,
        projectId,
        jobIds,
        workAreaIds,
        taskIds,
        budgetId,
        documentVersionIds: [...preview.documentVersionIds],
        createdAt: input.now,
      };
      draft.conversions.push(result);
      return { ok: true as const, result, preview, replayed: false };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "injected-task-failure") {
      return { ok: false, error: "injected-task-failure" };
    }
    throw error;
  }
}
