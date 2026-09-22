import { describe, expect, it } from "vitest";
import {
  changeOrderContentHash,
  evaluateChangeOrderApproval,
  formatScheduleImpact,
  nextChangeOrderNumber,
  parseChangeOrderPrice,
  parseScheduleImpactDays,
  planChangeOrderDecision,
  planChangeOrderDraft,
  revisedProjectBudget,
  type ChangeOrder,
} from "@/lib/ops/change-orders";
import type { CommercialApprovalRule } from "@/lib/ops/estimate-approvals";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

const now = new Date("2026-09-22T12:00:00.000Z");
const actor = {
  email: "admin@strongfoam.demo",
  role: "administrator" as const,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
};
const project = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", organizationId: STRONG_FOAM_ORGANIZATION_ID };

function draft(): ChangeOrder {
  const planned = planChangeOrderDraft({
    actor,
    project,
    existingNumbers: [],
    scope: "Add a bulkhead",
    priceCents: 150_000,
    scheduleImpactDays: 3,
    now,
  });
  if (!planned.ok) throw new Error(planned.error);
  return { ...planned.order, status: "pending" };
}

describe("change orders", () => {
  it("numbers orders and hashes scope, price, and schedule together", () => {
    expect(nextChangeOrderNumber(["CO-2", "CO-10", "draft"])).toBe("CO-11");
    const hash = changeOrderContentHash({
      scope: "Add a bulkhead",
      priceCents: 150_000,
      scheduleImpactDays: 3,
    });
    expect(hash).toHaveLength(64);
    expect(
      changeOrderContentHash({
        scope: "Add a bulkhead ",
        priceCents: 150_000,
        scheduleImpactDays: 3,
      }),
    ).toBe(hash);
    expect(parseChangeOrderPrice("-$12.50")).toEqual({ ok: true, cents: -1250 });
    expect(parseScheduleImpactDays("-2")).toEqual({ ok: true, days: -2 });
    expect(formatScheduleImpact(1)).toBe("+1 day");
    expect(formatScheduleImpact(-2)).toBe("-2 days");
  });

  it("revises the budget by approved price and schedule impact only", () => {
    expect(
      revisedProjectBudget({
        originalCents: 1_000_00,
        effects: [
          { priceCents: 250_00, scheduleImpactDays: 2 },
          { priceCents: -50_00, scheduleImpactDays: -1 },
        ],
      }),
    ).toEqual({ originalCents: 1_000_00, revisedCents: 1_200_00, scheduleImpactDays: 1 });
    expect(revisedProjectBudget({ originalCents: null, effects: [] }).revisedCents).toBe(0);
  });

  it("keeps a high-value change pending until a second approver agrees", () => {
    const order = draft();
    const rule: CommercialApprovalRule = {
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      name: "Two approvers",
      active: true,
      secondApproverTotalCents: 100_000,
    };
    const first = planChangeOrderDecision({
      actor,
      order,
      expectedHash: order.contentHash,
      decision: "approved",
      comment: "Scope matches the site note.",
      now,
      rules: [rule],
      existing: [],
    });
    if (!first.ok) throw new Error(first.error);
    expect(first.order.status).toBe("pending");
    expect(first.budgetEffect).toBeNull();
    const second = planChangeOrderDecision({
      actor: { ...actor, email: "second@strongfoam.demo" },
      order,
      expectedHash: "stale",
      decision: "approved",
      comment: "Confirmed.",
      now,
      rules: [rule],
      existing: [first.approval],
    });
    expect(second.ok).toBe(false);
    const completed = planChangeOrderDecision({
      actor: { ...actor, email: "second@strongfoam.demo" },
      order,
      expectedHash: order.contentHash,
      decision: "approved",
      comment: "Confirmed.",
      now,
      rules: [rule],
      existing: [first.approval],
    });
    if (!completed.ok) throw new Error(completed.error);
    expect(completed.order.status).toBe("approved");
    expect(completed.budgetEffect?.priceCents).toBe(150_000);
    expect(completed.budgetEffect?.scheduleImpactDays).toBe(3);
    const evaluated = evaluateChangeOrderApproval({
      now,
      organizationId: order.organizationId,
      changeOrderId: order.id,
      contentHash: order.contentHash,
      priceCents: order.priceCents,
      rules: [rule],
      decisions: [first.approval, completed.approval],
    });
    expect(evaluated.satisfied).toBe(true);
  });

  it("refuses an office user and a rejection writes no budget effect", () => {
    const order = draft();
    const office = planChangeOrderDecision({
      actor: { email: "office@strongfoam.demo", role: "office", organizationId: order.organizationId },
      order,
      expectedHash: order.contentHash,
      decision: "approved",
      comment: "Looks fine.",
      now,
      rules: [],
      existing: [],
    });
    expect(office.ok).toBe(false);
    const rejected = planChangeOrderDecision({
      actor,
      order,
      expectedHash: order.contentHash,
      decision: "rejected",
      comment: "Price is not agreed.",
      now,
      rules: [],
      existing: [],
    });
    if (!rejected.ok) throw new Error(rejected.error);
    expect(rejected.order.status).toBe("rejected");
    expect(rejected.budgetEffect).toBeNull();
  });
});
