import { createHash } from "node:crypto";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import type {
  ChangeOrder,
  ChangeOrderApproval,
  ChangeOrderBudgetEffect,
} from "@/lib/ops/change-orders";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_CLOSED_JOB_ID,
  DEMO_FIELD_EMAIL,
  DEMO_FIELD_USER_ID,
  DEMO_JOB_ID,
  DEMO_MATERIAL_REQUEST_DRAFT_ID,
  DEMO_MATERIAL_REQUEST_ORDERED_ID,
  DEMO_ORGANIZATION_ID,
  DEMO_PROJECT_ID,
  DEMO_SECOND_JOB_ID,
} from "@/lib/ops/demo-data";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { DISPATCH_TIME_ZONE, type Dispatch } from "@/lib/ops/dispatch";
import type { EquipmentAssignment } from "@/lib/ops/equipment";
import type { LaborEntry } from "@/lib/ops/labor";
import { getOpsNow } from "@/lib/ops/ops-now";
import type { PurchaseOrder, PurchaseOrderLine } from "@/lib/ops/purchase-order";
import {
  shiftWorkDate,
  type ProductionAllocation,
  type ProductionEntry,
  type ProductionParticipant,
  type ProductionTarget,
} from "@/lib/ops/workforce-performance";

const TRADE = "spray foam";
const WORK_TYPE = "closed cell";
const TARGET_RATE_MILLI = 6_000;

function demoId(series: string, n: number): string {
  return `${series}${n.toString(16).padStart(6, "0")}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

export function demoOperationsAsOf(): string {
  return workingDayLabel(getOpsNow(), DISPATCH_TIME_ZONE);
}

function at(asOf: string, dayOffset: number): Date {
  return new Date(`${shiftWorkDate(asOf, dayOffset)}T15:00:00.000Z`);
}

function changeHash(input: {
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

export function demoPurchaseSeed(now = getOpsNow()): {
  orders: PurchaseOrder[];
  lines: PurchaseOrderLine[];
} {
  const createdAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const draft: PurchaseOrder = {
    id: demoId("d1", 1),
    organizationId: DEMO_ORGANIZATION_ID,
    jobId: DEMO_JOB_ID,
    supplier: "Spray Foam Distributors",
    note: "Deliver to the north gate before the morning start.",
    status: "draft",
    createdBy: DEMO_ADMIN_EMAIL,
    createdAt,
    updatedAt: now,
  };
  const ordered: PurchaseOrder = {
    id: demoId("d1", 2),
    organizationId: DEMO_ORGANIZATION_ID,
    jobId: DEMO_SECOND_JOB_ID,
    supplier: "Harbour Fireproof Supply",
    note: "Leave the skid in the penthouse vestibule.",
    status: "ordered",
    createdBy: DEMO_ADMIN_EMAIL,
    createdAt,
    updatedAt: now,
  };
  return {
    orders: [draft, ordered],
    lines: [
      {
        id: demoId("d2", 1),
        organizationId: DEMO_ORGANIZATION_ID,
        purchaseOrderId: draft.id,
        materialRequestId: DEMO_MATERIAL_REQUEST_DRAFT_ID,
        activeMaterialRequestId: DEMO_MATERIAL_REQUEST_DRAFT_ID,
        description: "AVB membrane for the north elevation.",
        quantity: 400,
        unit: "linear_ft",
        position: 0,
      },
      {
        id: demoId("d2", 2),
        organizationId: DEMO_ORGANIZATION_ID,
        purchaseOrderId: ordered.id,
        materialRequestId: DEMO_MATERIAL_REQUEST_ORDERED_ID,
        activeMaterialRequestId: DEMO_MATERIAL_REQUEST_ORDERED_ID,
        description: "Fireproofing cement for the mechanical room.",
        quantity: 24,
        unit: "bags",
        position: 0,
      },
    ],
  };
}

export function demoEquipmentSeed(now = getOpsNow()): EquipmentAssignment[] {
  const createdAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  return [
    {
      id: demoId("d3", 1),
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: DEMO_JOB_ID,
      name: "Graco E-30",
      nameKey: "graco e-30",
      note: "Stage at the north lift.",
      status: "assigned",
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt,
      updatedAt: now,
    },
    {
      id: demoId("d3", 2),
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: DEMO_SECOND_JOB_ID,
      name: "Graco E-30",
      nameKey: "graco e-30",
      note: "Penthouse mechanical room.",
      status: "assigned",
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: demoId("d3", 3),
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: DEMO_JOB_ID,
      name: "Genie S-45",
      nameKey: "genie s-45",
      note: "North elevation access.",
      status: "assigned",
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: demoId("d3", 4),
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: DEMO_CLOSED_JOB_ID,
      name: "Graco E-30",
      nameKey: "graco e-30",
      note: "Returned after closeout.",
      status: "released",
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export function demoDispatchSeed(asOf = demoOperationsAsOf(), now = getOpsNow()): Dispatch[] {
  return [
    {
      id: demoId("d4", 1),
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: asOf,
      status: "scheduled",
      note: "Podium deck closed-cell after the safety talk.",
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function hourlyLabor(id: string, asOf: string, dayOffset: number, note: string): LaborEntry {
  const createdAt = at(asOf, dayOffset);
  return {
    id,
    organizationId: DEMO_ORGANIZATION_ID,
    jobId: DEMO_JOB_ID,
    userId: DEMO_FIELD_USER_ID,
    workDate: shiftWorkDate(asOf, dayOffset),
    kind: "hourly",
    minutes: 8 * 60,
    quantity: null,
    unit: "",
    note,
    createdBy: DEMO_FIELD_EMAIL,
    createdAt,
    updatedAt: createdAt,
  };
}

export function demoLaborSeed(asOf = demoOperationsAsOf()): LaborEntry[] {
  const today = at(asOf, 0);
  return [
    hourlyLabor(demoId("d5", 1), asOf, -4, "Closed-cell on the podium deck."),
    hourlyLabor(demoId("d5", 2), asOf, -3, "Closed-cell on the podium deck."),
    hourlyLabor(demoId("d5", 3), asOf, -2, "Closed-cell on the podium deck."),
    hourlyLabor(demoId("d5", 4), asOf, -1, "Crew pass on the podium edge."),
    hourlyLabor(demoId("d5", 5), asOf, 0, "Podium deck spray after the safety talk."),
    {
      id: demoId("d5", 6),
      organizationId: DEMO_ORGANIZATION_ID,
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      workDate: asOf,
      kind: "piece",
      minutes: null,
      quantity: 40,
      unit: "bags",
      note: "Bags installed on the podium deck.",
      createdBy: DEMO_FIELD_EMAIL,
      createdAt: today,
      updatedAt: today,
    },
  ];
}

function verifiedEntry(
  id: string,
  asOf: string,
  dayOffset: number,
  quantity: number,
  attributionMode: ProductionEntry["attributionMode"],
): ProductionEntry {
  const createdAt = at(asOf, dayOffset);
  return {
    id,
    organizationId: DEMO_ORGANIZATION_ID,
    jobId: DEMO_JOB_ID,
    workDate: shiftWorkDate(asOf, dayOffset),
    taskId: null,
    workAreaId: null,
    trade: TRADE,
    workType: WORK_TYPE,
    unit: "bags",
    quantity,
    attributionMode,
    status: "verified",
    recordedBy: DEMO_FIELD_EMAIL,
    verifiedBy: DEMO_ADMIN_EMAIL,
    verifiedAt: createdAt,
    sourceType: null,
    sourceId: null,
    version: 1,
    createdAt,
    updatedAt: createdAt,
  };
}

export function demoProductionSeed(asOf = demoOperationsAsOf(), now = getOpsNow()): {
  entries: ProductionEntry[];
  participants: ProductionParticipant[];
  allocations: ProductionAllocation[];
  targets: ProductionTarget[];
} {
  const history = [
    verifiedEntry(demoId("d6", 1), asOf, -4, 48, "individual"),
    verifiedEntry(demoId("d6", 2), asOf, -3, 48, "individual"),
    verifiedEntry(demoId("d6", 3), asOf, -2, 48, "individual"),
    verifiedEntry(demoId("d6", 4), asOf, -1, 40, "crew"),
  ];
  const draft: ProductionEntry = {
    id: demoId("d6", 5),
    organizationId: DEMO_ORGANIZATION_ID,
    jobId: DEMO_JOB_ID,
    workDate: asOf,
    taskId: null,
    workAreaId: null,
    trade: TRADE,
    workType: WORK_TYPE,
    unit: "bags",
    quantity: 36,
    attributionMode: "individual",
    status: "draft",
    recordedBy: DEMO_FIELD_EMAIL,
    verifiedBy: null,
    verifiedAt: null,
    sourceType: null,
    sourceId: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  const entries = [...history, draft];
  const participants: ProductionParticipant[] = entries.map((entry, index) => ({
    id: demoId("d7", index + 1),
    productionEntryId: entry.id,
    userId: DEMO_FIELD_USER_ID,
    laborEntryId: demoId("d5", index + 1),
  }));
  const allocations: ProductionAllocation[] = history
    .filter((entry) => entry.attributionMode === "individual")
    .map((entry, index) => ({
      id: demoId("d8", index + 1),
      productionEntryId: entry.id,
      userId: DEMO_FIELD_USER_ID,
      quantity: entry.quantity,
    }));
  const approvedAt = new Date(`${shiftWorkDate(asOf, -30)}T15:00:00.000Z`);
  const targets: ProductionTarget[] = (["person_hour", "crew_hour"] as const).map((basis, index) => ({
    id: demoId("d9", index + 1),
    organizationId: DEMO_ORGANIZATION_ID,
    trade: TRADE,
    workType: WORK_TYPE,
    unit: "bags" as const,
    basis,
    rateMilli: TARGET_RATE_MILLI,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    approvedBy: DEMO_ADMIN_EMAIL,
    approvedAt,
  }));
  return { entries, participants, allocations, targets };
}

export function demoChangeOrderSeed(now = getOpsNow()): {
  orders: ChangeOrder[];
  approvals: ChangeOrderApproval[];
  effects: ChangeOrderBudgetEffect[];
} {
  const draftScope = "Add a second pass where the podium column line is thin.";
  const pendingScope = "Add closed-cell at the canopy return.";
  const approvedScope = "Return the podium edge detail omitted from the base scope.";
  const draftHash = changeHash({
    scope: draftScope,
    priceCents: 96000,
    scheduleImpactDays: 1,
  });
  const pendingHash = changeHash({
    scope: pendingScope,
    priceCents: 480000,
    scheduleImpactDays: 2,
  });
  const approvedHash = changeHash({
    scope: approvedScope,
    priceCents: 125000,
    scheduleImpactDays: 0,
  });
  const createdAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const approvedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const approval: ChangeOrderApproval = {
    id: demoId("db", 1),
    organizationId: DEMO_ORGANIZATION_ID,
    changeOrderId: demoId("da", 3),
    contentHash: approvedHash,
    ruleId: "44444444-4444-4444-8444-444444444401",
    actorEmail: DEMO_ADMIN_EMAIL,
    decision: "approved",
    comment: "Matches the field deficiency on the podium edge.",
    expiresAt: new Date(approvedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
    createdAt: approvedAt,
  };
  return {
    orders: [
      {
        id: demoId("da", 1),
        organizationId: DEMO_ORGANIZATION_ID,
        projectId: DEMO_PROJECT_ID,
        number: "CO-1",
        scope: draftScope,
        priceCents: 96000,
        scheduleImpactDays: 1,
        status: "draft",
        contentHash: draftHash,
        createdBy: DEMO_ADMIN_EMAIL,
        createdAt,
        updatedAt: now,
      },
      {
        id: demoId("da", 2),
        organizationId: DEMO_ORGANIZATION_ID,
        projectId: DEMO_PROJECT_ID,
        number: "CO-2",
        scope: pendingScope,
        priceCents: 480000,
        scheduleImpactDays: 2,
        status: "pending",
        contentHash: pendingHash,
        createdBy: DEMO_ADMIN_EMAIL,
        createdAt,
        updatedAt: now,
      },
      {
        id: demoId("da", 3),
        organizationId: DEMO_ORGANIZATION_ID,
        projectId: DEMO_PROJECT_ID,
        number: "CO-3",
        scope: approvedScope,
        priceCents: 125000,
        scheduleImpactDays: 0,
        status: "approved",
        contentHash: approvedHash,
        createdBy: DEMO_ADMIN_EMAIL,
        createdAt,
        updatedAt: approvedAt,
      },
    ],
    approvals: [approval],
    effects: [
      {
        id: demoId("dc", 1),
        organizationId: DEMO_ORGANIZATION_ID,
        projectId: DEMO_PROJECT_ID,
        changeOrderId: demoId("da", 3),
        approvalId: approval.id,
        contentHash: approvedHash,
        priceCents: 125000,
        scheduleImpactDays: 0,
        createdAt: approvedAt,
      },
    ],
  };
}

export function seedWhenDemo<T>(seed: () => T, empty: T): T {
  return isDemoOpsStore() ? seed() : empty;
}
