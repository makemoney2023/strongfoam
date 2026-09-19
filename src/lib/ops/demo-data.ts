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
  projectScheduleBaselineItems,
  projectScheduleBaselines,
  projects,
  scheduleCalendarExceptions,
  scheduleCalendars,
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
export type ScheduleCalendarRow = typeof scheduleCalendars.$inferSelect;
export type ScheduleCalendarExceptionRow =
  typeof scheduleCalendarExceptions.$inferSelect;
export type ProjectScheduleBaselineRow =
  typeof projectScheduleBaselines.$inferSelect;
export type ProjectScheduleBaselineItemRow =
  typeof projectScheduleBaselineItems.$inferSelect;
export type JobDocumentRow = typeof jobDocuments.$inferSelect;
export type JobFieldNoteRow = typeof jobFieldNotes.$inferSelect;

export const DEMO_PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const DEMO_JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const DEMO_WORK_AREA_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const DEMO_JOB_TASK_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const DEMO_FIELD_NOTE_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
export const DEMO_OPPORTUNITY_ID = "99999999-9999-4999-8999-999999999999";
export const DEMO_SCHEDULE_NOW = "2026-09-19T12:00:00.000Z";

const now = new Date(DEMO_SCHEDULE_NOW).getTime();
const DAY = 24 * 60 * 60 * 1000;

const DEMO_SECOND_PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const DEMO_EMPTY_PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const DEMO_CLOSED_PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const DEMO_SECOND_JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const DEMO_BLOCKED_JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3";
const DEMO_CLOSED_JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4";
const DEMO_DEFAULT_CALENDAR_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_FIRST_CALENDAR_ID = "ca000001-0000-4000-8000-000000000001";
const DEMO_SECOND_CALENDAR_ID = "ca000002-0000-4000-8000-000000000002";

function demoDate(dayOffset: number): Date {
  return new Date(now + dayOffset * DAY);
}

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
      scheduleCalendarId: DEMO_FIRST_CALENDAR_ID,
    },
    {
      id: DEMO_SECOND_PROJECT_ID,
      createdAt: demoDate(-7),
      updatedAt: demoDate(-1),
      companyId: "66666666-6666-4666-8666-666666666666",
      siteId: "88888888-8888-4888-8888-888888888888",
      opportunityId: null,
      sourceLeadId: null,
      name: "Harbour mechanical retrofit",
      status: "active",
      projectManager: "Jordan Patel",
      scheduleCalendarId: DEMO_SECOND_CALENDAR_ID,
    },
    {
      id: DEMO_EMPTY_PROJECT_ID,
      createdAt: demoDate(-6),
      updatedAt: demoDate(-2),
      companyId: "66666666-6666-4666-8666-666666666666",
      siteId: "88888888-8888-4888-8888-888888888888",
      opportunityId: null,
      sourceLeadId: null,
      name: "Elm Street attic",
      status: "active",
      projectManager: "Taylor Singh",
      scheduleCalendarId: null,
    },
    {
      id: DEMO_CLOSED_PROJECT_ID,
      createdAt: demoDate(-30),
      updatedAt: demoDate(-4),
      companyId: "66666666-6666-4666-8666-666666666666",
      siteId: "88888888-8888-4888-8888-888888888888",
      opportunityId: null,
      sourceLeadId: null,
      name: "King Street closeout",
      status: "closed",
      projectManager: "Alex Rivera",
      scheduleCalendarId: null,
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
      plannedStartAt: demoDate(-1),
      plannedEndAt: demoDate(13),
      blockerNote: null,
    },
    {
      id: DEMO_SECOND_JOB_ID,
      createdAt: demoDate(-7),
      updatedAt: demoDate(-1),
      projectId: DEMO_SECOND_PROJECT_ID,
      companyId: "66666666-6666-4666-8666-666666666666",
      siteId: "88888888-8888-4888-8888-888888888888",
      opportunityId: null,
      name: "Mechanical room fireproofing",
      status: "in_progress",
      scope: "Fireproofing and insulation at the mechanical penthouse.",
      services: ["spray-foam"],
      projectManager: "Jordan Patel",
      foreman: "Casey Wong",
      plannedStartAt: demoDate(3),
      plannedEndAt: demoDate(6),
      blockerNote: null,
    },
    {
      id: DEMO_BLOCKED_JOB_ID,
      createdAt: demoDate(-5),
      updatedAt: demoDate(-1),
      projectId: DEMO_SECOND_PROJECT_ID,
      companyId: "66666666-6666-4666-8666-666666666666",
      siteId: "88888888-8888-4888-8888-888888888888",
      opportunityId: null,
      name: "Loading dock air barrier",
      status: "blocked",
      scope: "Awaiting substrate remediation before AVB installation.",
      services: ["avb"],
      projectManager: "Jordan Patel",
      foreman: null,
      plannedStartAt: null,
      plannedEndAt: null,
      blockerNote: "Concrete repairs must cure before installation.",
    },
    {
      id: DEMO_CLOSED_JOB_ID,
      createdAt: demoDate(-30),
      updatedAt: demoDate(-4),
      projectId: DEMO_CLOSED_PROJECT_ID,
      companyId: "66666666-6666-4666-8666-666666666666",
      siteId: "88888888-8888-4888-8888-888888888888",
      opportunityId: null,
      name: "Closeout deficiency review",
      status: "closed",
      scope: "Final deficiency walk and closeout package.",
      services: ["spray-foam"],
      projectManager: "Alex Rivera",
      foreman: "Morgan Cole",
      plannedStartAt: demoDate(-12),
      plannedEndAt: demoDate(-8),
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
      title: "Prepare podium deck",
      assignee: "Morgan Cole",
      dueAt: demoDate(-1),
      plannedStartAt: demoDate(2),
      plannedEndAt: demoDate(3),
      completedAt: null,
      status: "open",
      createdBy: "alex.rivera@strongfoam.com",
    },
    {
      id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      jobId: DEMO_JOB_ID,
      workAreaId: DEMO_WORK_AREA_ID,
      title: "Install closed-cell at podium deck",
      assignee: "Jamie Brooks",
      dueAt: demoDate(6),
      plannedStartAt: demoDate(4),
      plannedEndAt: demoDate(6),
      completedAt: null,
      status: "open",
      createdBy: "alex.rivera@strongfoam.com",
    },
    {
      id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd3",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      jobId: DEMO_JOB_ID,
      workAreaId: DEMO_WORK_AREA_ID,
      title: "Parallel Weekend-only staging",
      assignee: "Morgan Cole",
      dueAt: demoDate(7),
      plannedStartAt: demoDate(7),
      plannedEndAt: demoDate(7),
      completedAt: null,
      status: "open",
      createdBy: "alex.rivera@strongfoam.com",
    },
    {
      id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      jobId: DEMO_JOB_ID,
      workAreaId: null,
      title: "Confirm north elevation access",
      assignee: null,
      dueAt: null,
      plannedStartAt: null,
      plannedEndAt: null,
      completedAt: null,
      status: "open",
      createdBy: "alex.rivera@strongfoam.com",
    },
    {
      id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd5",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      jobId: DEMO_JOB_ID,
      workAreaId: null,
      title: "Submit podium inspection photos",
      assignee: "Jamie Brooks",
      dueAt: demoDate(8),
      plannedStartAt: null,
      plannedEndAt: null,
      completedAt: null,
      status: "open",
      createdBy: "alex.rivera@strongfoam.com",
    },
    {
      id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd6",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      jobId: DEMO_SECOND_JOB_ID,
      workAreaId: null,
      title: "Lay out mechanical room",
      assignee: "  morgan   cole ",
      dueAt: demoDate(-2),
      plannedStartAt: demoDate(3),
      plannedEndAt: demoDate(4),
      completedAt: null,
      status: "open",
      createdBy: "jordan.patel@strongfoam.com",
    },
    {
      id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd7",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      jobId: DEMO_SECOND_JOB_ID,
      workAreaId: null,
      title: "Apply mechanical room fireproofing",
      assignee: "Casey Wong",
      dueAt: demoDate(6),
      plannedStartAt: demoDate(5),
      plannedEndAt: demoDate(6),
      completedAt: null,
      status: "open",
      createdBy: "jordan.patel@strongfoam.com",
    },
    {
      id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd8",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      jobId: DEMO_SECOND_JOB_ID,
      workAreaId: null,
      title: "Parallel Weekend-only material check",
      assignee: "morgan cole",
      dueAt: demoDate(7),
      plannedStartAt: demoDate(7),
      plannedEndAt: demoDate(7),
      completedAt: null,
      status: "open",
      createdBy: "jordan.patel@strongfoam.com",
    },
    {
      id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd9",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      jobId: DEMO_SECOND_JOB_ID,
      workAreaId: null,
      title: "Issue mechanical room QA report",
      assignee: "Casey Wong",
      dueAt: demoDate(10),
      plannedStartAt: null,
      plannedEndAt: null,
      completedAt: null,
      status: "open",
      createdBy: "jordan.patel@strongfoam.com",
    },
  ];
}

export function demoJobTaskDependencies(): JobTaskDependencyRow[] {
  return [
    {
      id: "de000001-0000-4000-8000-000000000001",
      createdAt: demoDate(-2),
      projectId: DEMO_PROJECT_ID,
      predecessorTaskId: DEMO_JOB_TASK_ID,
      successorTaskId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
      lagDays: 0,
      createdBy: "alex.rivera@strongfoam.com",
    },
    {
      id: "de000002-0000-4000-8000-000000000002",
      createdAt: demoDate(-2),
      projectId: DEMO_SECOND_PROJECT_ID,
      predecessorTaskId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd6",
      successorTaskId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd7",
      lagDays: 0,
      createdBy: "jordan.patel@strongfoam.com",
    },
  ];
}

export function demoScheduleCalendars(): ScheduleCalendarRow[] {
  return [
    {
      id: DEMO_DEFAULT_CALENDAR_ID,
      createdAt: new Date("2000-01-01T00:00:00.000Z"),
      updatedAt: new Date("2000-01-01T00:00:00.000Z"),
      updatedBy: "system@strongfoam.com",
      name: "Standard Monday–Friday",
      timeZone: "America/Toronto",
      weekendDays: [0, 6],
      isDefault: true,
    },
    {
      id: DEMO_FIRST_CALENDAR_ID,
      createdAt: demoDate(-8),
      updatedAt: demoDate(-2),
      updatedBy: "alex.rivera@strongfoam.com",
      name: "Acme site calendar",
      timeZone: "America/Toronto",
      weekendDays: [0, 6],
      isDefault: false,
    },
    {
      id: DEMO_SECOND_CALENDAR_ID,
      createdAt: demoDate(-7),
      updatedAt: demoDate(-2),
      updatedBy: "jordan.patel@strongfoam.com",
      name: "Harbour four-day calendar",
      timeZone: "America/Toronto",
      weekendDays: [0, 5, 6],
      isDefault: false,
    },
  ];
}

export function demoScheduleCalendarExceptions(): ScheduleCalendarExceptionRow[] {
  return [
    {
      id: "ce000001-0000-4000-8000-000000000001",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      updatedBy: "alex.rivera@strongfoam.com",
      calendarId: DEMO_FIRST_CALENDAR_ID,
      date: "2026-09-28",
      name: "Podium crane shutdown",
      isWorkingDay: false,
    },
    {
      id: "ce000002-0000-4000-8000-000000000002",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      updatedBy: "jordan.patel@strongfoam.com",
      calendarId: DEMO_SECOND_CALENDAR_ID,
      date: "2026-09-20",
      name: "Sunday recovery shift",
      isWorkingDay: true,
    },
  ];
}

export function demoProjectScheduleBaselines(): ProjectScheduleBaselineRow[] {
  return [
    {
      id: "ba000001-0000-4000-8000-000000000001",
      projectId: DEMO_PROJECT_ID,
      name: "Acme tender baseline",
      capturedAt: demoDate(-5),
      capturedBy: "alex.rivera@strongfoam.com",
      deletedAt: null,
      deletedBy: null,
    },
    {
      id: "ba000002-0000-4000-8000-000000000002",
      projectId: DEMO_SECOND_PROJECT_ID,
      name: "Harbour recovery baseline",
      capturedAt: demoDate(-4),
      capturedBy: "jordan.patel@strongfoam.com",
      deletedAt: null,
      deletedBy: null,
    },
  ];
}

export function demoProjectScheduleBaselineItems(): ProjectScheduleBaselineItemRow[] {
  return [
    {
      id: "be000001-0000-4000-8000-000000000001",
      baselineId: "ba000001-0000-4000-8000-000000000001",
      entityType: "job",
      entityId: DEMO_JOB_ID,
      plannedStartAt: demoDate(-1),
      plannedEndAt: demoDate(10),
      dueAt: null,
    },
    {
      id: "be000002-0000-4000-8000-000000000002",
      baselineId: "ba000002-0000-4000-8000-000000000002",
      entityType: "job",
      entityId: DEMO_SECOND_JOB_ID,
      plannedStartAt: demoDate(3),
      plannedEndAt: demoDate(12),
      dueAt: null,
    },
  ];
}

export function demoPortfolioScheduleSeed() {
  return {
    projects: demoProjects(),
    jobs: demoJobs(),
    tasks: demoJobTasks(),
    dependencies: demoJobTaskDependencies(),
    calendars: demoScheduleCalendars(),
    calendarExceptions: demoScheduleCalendarExceptions(),
    baselines: demoProjectScheduleBaselines(),
    baselineItems: demoProjectScheduleBaselineItems(),
  };
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
