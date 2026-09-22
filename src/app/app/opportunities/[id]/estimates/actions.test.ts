import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOpsSession } = vi.hoisted(() => ({
  getOpsSession: vi.fn(),
}));

vi.mock("@/lib/ops/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ops/auth")>();
  return { ...actual, getOpsSession };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import {
  createOpportunityEstimate,
  discardEstimateDraft,
  saveEstimateVersion,
} from "@/app/app/opportunities/[id]/estimates/actions";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_USER_ID,
  DEMO_ESTIMATE_ID,
  DEMO_OPEN_OPPORTUNITY_ID,
  priceBookVersionId,
} from "@/lib/ops/demo-data";
import {
  listDemoEstimateGraphs,
  listDemoEstimates,
  listDemoJobs,
  listDemoProjects,
} from "@/lib/ops/demo-store";
import { STRONG_FOAM_ORGANIZATION_ID } from "@/lib/ops/identity";

const adminSession = {
  userId: DEMO_ADMIN_USER_ID,
  organizationId: STRONG_FOAM_ORGANIZATION_ID,
  email: DEMO_ADMIN_EMAIL,
  role: "administrator" as const,
  sessionVersion: 1,
  issuedAt: 1,
  expiresAt: 2,
  displayName: "Demo Administrator",
  legacy: false,
};

const officeSession = { ...adminSession, role: "office" as const, email: "office@strongfoam.demo" };
const fieldSession = { ...adminSession, role: "field_worker" as const, email: "field@strongfoam.demo" };

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function payload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    overheadBasisPoints: 0,
    markupBasisPoints: 0,
    taxBasisPoints: 0,
    clauses: [],
    alternates: [],
    lines: [
      {
        sortOrder: 0,
        category: "material",
        description: "Closed-cell spray foam",
        trade: "spray-foam",
        location: "Podium",
        method: "unit",
        quantity: "1.0000",
        unit: "bags",
        unitPriceCents: null,
        basisPoints: null,
        basisCategories: [],
        taxable: true,
        alternateKey: null,
        priceBookItemId: null,
        priceBookVersionId: priceBookVersionId("11111111-1111-4111-8111-111111111101"),
        sources: [],
      },
    ],
    jobPackages: [
      {
        key: "podium",
        name: "Podium closed-cell",
        trade: "spray-foam",
        scope: "Podium",
        sortOrder: 0,
        workAreas: [{ key: "area", name: "Podium", kind: "area", sortOrder: 0 }],
        tasks: [{ title: "Mask podium", workAreaKey: "area", sortOrder: 0 }],
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
  });
}

describe("estimate workspace actions", () => {
  beforeEach(() => {
    process.env.OPS_DEMO = "1";
    getOpsSession.mockReset();
  });

  it("sends an anonymous editor to login", async () => {
    getOpsSession.mockResolvedValue(null);
    await expect(
      saveEstimateVersion(form({ estimateId: DEMO_ESTIMATE_ID, payload: payload(), baseVersionNumber: "1" })),
    ).rejects.toThrow("REDIRECT:/app/login");
  });

  it("rejects a field session", async () => {
    getOpsSession.mockResolvedValue(fieldSession);
    await expect(
      saveEstimateVersion(form({ estimateId: DEMO_ESTIMATE_ID, payload: payload(), baseVersionNumber: "1" })),
    ).resolves.toMatchObject({
      error: "You do not have access to that commercial action.",
    });
  });

  it("rejects an estimate outside the session organization", async () => {
    getOpsSession.mockResolvedValue({
      ...officeSession,
      organizationId: "11111111-1111-4111-8111-111111111199",
    });
    await expect(
      saveEstimateVersion(
        form({
          estimateId: DEMO_ESTIMATE_ID,
          organizationId: STRONG_FOAM_ORGANIZATION_ID,
          payload: payload(),
          baseVersionNumber: "1",
        }),
      ),
    ).resolves.toMatchObject({
      error: "That record is outside this organization.",
    });
  });

  it("rejects an unknown price revision and a client-supplied total", async () => {
    getOpsSession.mockResolvedValue(officeSession);
    const before = listDemoEstimateGraphs(DEMO_ESTIMATE_ID).length;
    const invalidPrice = JSON.parse(payload()) as { lines: Array<Record<string, unknown>> };
    invalidPrice.lines[0].priceBookVersionId = "11111111-1111-4111-8111-111111111299";
    await expect(
      saveEstimateVersion(
        form({
          estimateId: DEMO_ESTIMATE_ID,
          payload: JSON.stringify(invalidPrice),
          baseVersionNumber: "1",
        }),
      ),
    ).resolves.toMatchObject({ error: "Choose an active approved price revision." });

    const clientTotal = JSON.parse(payload()) as { lines: Array<Record<string, unknown>> };
    clientTotal.lines[0].clientLineTotalCents = 1;
    await expect(
      saveEstimateVersion(
        form({
          estimateId: DEMO_ESTIMATE_ID,
          payload: JSON.stringify(clientTotal),
          baseVersionNumber: "1",
        }),
      ),
    ).resolves.toMatchObject({ error: "Line totals are calculated by the server." });
    expect(listDemoEstimateGraphs(DEMO_ESTIMATE_ID)).toHaveLength(before);
  });

  it("rejects a stale base version", async () => {
    getOpsSession.mockResolvedValue(officeSession);
    await expect(
      saveEstimateVersion(
        form({ estimateId: DEMO_ESTIMATE_ID, payload: payload(), baseVersionNumber: "0" }),
      ),
    ).resolves.toMatchObject({
      error: "That estimate version is stale. Reload the latest version.",
    });
  });

  it("creates the next version without a project or job", async () => {
    getOpsSession.mockResolvedValue(officeSession);
    const versionsBefore = listDemoEstimateGraphs(DEMO_ESTIMATE_ID).length;
    const projects = listDemoProjects().length;
    const jobs = listDemoJobs().length;
    const saved = await saveEstimateVersion(
      form({
        estimateId: DEMO_ESTIMATE_ID,
        organizationId: "11111111-1111-4111-8111-111111111199",
        payload: payload(),
        baseVersionNumber: String(versionsBefore),
      }),
    );
    expect(saved.notice?.message).toBe(`Estimate version ${versionsBefore + 1} created.`);
    expect(listDemoEstimateGraphs(DEMO_ESTIMATE_ID)).toHaveLength(versionsBefore + 1);
    expect(listDemoProjects()).toHaveLength(projects);
    expect(listDemoJobs()).toHaveLength(jobs);
  });

  it("discards a draft without creating a version", async () => {
    getOpsSession.mockResolvedValue(officeSession);
    const before = listDemoEstimateGraphs(DEMO_ESTIMATE_ID).length;
    const discarded = await discardEstimateDraft(form({ estimateId: DEMO_ESTIMATE_ID }));
    expect(discarded.notice?.message).toBe("Draft discarded.");
    expect(listDemoEstimateGraphs(DEMO_ESTIMATE_ID)).toHaveLength(before);
  });

  it("creates version 1 for an opportunity and no project", async () => {
    getOpsSession.mockResolvedValue(officeSession);
    const estimatesBefore = listDemoEstimates(STRONG_FOAM_ORGANIZATION_ID).length;
    const projects = listDemoProjects().length;
    const created = await createOpportunityEstimate(
      form({
        opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
        organizationId: "11111111-1111-4111-8111-111111111199",
      }),
    );
    expect(created.notice?.message).toBe("Estimate version 1 created.");
    expect(listDemoEstimates(STRONG_FOAM_ORGANIZATION_ID)).toHaveLength(estimatesBefore + 1);
    expect(listDemoProjects()).toHaveLength(projects);
    const createdEstimate = listDemoEstimates(STRONG_FOAM_ORGANIZATION_ID).find(
      (estimate) => estimate.id !== DEMO_ESTIMATE_ID && estimate.opportunityId === DEMO_OPEN_OPPORTUNITY_ID,
    );
    expect(createdEstimate?.organizationId).toBe(STRONG_FOAM_ORGANIZATION_ID);
    expect(listDemoEstimateGraphs(createdEstimate?.id).map((graph) => graph.versionNumber)).toEqual([1]);
  });
});
