import { describe, expect, it } from "vitest";
import { draftCrmFromRequest, parseCrmConversion } from "@/lib/ops/crm";
import { demoEstimateRequests } from "@/lib/ops/demo-data";
import {
  convertDemoOpportunityToProject,
  convertDemoRequestToCrm,
  getDemoCompany,
  getDemoEstimateRequest,
  getDemoJob,
  getDemoProject,
  listDemoOpportunities,
  matchesEstimateRequestFilters,
  updateDemoEstimateRequest,
  useDemoOpsStore,
} from "@/lib/ops/demo-store";

describe("demo ops store", () => {
  it("uses demo data when the database URL is absent", () => {
    expect(useDemoOpsStore({})).toBe(true);
    expect(useDemoOpsStore({ DATABASE_URL: "postgres://example" })).toBe(false);
    expect(
      useDemoOpsStore({ DATABASE_URL: "postgres://example", OPS_DEMO: "1" }),
    ).toBe(true);
  });

  it("filters demo requests by search and workflow", () => {
    const [qualified] = demoEstimateRequests();
    expect(
      matchesEstimateRequestFilters(qualified, { q: "acme", qualification: "qualified" }),
    ).toBe(true);
    expect(
      matchesEstimateRequestFilters(qualified, { workflowStatus: "won" }),
    ).toBe(false);
  });
});

describe("CRM conversion", () => {
  it("links an existing company and contact when converting a request", () => {
    const [qualified] = demoEstimateRequests();
    const draft = draftCrmFromRequest(qualified);
    const parsed = parseCrmConversion({
      ...draft,
      role: draft.role ?? undefined,
      owner: draft.owner ?? undefined,
      linkCompanyId: "66666666-6666-4666-8666-666666666666",
      linkContactId: "77777777-7777-4777-8777-777777777777",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = convertDemoRequestToCrm({
      leadId: qualified.id,
      actor: "estimating@strongfoam.com",
      input: parsed.value,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created.company).toBe(false);
    expect(result.created.contact).toBe(false);
    expect(result.created.site).toBe(true);
    expect(getDemoCompany(result.companyId)?.name).toBe("Acme Construction Ltd");

    const linked = getDemoEstimateRequest(qualified.id);
    expect(linked?.opportunityId).toBe(result.opportunityId);
    expect(listDemoOpportunities()[0]?.sourceLeadId).toBe(qualified.id);

    expect(
      convertDemoRequestToCrm({
        leadId: qualified.id,
        actor: "estimating@strongfoam.com",
        input: parsed.value,
      }).ok,
    ).toBe(false);
  });

  it("creates a project and job only after work is won", () => {
    const [, secondary] = demoEstimateRequests();
    const draft = draftCrmFromRequest(secondary);
    const parsed = parseCrmConversion({
      ...draft,
      role: draft.role ?? undefined,
      owner: draft.owner ?? undefined,
      createNew: true,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const crm = convertDemoRequestToCrm({
      leadId: secondary.id,
      actor: "estimating@strongfoam.com",
      input: parsed.value,
    });
    expect(crm.ok).toBe(true);
    if (!crm.ok) return;

    expect(
      convertDemoOpportunityToProject({
        opportunityId: crm.opportunityId,
        actor: "estimating@strongfoam.com",
        input: {
          projectName: "Sam attic",
          jobName: "Attic top-up",
          scope: "residential_other",
          projectManager: "Jordan Patel",
          foreman: null,
          plannedStartAt: null,
          plannedEndAt: null,
        },
      }).ok,
    ).toBe(false);

    updateDemoEstimateRequest({
      id: secondary.id,
      actor: "estimating@strongfoam.com",
      update: {
        workflowStatus: "won",
        assignedTo: "Jordan Patel",
        nextAction: "Schedule install",
        nextActionDueAt: null,
        lostReason: null,
      },
    });

    const converted = convertDemoOpportunityToProject({
      opportunityId: crm.opportunityId,
      actor: "estimating@strongfoam.com",
      input: {
        projectName: "Sam attic",
        jobName: "Attic top-up",
        scope: "residential_other",
        projectManager: "Jordan Patel",
        foreman: null,
        plannedStartAt: null,
        plannedEndAt: null,
      },
    });
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(getDemoProject(converted.projectId)?.name).toBe("Sam attic");
    expect(getDemoJob(converted.jobId)?.status).toBe("draft");
    expect(
      convertDemoOpportunityToProject({
        opportunityId: crm.opportunityId,
        actor: "estimating@strongfoam.com",
        input: {
          projectName: "Sam attic",
          jobName: "Second",
          scope: "",
          projectManager: null,
          foreman: null,
          plannedStartAt: null,
          plannedEndAt: null,
        },
      }).ok,
    ).toBe(false);
  });
});
