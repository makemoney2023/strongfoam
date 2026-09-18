import { estimateRequestEvents, leads } from "@/db/schema";

export type EstimateRequestRow = typeof leads.$inferSelect;
export type EstimateRequestEvent = typeof estimateRequestEvents.$inferSelect;

const now = Date.now();

export function demoEstimateRequests(): EstimateRequestRow[] {
  return [
    {
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 60 * 60 * 1000),
      status: "qualified",
      bookingStatus: "offered",
      notifyStatus: "sent",
      workflowStatus: "new",
      assignedTo: null,
      nextAction: "Review drawings",
      nextActionDueAt: new Date(now + 24 * 60 * 60 * 1000),
      lostReason: null,
      email: "alex@acme-gc.example",
      phone: "519-555-0100",
      firstName: "Alex",
      lastName: "Lee",
      company: "Acme Construction",
      projectType: "commercial_ici",
      city: "Kitchener",
      province: "ON",
      services: ["spray-foam", "avb"],
      answers: {
        projectType: "commercial_ici",
        role: "gc",
        timeline: "0_3_months",
        notes: "Need closed-cell at the podium and AVB at the north elevation.",
      },
      recommendedServices: ["spray-foam", "avb"],
      files: [{ pathname: "leads/11111111-1111-4111-8111-111111111111/podium.pdf" }],
      sourcePath: "/request-estimate",
      utm: null,
      referrer: null,
      idempotencyKey: "demo-1",
      calendlyInviteeUri: null,
      consentAt: new Date(now - 2 * 60 * 60 * 1000),
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      createdAt: new Date(now - 26 * 60 * 60 * 1000),
      updatedAt: new Date(now - 26 * 60 * 60 * 1000),
      status: "secondary",
      bookingStatus: "none",
      notifyStatus: "sent",
      workflowStatus: "reviewing",
      assignedTo: "Jordan Patel",
      nextAction: "Call homeowner",
      nextActionDueAt: null,
      lostReason: null,
      email: "sam@home.example",
      phone: "519-555-0200",
      firstName: "Sam",
      lastName: "Home",
      company: "",
      projectType: "residential_other",
      city: "Ottawa",
      province: "ON",
      services: [],
      answers: {
        projectType: "residential_other",
        notes: "Attic top-up only.",
      },
      recommendedServices: [],
      files: [],
      sourcePath: "/request-estimate",
      utm: null,
      referrer: null,
      idempotencyKey: "demo-2",
      calendlyInviteeUri: null,
      consentAt: new Date(now - 26 * 60 * 60 * 1000),
    },
  ];
}

export function demoEstimateEvents(): EstimateRequestEvent[] {
  return [
    {
      id: "33333333-3333-4333-8333-333333333333",
      leadId: "22222222-2222-4222-8222-222222222222",
      createdAt: new Date(now - 20 * 60 * 60 * 1000),
      actor: "jordan@strongfoam.com",
      kind: "review_update",
      summary: "status new → reviewing; owner unassigned → Jordan Patel",
      payload: {},
    },
  ];
}
