"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import type { ActionState } from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import {
  assertSameOrganization,
  resolveCommercialAccess,
} from "@/lib/ops/commercial-authorization";
import { formatUnitPrice } from "@/lib/ops/price-book";
import { decideEstimateVersion } from "@/lib/ops/estimate-approvals";
import { parseWorkspaceDraft } from "@/lib/ops/estimate-workspace";
import { prepareEstimateVersion, type EstimateVersionDraft } from "@/lib/ops/estimates";
import {
  createEstimateVersion,
  getAuthorizedOpportunity,
  getEstimate,
  listCommercialApprovalRules,
  listEstimateApprovals,
  listEstimateCitations,
  listEstimateGraphs,
  listPriceBookItems,
  listPriceBookVersions,
  saveEstimateApproval,
} from "@/lib/ops/store";

const ERRORS: Record<string, string> = {
  "unknown-price-revision": "Choose an active approved price revision.",
  "client-total": "Line totals are calculated by the server.",
  citation: "That source citation does not match the stored page.",
  quantity: "Enter a quantity with up to four decimal places.",
  price: "The unit price has to come from the approved revision.",
  alternate: "That alternate is not on this version.",
  "basis-points": "Enter overhead, markup, and tax as basis points.",
  "stale-hash": "That estimate version changed. Reload it before deciding.",
  superseded: "A newer estimate version exists. Decide the latest version.",
  "already-decided": "That approver already decided this version.",
};

function explain(error: string): string {
  return ERRORS[error] ?? error;
}

async function requireEditor() {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const access = resolveCommercialAccess(session, "estimate.edit");
  if (!access.ok) return { ok: false as const, error: access.error, session };
  return { ok: true as const, session, organizationId: access.organizationId };
}

function opportunityPath(opportunityId: string): string {
  return `/app/opportunities/${opportunityId}`;
}

function estimatePath(opportunityId: string, estimateId: string, version?: number): string {
  const path = `${opportunityPath(opportunityId)}/estimates/${estimateId}`;
  return version ? `${path}?version=${version}` : path;
}

export async function createOpportunityEstimate(formData: FormData): Promise<ActionState> {
  const access = await requireEditor();
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const fallback = opportunityPath(opportunityId || "missing");
  if (!access.ok) return fail(fallback, access.error);
  const opportunity = await getAuthorizedOpportunity(access.organizationId, opportunityId);
  if (!opportunity) return fail("/app/opportunities", "That record is outside this organization.");
  const estimateId = crypto.randomUUID();
  const created = await createEstimateVersion({
    organizationId: access.organizationId,
    estimateId,
    opportunityId,
    createdBy: access.session.email,
    title: opportunity.name,
    overheadBasisPoints: 0,
    markupBasisPoints: 0,
    taxBasisPoints: 0,
    clauses: [],
    alternates: [],
    lines: [],
    jobPackages: [],
  });
  if (!created.ok) return fail(fallback, explain(created.error));
  revalidatePath(fallback);
  return succeed(
    estimatePath(opportunityId, estimateId, 1),
    "Estimate version 1 created.",
  );
}

async function revisionContext(organizationId: string) {
  const [items, versions] = await Promise.all([
    listPriceBookItems({ includeInactive: true }),
    listPriceBookVersions(),
  ]);
  return versions
    .filter((version) => version.organizationId === organizationId && version.status === "approved")
    .map((version) => ({
      id: version.id,
      itemId: version.itemId,
      organizationId: version.organizationId,
      status: version.status,
      active: items.find((item) => item.id === version.itemId)?.active ?? false,
      trade: version.trade,
      description: version.description,
      unit: version.unit,
      unitPriceCents: version.unitPriceCents,
    }));
}

export async function saveEstimateVersion(formData: FormData): Promise<ActionState> {
  const access = await requireEditor();
  const estimateId = String(formData.get("estimateId") ?? "");
  const estimate = estimateId ? await getEstimate(estimateId) : null;
  const fallback = estimate
    ? estimatePath(estimate.opportunityId, estimate.id)
    : "/app/opportunities";
  if (!access.ok) return fail(fallback, access.error);
  if (!estimate) return fail(fallback, "That estimate could not be found.");
  const same = assertSameOrganization(access.organizationId, estimate.organizationId);
  if (!same.ok) return fail(fallback, same.error);
  const opportunity = await getAuthorizedOpportunity(
    access.organizationId,
    estimate.opportunityId,
  );
  if (!opportunity) return fail(fallback, "That record is outside this organization.");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return fail(fallback, "The estimate draft could not be read.");
  }
  const parsed = parseWorkspaceDraft(parsedJson);
  if (!parsed.ok) return fail(fallback, explain(parsed.error));
  const baseVersionNumber = Number(formData.get("baseVersionNumber"));
  const graphs = await listEstimateGraphs(estimate.id);
  const latest = graphs.reduce((max, graph) => Math.max(max, graph.versionNumber), 0);
  if (!Number.isInteger(baseVersionNumber) || baseVersionNumber !== latest) {
    return fail(fallback, "That estimate version is stale. Reload the latest version.");
  }
  const draft: EstimateVersionDraft = {
    ...parsed.draft,
    organizationId: access.organizationId,
    estimateId: estimate.id,
    opportunityId: estimate.opportunityId,
    createdBy: access.session.email,
    title: estimate.title,
  };
  if (String(formData.get("intent") ?? "save") === "preview") {
    const preview = prepareEstimateVersion(draft, {
      revisions: await revisionContext(access.organizationId),
      citations: await listEstimateCitations(access.organizationId),
      existingVersionNumbers: graphs.map((graph) => graph.versionNumber),
    });
    if (!preview.ok) return fail(fallback, explain(preview.error));
    return {
      notice: {
        kind: "success",
        message: `Preview total ${formatUnitPrice(preview.version.totalCents)}. Nothing was saved.`,
      },
    };
  }
  const created = await createEstimateVersion(draft);
  if (!created.ok) return fail(fallback, explain(created.error));
  const path = estimatePath(estimate.opportunityId, estimate.id, created.version.versionNumber);
  revalidatePath(opportunityPath(estimate.opportunityId));
  revalidatePath(estimatePath(estimate.opportunityId, estimate.id));
  return succeed(path, `Estimate version ${created.version.versionNumber} created.`);
}

export async function decideEstimateVersionAction(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const estimateId = String(formData.get("estimateId") ?? "");
  const estimate = estimateId ? await getEstimate(estimateId) : null;
  const fallback = estimate
    ? estimatePath(estimate.opportunityId, estimate.id)
    : "/app/opportunities";
  const access = resolveCommercialAccess(session, "estimate.approve");
  if (!access.ok) return fail(fallback, access.error);
  if (!estimate) return fail(fallback, "That estimate could not be found.");
  const same = assertSameOrganization(access.organizationId, estimate.organizationId);
  if (!same.ok) return fail(fallback, same.error);
  const graphs = await listEstimateGraphs(estimate.id);
  const versionId = String(formData.get("estimateVersionId") ?? "");
  const version = graphs.find((graph) => graph.versionId === versionId);
  if (!version) return fail(fallback, "That estimate version could not be found.");
  const latest = graphs.reduce((max, graph) => Math.max(max, graph.versionNumber), 0);
  const decision = formData.get("decision") === "rejected" ? "rejected" : "approved";
  const decided = decideEstimateVersion({
    actor: {
      email: session.email,
      role: session.role,
      organizationId: access.organizationId,
    },
    expected: {
      estimateVersionId: versionId,
      contentHash: String(formData.get("expectedHash") ?? ""),
    },
    decision,
    comment: String(formData.get("comment") ?? ""),
    now: new Date(),
    loaded: {
      organizationId: estimate.organizationId,
      estimateId: estimate.id,
      versionId: version.versionId,
      versionNumber: version.versionNumber,
      latestVersionNumber: latest,
      contentHash: version.contentHash,
      totalCents: version.totalCents,
    },
    rules: await listCommercialApprovalRules(access.organizationId),
    existing: await listEstimateApprovals(estimate.id),
    claimedRuleId: String(formData.get("ruleId") ?? ""),
  });
  if (!decided.ok) return fail(estimatePath(estimate.opportunityId, estimate.id, version.versionNumber), explain(decided.error));
  if (!decided.replayed) await saveEstimateApproval(decided.approval);
  const path = estimatePath(estimate.opportunityId, estimate.id, version.versionNumber);
  revalidatePath(opportunityPath(estimate.opportunityId));
  revalidatePath(estimatePath(estimate.opportunityId, estimate.id));
  const message = decided.replayed
    ? `Version ${version.versionNumber} already has this decision.`
    : decision === "approved"
      ? `Version ${version.versionNumber} approved.`
      : `Version ${version.versionNumber} rejected.`;
  return succeed(path, message);
}

export async function discardEstimateDraft(formData: FormData): Promise<ActionState> {
  const access = await requireEditor();
  const estimateId = String(formData.get("estimateId") ?? "");
  const estimate = estimateId ? await getEstimate(estimateId) : null;
  const fallback = estimate
    ? estimatePath(estimate.opportunityId, estimate.id)
    : "/app/opportunities";
  if (!access.ok) return fail(fallback, access.error);
  if (!estimate) return fail(fallback, "That estimate could not be found.");
  const same = assertSameOrganization(access.organizationId, estimate.organizationId);
  if (!same.ok) return fail(fallback, same.error);
  return succeed(fallback, "Draft discarded.");
}
