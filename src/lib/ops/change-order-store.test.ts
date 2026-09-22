import { beforeEach, describe, expect, it } from "vitest";
import {
  createChangeOrder,
  decideChangeOrder,
  getProjectChangeOrderView,
  resetChangeOrdersForTests,
  submitChangeOrder,
  updateChangeOrderDraft,
  voidChangeOrder,
} from "@/lib/ops/change-order-store";
import { DEMO_PROJECT_ID } from "@/lib/ops/demo-data";
import { listDemoApprovalRules, saveDemoApprovalRule } from "@/lib/ops/demo-store";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

const admin = {
  email: "admin@strongfoam.demo",
  role: "administrator" as const,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
};
const office = {
  email: "office@strongfoam.demo",
  role: "office" as const,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
};

describe("change order store", () => {
  beforeEach(() => {
    resetChangeOrdersForTests();
  });

  it("approves a submitted draft once and revises the project budget", async () => {
    const created = await createChangeOrder({
      actor: office,
      projectId: DEMO_PROJECT_ID,
      scope: "Close the extra bay",
      price: "1800.00",
      scheduleImpactDays: "4",
    });
    if (!created.ok) throw new Error(created.error);
    expect(created.order.number).toBe("CO-1");
    expect(created.order.status).toBe("draft");

    const submitted = await submitChangeOrder({
      actor: office,
      projectId: DEMO_PROJECT_ID,
      changeOrderId: created.order.id,
    });
    if (!submitted.ok) throw new Error(submitted.error);
    const edited = await updateChangeOrderDraft({
      actor: office,
      projectId: DEMO_PROJECT_ID,
      changeOrderId: created.order.id,
      scope: "Too late",
      price: "1.00",
      scheduleImpactDays: "0",
    });
    expect(edited.ok).toBe(false);

    const denied = await decideChangeOrder({
      actor: office,
      projectId: DEMO_PROJECT_ID,
      changeOrderId: created.order.id,
      expectedHash: submitted.order.contentHash,
      decision: "approved",
      comment: "Office cannot approve.",
    });
    expect(denied.ok).toBe(false);

    const approved = await decideChangeOrder({
      actor: admin,
      projectId: DEMO_PROJECT_ID,
      changeOrderId: created.order.id,
      expectedHash: submitted.order.contentHash,
      decision: "approved",
      comment: "Matches the site instruction.",
    });
    if (!approved.ok) throw new Error(approved.error);
    expect(approved.order.status).toBe("approved");
    const replay = await decideChangeOrder({
      actor: { ...admin, email: "Admin@StrongFoam.demo" },
      projectId: DEMO_PROJECT_ID,
      changeOrderId: created.order.id,
      expectedHash: submitted.order.contentHash,
      decision: "approved",
      comment: "Matches the site instruction.",
    });
    expect(replay.ok).toBe(true);
    const wrongProject = await voidChangeOrder({
      actor: admin,
      projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      changeOrderId: created.order.id,
    });
    expect(wrongProject.ok).toBe(false);

    const view = await getProjectChangeOrderView(STRONG_FOAM_ORGANIZATION_ID, DEMO_PROJECT_ID);
    expect(view.effects).toHaveLength(1);
    expect(view.effects[0]?.priceCents).toBe(180_000);
    expect(view.effects[0]?.scheduleImpactDays).toBe(4);
    expect(view.budget.revisedCents).toBe((view.budget.originalCents ?? 0) + 180_000);
    expect(view.approvals).toHaveLength(1);
  });

  it("revises the budget only after the second administrator approves", async () => {
    const rule = {
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: STRONG_FOAM_ORGANIZATION_ID,
      name: "Two approvers",
      active: true,
      secondApproverTotalCents: 100,
    };
    const previous = listDemoApprovalRules(STRONG_FOAM_ORGANIZATION_ID);
    for (const existing of previous) saveDemoApprovalRule({ ...existing, active: false });
    saveDemoApprovalRule(rule);
    try {
      const created = await createChangeOrder({
        actor: office,
        projectId: DEMO_PROJECT_ID,
        scope: "Add a lift day",
        price: "500.00",
        scheduleImpactDays: "1",
      });
      if (!created.ok) throw new Error(created.error);
      const submitted = await submitChangeOrder({
        actor: office,
        projectId: DEMO_PROJECT_ID,
        changeOrderId: created.order.id,
      });
      if (!submitted.ok) throw new Error(submitted.error);
      const first = await decideChangeOrder({
        actor: admin,
        projectId: DEMO_PROJECT_ID,
        changeOrderId: created.order.id,
        expectedHash: submitted.order.contentHash,
        decision: "approved",
        comment: "Scope is right.",
      });
      if (!first.ok) throw new Error(first.error);
      expect(first.order.status).toBe("pending");
      let view = await getProjectChangeOrderView(STRONG_FOAM_ORGANIZATION_ID, DEMO_PROJECT_ID);
      expect(view.effects).toHaveLength(0);
      const second = await decideChangeOrder({
        actor: { ...admin, email: "second@strongfoam.demo" },
        projectId: DEMO_PROJECT_ID,
        changeOrderId: created.order.id,
        expectedHash: submitted.order.contentHash,
        decision: "approved",
        comment: "Price is agreed.",
      });
      if (!second.ok) throw new Error(second.error);
      expect(second.order.status).toBe("approved");
      view = await getProjectChangeOrderView(STRONG_FOAM_ORGANIZATION_ID, DEMO_PROJECT_ID);
      expect(view.effects).toHaveLength(1);
      expect(view.effects[0]?.priceCents).toBe(50_000);
    } finally {
      saveDemoApprovalRule({ ...rule, active: false });
      for (const existing of previous) saveDemoApprovalRule(existing);
    }
  });

  it("voids a draft without a budget effect", async () => {
    const created = await createChangeOrder({
      actor: admin,
      projectId: DEMO_PROJECT_ID,
      scope: "Hold the extra lift",
      price: "0",
      scheduleImpactDays: "",
    });
    if (!created.ok) throw new Error(created.error);
    const voided = await voidChangeOrder({
      actor: admin,
      projectId: DEMO_PROJECT_ID,
      changeOrderId: created.order.id,
    });
    if (!voided.ok) throw new Error(voided.error);
    expect(voided.order.status).toBe("void");
    const view = await getProjectChangeOrderView(STRONG_FOAM_ORGANIZATION_ID, DEMO_PROJECT_ID);
    expect(view.effects).toHaveLength(0);
  });
});
