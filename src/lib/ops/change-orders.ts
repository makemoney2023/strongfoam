import { createHash } from "node:crypto";
import {
  assertSameOrganization,
  resolveCommercialAccess,
  type CommercialActor,
} from "@/lib/ops/commercial-authorization";
import {
  defaultApprovalRule,
  type CommercialApprovalRule,
} from "@/lib/ops/estimate-approvals";

export const CHANGE_ORDER_DECISION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const CHANGE_ORDER_SCOPE_MAX = 4_000;
export const CHANGE_ORDER_PRICE_LIMIT_CENTS = 10_000_000_000;
export const CHANGE_ORDER_SCHEDULE_LIMIT_DAYS = 3_650;

export const CHANGE_ORDER_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "void",
] as const;

export type ChangeOrderStatus = (typeof CHANGE_ORDER_STATUSES)[number];

export const CHANGE_ORDER_STATUS_LABELS: Record<ChangeOrderStatus, string> = {
  draft: "Draft",
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  void: "Void",
};

export type ChangeOrder = {
  id: string;
  organizationId: string;
  projectId: string;
  number: string;
  scope: string;
  priceCents: number;
  scheduleImpactDays: number;
  status: ChangeOrderStatus;
  contentHash: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ChangeOrderApproval = {
  id: string;
  organizationId: string;
  changeOrderId: string;
  contentHash: string;
  ruleId: string;
  actorEmail: string;
  decision: "approved" | "rejected";
  comment: string;
  expiresAt: Date;
  createdAt: Date;
};

export type ChangeOrderBudgetEffect = {
  id: string;
  organizationId: string;
  projectId: string;
  changeOrderId: string;
  approvalId: string;
  contentHash: string;
  priceCents: number;
  scheduleImpactDays: number;
  createdAt: Date;
};

export function changeOrderContentHash(input: {
  scope: string;
  priceCents: number;
  scheduleImpactDays: number;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        scope: input.scope.trim(),
        priceCents: input.priceCents,
        scheduleImpactDays: input.scheduleImpactDays,
      }),
    )
    .digest("hex");
}

export function nextChangeOrderNumber(existingNumbers: string[]): string {
  let max = 0;
  for (const number of existingNumbers) {
    const match = /^CO-(\d+)$/.exec(number);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }
  return `CO-${max + 1}`;
}

export function parseChangeOrderScope(
  raw: string,
): { ok: true; scope: string } | { ok: false; error: string } {
  const scope = raw.trim();
  if (!scope) return { ok: false, error: "Describe the scope of this change." };
  if (scope.length > CHANGE_ORDER_SCOPE_MAX) {
    return { ok: false, error: "Scope must be 4,000 characters or fewer." };
  }
  return { ok: true, scope };
}

export function parseChangeOrderPrice(
  raw: string,
): { ok: true; cents: number } | { ok: false; error: string } {
  const cleaned = raw.trim().replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, error: "Enter a price in dollars and cents." };
  }
  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [whole, fraction = ""] = unsigned.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    return { ok: false, error: "That price is too large." };
  }
  const signed = negative ? -cents : cents;
  if (Math.abs(signed) > CHANGE_ORDER_PRICE_LIMIT_CENTS) {
    return { ok: false, error: "That price is too large." };
  }
  return { ok: true, cents: signed };
}

export function parseScheduleImpactDays(
  raw: string,
): { ok: true; days: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, days: 0 };
  if (!/^-?\d+$/.test(trimmed)) {
    return { ok: false, error: "Schedule impact must be a whole number of days." };
  }
  const days = Number(trimmed);
  if (Math.abs(days) > CHANGE_ORDER_SCHEDULE_LIMIT_DAYS) {
    return { ok: false, error: "Schedule impact must be within 10 years." };
  }
  return { ok: true, days };
}

export function formatScheduleImpact(days: number): string {
  if (days === 0) return "No schedule change";
  const noun = Math.abs(days) === 1 ? "day" : "days";
  return days > 0 ? `+${days} ${noun}` : `${days} ${noun}`;
}

export function revisedProjectBudget(input: {
  originalCents: number | null;
  effects: Array<{ priceCents: number; scheduleImpactDays: number }>;
}): {
  originalCents: number | null;
  revisedCents: number;
  scheduleImpactDays: number;
} {
  const price = input.effects.reduce((sum, effect) => sum + effect.priceCents, 0);
  const days = input.effects.reduce((sum, effect) => sum + effect.scheduleImpactDays, 0);
  return {
    originalCents: input.originalCents,
    revisedCents: (input.originalCents ?? 0) + price,
    scheduleImpactDays: days,
  };
}

export function isUnapprovedChangeOrder(status: ChangeOrderStatus): boolean {
  return status === "draft" || status === "pending";
}

function approvalRule(
  organizationId: string,
  rules: CommercialApprovalRule[],
): CommercialApprovalRule {
  return (
    rules.find((item) => item.active && item.organizationId === organizationId) ??
    defaultApprovalRule(organizationId)
  );
}

export function evaluateChangeOrderApproval(input: {
  now: Date;
  organizationId: string;
  changeOrderId: string;
  contentHash: string;
  priceCents: number;
  rules: CommercialApprovalRule[];
  decisions: ChangeOrderApproval[];
}): {
  rule: CommercialApprovalRule;
  requiredApprovals: number;
  approvals: ChangeOrderApproval[];
  rejections: ChangeOrderApproval[];
  satisfied: boolean;
  status: "pending" | "approved" | "rejected";
} {
  const rule = approvalRule(input.organizationId, input.rules);
  const amount = Math.abs(input.priceCents);
  const requiredApprovals =
    rule.secondApproverTotalCents != null && amount >= rule.secondApproverTotalCents ? 2 : 1;
  const current = input.decisions.filter(
    (item) =>
      item.changeOrderId === input.changeOrderId &&
      item.contentHash === input.contentHash &&
      item.expiresAt > input.now,
  );
  const seen = new Set<string>();
  const approvals = current.filter((item) => {
    const actorEmail = item.actorEmail.trim().toLowerCase();
    if (item.decision !== "approved" || seen.has(actorEmail)) return false;
    seen.add(actorEmail);
    return true;
  });
  const rejections = current.filter((item) => item.decision === "rejected");
  const rejected = rejections.length > 0;
  const satisfied = !rejected && approvals.length >= requiredApprovals;
  return {
    rule,
    requiredApprovals,
    approvals,
    rejections,
    satisfied,
    status: rejected ? "rejected" : satisfied ? "approved" : "pending",
  };
}

export function planChangeOrderDraft(input: {
  actor: CommercialActor & { email: string };
  project: { id: string; organizationId: string };
  existingNumbers: string[];
  scope: string;
  priceCents: number;
  scheduleImpactDays: number;
  now: Date;
}): { ok: true; order: ChangeOrder } | { ok: false; error: string } {
  const access = resolveCommercialAccess(input.actor, "change_order.edit");
  if (!access.ok) return access;
  const same = assertSameOrganization(access.organizationId, input.project.organizationId);
  if (!same.ok) return same;
  return {
    ok: true,
    order: {
      id: crypto.randomUUID(),
      organizationId: input.project.organizationId,
      projectId: input.project.id,
      number: nextChangeOrderNumber(input.existingNumbers),
      scope: input.scope,
      priceCents: input.priceCents,
      scheduleImpactDays: input.scheduleImpactDays,
      status: "draft",
      contentHash: changeOrderContentHash(input),
      createdBy: input.actor.email,
      createdAt: input.now,
      updatedAt: input.now,
    },
  };
}

export function planChangeOrderUpdate(input: {
  actor: CommercialActor & { email: string };
  order: ChangeOrder;
  scope: string;
  priceCents: number;
  scheduleImpactDays: number;
  now: Date;
}): { ok: true; order: ChangeOrder } | { ok: false; error: string } {
  const access = resolveCommercialAccess(input.actor, "change_order.edit");
  if (!access.ok) return access;
  const same = assertSameOrganization(access.organizationId, input.order.organizationId);
  if (!same.ok) return same;
  if (input.order.status !== "draft") {
    return { ok: false, error: "Only a draft change order can be edited." };
  }
  return {
    ok: true,
    order: {
      ...input.order,
      scope: input.scope,
      priceCents: input.priceCents,
      scheduleImpactDays: input.scheduleImpactDays,
      contentHash: changeOrderContentHash(input),
      updatedAt: input.now,
    },
  };
}

export function planChangeOrderSubmit(input: {
  actor: CommercialActor & { email: string };
  order: ChangeOrder;
  now: Date;
}): { ok: true; order: ChangeOrder } | { ok: false; error: string } {
  const access = resolveCommercialAccess(input.actor, "change_order.edit");
  if (!access.ok) return access;
  const same = assertSameOrganization(access.organizationId, input.order.organizationId);
  if (!same.ok) return same;
  if (input.order.status !== "draft") {
    return { ok: false, error: "Only a draft change order can be submitted." };
  }
  return {
    ok: true,
    order: { ...input.order, status: "pending", updatedAt: input.now },
  };
}

export function planChangeOrderVoid(input: {
  actor: CommercialActor & { email: string };
  order: ChangeOrder;
  now: Date;
}): { ok: true; order: ChangeOrder } | { ok: false; error: string } {
  const access = resolveCommercialAccess(input.actor, "change_order.edit");
  if (!access.ok) return access;
  const same = assertSameOrganization(access.organizationId, input.order.organizationId);
  if (!same.ok) return same;
  if (input.order.status !== "draft") {
    return { ok: false, error: "Only a draft change order can be voided." };
  }
  return {
    ok: true,
    order: { ...input.order, status: "void", updatedAt: input.now },
  };
}

export function planChangeOrderDecision(input: {
  actor: CommercialActor & { email: string };
  order: ChangeOrder;
  expectedHash: string;
  decision: "approved" | "rejected";
  comment: string;
  now: Date;
  rules: CommercialApprovalRule[];
  existing: ChangeOrderApproval[];
}):
  | {
      ok: true;
      replayed: boolean;
      order: ChangeOrder;
      approval: ChangeOrderApproval;
      budgetEffect: ChangeOrderBudgetEffect | null;
    }
  | { ok: false; error: string } {
  const access = resolveCommercialAccess(input.actor, "change_order.approve");
  if (!access.ok) return access;
  const same = assertSameOrganization(access.organizationId, input.order.organizationId);
  if (!same.ok) return same;
  const comment = input.comment.trim();
  if (!comment) return { ok: false, error: "Add a comment so the decision has evidence." };
  if (comment.length > 1_000) {
    return { ok: false, error: "Comment must be 1,000 characters or fewer." };
  }
  const actorEmail = input.actor.email.trim().toLowerCase();
  const prior = input.existing.find(
    (item) =>
      item.actorEmail.trim().toLowerCase() === actorEmail &&
      item.changeOrderId === input.order.id,
  );
  if (
    prior &&
    prior.expiresAt > input.now &&
    prior.contentHash === input.order.contentHash &&
    prior.decision === input.decision &&
    input.expectedHash === input.order.contentHash
  ) {
    return {
      ok: true,
      replayed: true,
      order: input.order,
      approval: prior,
      budgetEffect: null,
    };
  }
  if (prior && prior.expiresAt > input.now && input.order.status !== "pending") {
    return { ok: false, error: "You already decided this change order." };
  }
  if (input.order.status !== "pending") {
    return { ok: false, error: "Only a submitted change order can be decided." };
  }
  if (input.expectedHash !== input.order.contentHash) {
    return { ok: false, error: "This change order changed. Review it again before deciding." };
  }
  if (prior && prior.expiresAt > input.now) {
    return { ok: false, error: "You already decided this change order." };
  }
  const approval: ChangeOrderApproval = {
    id: prior?.id ?? crypto.randomUUID(),
    organizationId: input.order.organizationId,
    changeOrderId: input.order.id,
    contentHash: input.order.contentHash,
    ruleId: approvalRule(input.order.organizationId, input.rules).id,
    actorEmail,
    decision: input.decision,
    comment,
    expiresAt: new Date(input.now.getTime() + CHANGE_ORDER_DECISION_TTL_MS),
    createdAt: input.now,
  };
  const evaluated = evaluateChangeOrderApproval({
    now: input.now,
    organizationId: input.order.organizationId,
    changeOrderId: input.order.id,
    contentHash: input.order.contentHash,
    priceCents: input.order.priceCents,
    rules: input.rules,
    decisions: [...input.existing, approval],
  });
  const order: ChangeOrder = {
    ...input.order,
    status: evaluated.status,
    updatedAt: input.now,
  };
  const budgetEffect =
    evaluated.status === "approved"
      ? {
          id: crypto.randomUUID(),
          organizationId: order.organizationId,
          projectId: order.projectId,
          changeOrderId: order.id,
          approvalId: approval.id,
          contentHash: order.contentHash,
          priceCents: order.priceCents,
          scheduleImpactDays: order.scheduleImpactDays,
          createdAt: input.now,
        }
      : null;
  return { ok: true, replayed: false, order, approval, budgetEffect };
}
