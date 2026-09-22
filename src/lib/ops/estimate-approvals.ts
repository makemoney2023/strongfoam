import {
  assertSameOrganization,
  resolveCommercialAccess,
  type CommercialActor,
} from "@/lib/ops/commercial-authorization";

export const APPROVAL_DECISION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CommercialApprovalRule = {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
  secondApproverTotalCents: number | null;
};

export type EstimateApproval = {
  id: string;
  organizationId: string;
  estimateId: string;
  estimateVersionId: string;
  versionNumber: number;
  contentHash: string;
  ruleId: string;
  actorEmail: string;
  decision: "approved" | "rejected";
  comment: string;
  expiresAt: Date;
  createdAt: Date;
};

export function defaultApprovalRule(organizationId: string): CommercialApprovalRule {
  return {
    id: `default:${organizationId}`,
    organizationId,
    name: "Administrator approval",
    active: true,
    secondApproverTotalCents: null,
  };
}

export function evaluateApprovalRules(input: {
  now: Date;
  organizationId: string;
  versionId: string;
  contentHash: string;
  totalCents: number;
  rules: CommercialApprovalRule[];
  decisions: EstimateApproval[];
}): {
  rule: CommercialApprovalRule;
  requiredApprovals: number;
  approvals: EstimateApproval[];
  rejections: EstimateApproval[];
  satisfied: boolean;
  status: "pending" | "approved" | "rejected";
} {
  const rule =
    input.rules.find((item) => item.active && item.organizationId === input.organizationId) ??
    defaultApprovalRule(input.organizationId);
  const requiredApprovals =
    rule.secondApproverTotalCents != null && input.totalCents >= rule.secondApproverTotalCents
      ? 2
      : 1;
  const current = input.decisions.filter(
    (item) =>
      item.estimateVersionId === input.versionId &&
      item.contentHash === input.contentHash &&
      item.expiresAt > input.now,
  );
  const approvals = current.filter((item) => item.decision === "approved");
  const seen = new Set<string>();
  const distinctApprovals = approvals.filter((item) => {
    if (seen.has(item.actorEmail)) return false;
    seen.add(item.actorEmail);
    return true;
  });
  const rejections = current.filter((item) => item.decision === "rejected");
  const rejected = rejections.length > 0;
  const satisfied = !rejected && distinctApprovals.length >= requiredApprovals;
  return {
    rule,
    requiredApprovals,
    approvals: distinctApprovals,
    rejections,
    satisfied,
    status: rejected ? "rejected" : satisfied ? "approved" : "pending",
  };
}

export function decideEstimateVersion(input: {
  actor: CommercialActor & { email: string };
  expected: { estimateVersionId: string; contentHash: string };
  decision: "approved" | "rejected";
  comment: string;
  now: Date;
  loaded: {
    organizationId: string;
    estimateId: string;
    versionId: string;
    versionNumber: number;
    latestVersionNumber: number;
    contentHash: string;
    totalCents: number;
  };
  rules: CommercialApprovalRule[];
  existing: EstimateApproval[];
  claimedRuleId?: string | null;
}):
  | { ok: true; approval: EstimateApproval; replayed: boolean }
  | { ok: false; error: string } {
  const access = resolveCommercialAccess(input.actor, "estimate.approve");
  if (!access.ok) return { ok: false, error: access.error };
  const same = assertSameOrganization(access.organizationId, input.loaded.organizationId);
  if (!same.ok) return { ok: false, error: same.error };
  if (
    input.expected.estimateVersionId !== input.loaded.versionId ||
    input.expected.contentHash !== input.loaded.contentHash
  ) {
    return { ok: false, error: "stale-hash" };
  }
  if (input.loaded.versionNumber !== input.loaded.latestVersionNumber) {
    return { ok: false, error: "superseded" };
  }
  void input.claimedRuleId;
  const replay = input.existing.find(
    (item) =>
      item.actorEmail === input.actor.email &&
      item.estimateVersionId === input.loaded.versionId &&
      item.contentHash === input.loaded.contentHash &&
      item.decision === input.decision &&
      item.expiresAt > input.now,
  );
  if (replay) return { ok: true, approval: replay, replayed: true };
  const conflict = input.existing.find(
    (item) =>
      item.actorEmail === input.actor.email &&
      item.estimateVersionId === input.loaded.versionId &&
      item.expiresAt > input.now,
  );
  if (conflict) return { ok: false, error: "already-decided" };
  const evaluated = evaluateApprovalRules({
    now: input.now,
    organizationId: input.loaded.organizationId,
    versionId: input.loaded.versionId,
    contentHash: input.loaded.contentHash,
    totalCents: input.loaded.totalCents,
    rules: input.rules,
    decisions: input.existing,
  });
  return {
    ok: true,
    replayed: false,
    approval: {
      id: crypto.randomUUID(),
      organizationId: input.loaded.organizationId,
      estimateId: input.loaded.estimateId,
      estimateVersionId: input.loaded.versionId,
      versionNumber: input.loaded.versionNumber,
      contentHash: input.loaded.contentHash,
      ruleId: evaluated.rule.id,
      actorEmail: input.actor.email,
      decision: input.decision,
      comment: input.comment.trim(),
      expiresAt: new Date(input.now.getTime() + APPROVAL_DECISION_TTL_MS),
      createdAt: input.now,
    },
  };
}
