import {
  companies,
  contacts,
  estimateRequestComments,
  estimateRequestEvents,
  estimateRequestTasks,
  jobDocuments,
  jobEvents,
  jobFieldNotes,
  jobTaskDependencies,
  jobTasks,
  jobs,
  leads,
  opportunities,
  projects,
  sites,
  workAreas,
} from "@/db/schema";

export type EstimateRequestRow = typeof leads.$inferSelect;
export type EstimateRequestEvent = typeof estimateRequestEvents.$inferSelect;
export type EstimateRequestTask = typeof estimateRequestTasks.$inferSelect;
export type EstimateRequestComment = typeof estimateRequestComments.$inferSelect;
export type CompanyRow = typeof companies.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type SiteRow = typeof sites.$inferSelect;
export type OpportunityRow = typeof opportunities.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type JobEventRow = typeof jobEvents.$inferSelect;
export type WorkAreaRow = typeof workAreas.$inferSelect;
export type JobTaskRow = typeof jobTasks.$inferSelect;
export type JobTaskDependencyRow = typeof jobTaskDependencies.$inferSelect;
export type JobDocumentRow = typeof jobDocuments.$inferSelect;
export type JobFieldNoteRow = typeof jobFieldNotes.$inferSelect;

export const DEMO_PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const DEMO_JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const DEMO_WORK_AREA_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const DEMO_JOB_TASK_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const DEMO_FIELD_NOTE_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
export const DEMO_OPPORTUNITY_ID = "99999999-9999-4999-8999-999999999999";

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
      companyId: null,
      contactId: null,
      siteId: null,
      opportunityId: null,
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
      companyId: null,
      contactId: null,
      siteId: null,
      opportunityId: null,
    },
  ];
}

export function demoCompanies(): CompanyRow[] {
  return [
    {
      id: "66666666-6666-4666-8666-666666666666",
      createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      name: "Acme Construction Ltd",
      email: "office@acme-ltd.example",
      phone: "519-555-0188",
      city: "Waterloo",
      province: "ON",
    },
  ];
}

export function demoContacts(): ContactRow[] {
  return [
    {
      id: "77777777-7777-4777-8777-777777777777",
      createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      companyId: "66666666-6666-4666-8666-666666666666",
      firstName: "Alex",
      lastName: "Lee",
      email: "alex@acme-gc.example",
      phone: "519-555-0199",
      role: "General contractor / construction manager",
    },
  ];
}

export function demoSites(): SiteRow[] {
  return [
    {
      id: "88888888-8888-4888-8888-888888888888",
      createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
      companyId: "66666666-6666-4666-8666-666666666666",
      name: "Waterloo yard",
      city: "Waterloo",
      province: "ON",
    },
  ];
}

export function demoOpportunities(): OpportunityRow[] {
  return [
    {
      id: DEMO_OPPORTUNITY_ID,
      createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
      companyId: "66666666-6666-4666-8666-666666666666",
      contactId: "77777777-7777-4777-8777-777777777777",
      siteId: "88888888-8888-4888-8888-888888888888",
      sourceLeadId: null,
      name: "Acme podium — Waterloo",
      stage: "won",
      owner: "Alex Rivera",
      source: "repeat-customer",
      services: ["spray-foam", "avb"],
      projectType: "commercial_ici",
      projectId: DEMO_PROJECT_ID,
    },
  ];
}

export function demoProjects(): ProjectRow[] {
  return [
    {
      id: DEMO_PROJECT_ID,
      createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
      companyId: "66666666-6666-4666-8666-666666666666",
      siteId: "88888888-8888-4888-8888-888888888888",
      opportunityId: DEMO_OPPORTUNITY_ID,
      sourceLeadId: null,
      name: "Acme podium insulation",
      status: "active",
      projectManager: "Alex Rivera",
    },
  ];
}

export function demoJobs(): JobRow[] {
  return [
    {
      id: DEMO_JOB_ID,
      createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      projectId: DEMO_PROJECT_ID,
      companyId: "66666666-6666-4666-8666-666666666666",
      siteId: "88888888-8888-4888-8888-888888888888",
      opportunityId: DEMO_OPPORTUNITY_ID,
      name: "North elevation spray foam",
      status: "in_progress",
      scope: "Closed-cell at the podium deck and AVB at the north elevation.",
      services: ["spray-foam", "avb"],
      projectManager: "Alex Rivera",
      foreman: "Morgan Cole",
      plannedStartAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      plannedEndAt: new Date(now + 4 * 24 * 60 * 60 * 1000),
      blockerNote: null,
    },
  ];
}

export function demoJobEvents(): JobEventRow[] {
  return [
    {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      jobId: DEMO_JOB_ID,
      createdAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
      actor: "estimating@strongfoam.com",
      kind: "job_created",
      summary: "job created from won work: North elevation spray foam",
      payload: { projectId: DEMO_PROJECT_ID, opportunityId: DEMO_OPPORTUNITY_ID },
    },
  ];
}

export function demoWorkAreas(): WorkAreaRow[] {
  return [
    {
      id: DEMO_WORK_AREA_ID,
      createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
      jobId: DEMO_JOB_ID,
      name: "Level 2 podium",
      kind: "floor",
      notes: "North elevation and podium deck.",
      sortOrder: 0,
    },
  ];
}

export function demoJobTasks(): JobTaskRow[] {
  return [
    {
      id: DEMO_JOB_TASK_ID,
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      jobId: DEMO_JOB_ID,
      workAreaId: DEMO_WORK_AREA_ID,
      title: "Install closed-cell at podium deck",
      assignee: "Morgan Cole",
      dueAt: new Date(now + 24 * 60 * 60 * 1000),
      plannedStartAt: null,
      plannedEndAt: null,
      completedAt: null,
      status: "open",
      createdBy: "alex.rivera@strongfoam.com",
    },
  ];
}

export function demoJobDocuments(): JobDocumentRow[] {
  return [];
}

export function demoJobFieldNotes(): JobFieldNoteRow[] {
  return [
    {
      id: DEMO_FIELD_NOTE_ID,
      createdAt: new Date(now - 6 * 60 * 60 * 1000),
      jobId: DEMO_JOB_ID,
      workAreaId: DEMO_WORK_AREA_ID,
      taskId: DEMO_JOB_TASK_ID,
      kind: "note",
      body: "Staging is complete. Start closed-cell at the podium deck after the morning safety talk.",
      quantity: null,
      unit: null,
      createdBy: "morgan.cole@strongfoam.com",
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

export function demoEstimateTasks(): EstimateRequestTask[] {
  return [
    {
      id: "44444444-4444-4444-8444-444444444444",
      leadId: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date(now - 90 * 60 * 1000),
      updatedAt: new Date(now - 90 * 60 * 1000),
      title: "Confirm podium R-value target",
      assignee: "Alex Rivera",
      dueAt: new Date(now + 18 * 60 * 60 * 1000),
      status: "open",
      createdBy: "estimating@strongfoam.com",
    },
  ];
}

export function demoEstimateComments(): EstimateRequestComment[] {
  return [
    {
      id: "55555555-5555-4555-8555-555555555555",
      leadId: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date(now - 70 * 60 * 1000),
      actor: "estimating@strongfoam.com",
      body: "@alex drawings look complete except the north elevation.",
    },
  ];
}
