import { createHash } from "node:crypto";
import {
  companies,
  contacts,
  documentChunks,
  documentExtractions,
  documentLinks,
  documentPages,
  documentVersions,
  documents,
  estimateAlternates,
  estimateClauses,
  estimateJobPackages,
  estimateJobTasks,
  estimateJobWorkAreas,
  estimateLineSources,
  estimateLines,
  estimateVersions,
  estimates,
  estimateRequestComments,
  estimateRequestEvents,
  estimateRequestTasks,
  jobAssignments,
  jobDocuments,
  jobEvents,
  jobFieldNotes,
  jobPlanAnnotations,
  jobVoiceNotes,
  jobTaskDependencies,
  jobTasks,
  jobs,
  leads,
  memberships,
  opportunities,
  organizations,
  projectScheduleBaselineItems,
  projectScheduleBaselines,
  projects,
  scheduleCalendarExceptions,
  priceBookItems,
  priceBookItemVersions,
  scheduleCalendars,
  sites,
  userEvents,
  users,
  workAreas,
} from "@/db/schema";
import { priceRevisionContentHash } from "@/lib/ops/price-book";
import { estimateRecords, prepareEstimateVersion } from "@/lib/ops/estimates";

export type EstimateRequestRow = typeof leads.$inferSelect;
export type EstimateRequestEvent = typeof estimateRequestEvents.$inferSelect;
export type EstimateRequestTask = typeof estimateRequestTasks.$inferSelect;
export type EstimateRequestComment = typeof estimateRequestComments.$inferSelect;
export type OrganizationRow = typeof organizations.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type UserEventRow = typeof userEvents.$inferSelect;
export type MembershipRow = typeof memberships.$inferSelect;
export type CompanyRow = typeof companies.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type SiteRow = typeof sites.$inferSelect;
export type OpportunityRow = typeof opportunities.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type JobEventRow = typeof jobEvents.$inferSelect;
export type JobAssignmentRow = typeof jobAssignments.$inferSelect;
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
export type JobPlanAnnotationRow = typeof jobPlanAnnotations.$inferSelect;
export type JobFieldNoteRow = typeof jobFieldNotes.$inferSelect;
export type JobVoiceNoteRow = typeof jobVoiceNotes.$inferSelect;
export type PriceBookItemRow = typeof priceBookItems.$inferSelect;
export type PriceBookItemVersionRow = typeof priceBookItemVersions.$inferSelect;
export type EstimateRow = typeof estimates.$inferSelect;
export type EstimateVersionRow = typeof estimateVersions.$inferSelect;
export type EstimateLineRow = typeof estimateLines.$inferSelect;
export type EstimateClauseRow = typeof estimateClauses.$inferSelect;
export type EstimateAlternateRow = typeof estimateAlternates.$inferSelect;
export type EstimateJobPackageRow = typeof estimateJobPackages.$inferSelect;
export type EstimateJobWorkAreaRow = typeof estimateJobWorkAreas.$inferSelect;
export type EstimateJobTaskRow = typeof estimateJobTasks.$inferSelect;
export type EstimateLineSourceRow = typeof estimateLineSources.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type DocumentVersionRow = typeof documentVersions.$inferSelect;
export type DocumentLinkRow = typeof documentLinks.$inferSelect;
export type DocumentExtractionRow = typeof documentExtractions.$inferSelect;
export type DocumentPageRow = typeof documentPages.$inferSelect;
export type DocumentChunkRow = typeof documentChunks.$inferSelect;

export const DEMO_PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const DEMO_JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const DEMO_WORK_AREA_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const DEMO_JOB_TASK_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const DEMO_FIELD_NOTE_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
export const DEMO_VOICE_NOTE_ID = "abababab-abab-4aba-8aba-abababababab";
export const DEMO_PLAN_DOCUMENT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
export const DEMO_PLAN_ANNOTATION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbb1";
export const DEMO_PLAN_ASSIGNED_ANNOTATION_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbb2";
export const DEMO_OPPORTUNITY_ID = "99999999-9999-4999-8999-999999999999";
export const DEMO_OPEN_OPPORTUNITY_ID = "99999999-9999-4999-8999-999999999991";
export const DEMO_ESTIMATE_ID = "22222222-2222-4222-8222-222222222201";
export const DEMO_ESTIMATE_VERSION_ID = "22222222-2222-4222-8222-222222222211";
export const DEMO_ESTIMATE_DOCUMENT_VERSION_ID = "33333333-3333-4333-8333-333333333302";
export const DEMO_ESTIMATE_CHUNK_ID = "33333333-3333-4333-8333-333333333304";
export const DEMO_SCHEDULE_NOW = "2026-09-19T12:00:00.000Z";
export const DEMO_ADMIN_USER_ID = "10101010-1010-4010-8010-101010101010";
export const DEMO_ADMIN_EMAIL = "admin@strongfoam.demo";
export const DEMO_FIELD_USER_ID = "12121212-1212-4121-8121-121212121212";
export const DEMO_FIELD_EMAIL = "field@strongfoam.demo";
export const DEMO_FIELD_PASSWORD = "StrongFoamDemo1!";
export const DEMO_ADMIN_PASSWORD = DEMO_FIELD_PASSWORD;
export const DEMO_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";

const now = new Date(DEMO_SCHEDULE_NOW).getTime();
const DAY = 24 * 60 * 60 * 1000;
const demoPasswordHash =
  "scrypt$7374726f6e67666f616d2d64656d6f$c1a1b8e28f4a619028057bd86bb213c4f3b81464c82ced3681ecadd556c8965d65249cccd9a6ed407823609e5e7f1d12503a0b7a5b0057d9c50105c08a7d49ad";

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

export function demoOrganizations(): OrganizationRow[] {
  return [
    {
      id: DEMO_ORGANIZATION_ID,
      createdAt: new Date(now - 365 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 365 * 24 * 60 * 60 * 1000),
      name: "Strong Foam Insulation Inc.",
      slug: "strong-foam",
    },
  ];
}

export function demoUsers(): UserRow[] {
  return [
    {
      id: DEMO_ADMIN_USER_ID,
      createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      email: DEMO_ADMIN_EMAIL,
      displayName: "Demo Administrator",
      passwordHash: demoPasswordHash,
      active: true,
      sessionVersion: 1,
      createdBy: "system",
    },
    {
      id: DEMO_FIELD_USER_ID,
      createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
      email: DEMO_FIELD_EMAIL,
      displayName: "Jordan Field",
      passwordHash: demoPasswordHash,
      active: true,
      sessionVersion: 1,
      createdBy: "demo@strongfoam.ca",
    },
  ];
}

export function demoMemberships(): MembershipRow[] {
  return [
    {
      id: "11111111-1010-4010-8010-101010101010",
      createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      organizationId: DEMO_ORGANIZATION_ID,
      userId: DEMO_ADMIN_USER_ID,
      role: "administrator",
      active: true,
    },
    {
      id: "13131313-1313-4131-8131-131313131313",
      createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
      organizationId: DEMO_ORGANIZATION_ID,
      userId: DEMO_FIELD_USER_ID,
      role: "field_worker",
      active: true,
    },
  ];
}

export function demoUserEvents(): UserEventRow[] {
  return [
    {
      id: "15151515-1515-4151-8151-151515151515",
      createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
      userId: DEMO_FIELD_USER_ID,
      actor: DEMO_ADMIN_EMAIL,
      kind: "user_created",
      summary: "Jordan Field created as Field worker",
      payload: { role: "field_worker" },
    },
  ];
}

export function demoEstimateRequests(): EstimateRequestRow[] {
  return [
    {
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
    {
      id: DEMO_OPEN_OPPORTUNITY_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      companyId: "66666666-6666-4666-8666-666666666666",
      contactId: "77777777-7777-4777-8777-777777777777",
      siteId: "88888888-8888-4888-8888-888888888888",
      sourceLeadId: null,
      name: "Harbour bid package",
      stage: "qualification",
      owner: "Alex Rivera",
      source: "referral",
      services: ["spray-foam"],
      projectType: "commercial_ici",
      projectId: null,
    },
  ];
}

export function demoProjects(): ProjectRow[] {
  return [
    {
      id: DEMO_PROJECT_ID,
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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
      organizationId: DEMO_ORGANIZATION_ID,
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

export function demoJobAssignments(): JobAssignmentRow[] {
  return [
    {
      id: "14141414-1414-4141-8141-141414141414",
      createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
      jobId: DEMO_JOB_ID,
      userId: DEMO_FIELD_USER_ID,
      role: "foreman",
      createdBy: "demo@strongfoam.ca",
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
      assigneeUserId: null,
      dueAt: demoDate(-1),
      plannedStartAt: demoDate(2),
      plannedEndAt: demoDate(3),
      completedAt: null,
      status: "open",
      statedQuantity: null,
      statedUnit: null,
      createdBy: "alex.rivera@strongfoam.com",
    },
    {
      id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
      createdAt: demoDate(-2),
      updatedAt: demoDate(-2),
      jobId: DEMO_JOB_ID,
      workAreaId: DEMO_WORK_AREA_ID,
      title: "Install closed-cell at podium deck",
      assignee: "Jordan Field",
      assigneeUserId: DEMO_FIELD_USER_ID,
      dueAt: demoDate(6),
      plannedStartAt: demoDate(4),
      plannedEndAt: demoDate(6),
      completedAt: null,
      status: "open",
      statedQuantity: 40,
      statedUnit: "bags",
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
      assigneeUserId: null,
      dueAt: demoDate(7),
      plannedStartAt: demoDate(7),
      plannedEndAt: demoDate(7),
      completedAt: null,
      status: "open",
      statedQuantity: null,
      statedUnit: null,
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
      assigneeUserId: null,
      dueAt: null,
      plannedStartAt: null,
      plannedEndAt: null,
      completedAt: null,
      status: "open",
      statedQuantity: null,
      statedUnit: null,
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
      assigneeUserId: null,
      dueAt: demoDate(8),
      plannedStartAt: null,
      plannedEndAt: null,
      completedAt: null,
      status: "open",
      statedQuantity: null,
      statedUnit: null,
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
      assigneeUserId: null,
      dueAt: demoDate(-2),
      plannedStartAt: demoDate(3),
      plannedEndAt: demoDate(4),
      completedAt: null,
      status: "open",
      statedQuantity: null,
      statedUnit: null,
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
      assigneeUserId: null,
      dueAt: demoDate(6),
      plannedStartAt: demoDate(5),
      plannedEndAt: demoDate(6),
      completedAt: null,
      status: "open",
      statedQuantity: null,
      statedUnit: null,
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
      assigneeUserId: null,
      dueAt: demoDate(7),
      plannedStartAt: demoDate(7),
      plannedEndAt: demoDate(7),
      completedAt: null,
      status: "open",
      statedQuantity: null,
      statedUnit: null,
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
      assigneeUserId: null,
      dueAt: demoDate(10),
      plannedStartAt: null,
      plannedEndAt: null,
      completedAt: null,
      status: "open",
      statedQuantity: null,
      statedUnit: null,
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
  return [
    {
      id: DEMO_PLAN_DOCUMENT_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
      jobId: DEMO_JOB_ID,
      workAreaId: DEMO_WORK_AREA_ID,
      filename: "level-2-podium.png",
      contentType: "image/png",
      sizeBytes: 18_432,
      pathname: `jobs/${DEMO_JOB_ID}/${DEMO_PLAN_DOCUMENT_ID}/level-2-podium.png`,
      storage: "memory",
      kind: "plan",
      uploadedBy: DEMO_ADMIN_EMAIL,
      sheetKey: DEMO_PLAN_DOCUMENT_ID,
      versionNumber: 1,
      replacesDocumentId: null,
      supersededAt: null,
    },
  ];
}

export function demoJobPlanAnnotations(): JobPlanAnnotationRow[] {
  return [
    {
      id: DEMO_PLAN_ANNOTATION_ID,
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      jobId: DEMO_JOB_ID,
      documentId: DEMO_PLAN_DOCUMENT_ID,
      pageNumber: 1,
      x: 0.28,
      y: 0.32,
      kind: "pin",
      geometry: { type: "pin" },
      status: "planned",
      trade: "general",
      title: "Prepare podium deck",
      body: null,
      workAreaId: DEMO_WORK_AREA_ID,
      taskId: DEMO_JOB_TASK_ID,
      createdBy: DEMO_ADMIN_EMAIL,
      completedAt: null,
      completedBy: null,
      voidedAt: null,
      voidedBy: null,
    },
    {
      id: DEMO_PLAN_ASSIGNED_ANNOTATION_ID,
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      jobId: DEMO_JOB_ID,
      documentId: DEMO_PLAN_DOCUMENT_ID,
      pageNumber: 1,
      x: 0.68,
      y: 0.34,
      kind: "pin",
      geometry: { type: "pin" },
      status: "in_progress",
      trade: "spray_foam",
      title: "Install closed-cell at podium deck",
      body: "Start at the north elevation after the safety talk.",
      workAreaId: DEMO_WORK_AREA_ID,
      taskId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
      createdBy: DEMO_ADMIN_EMAIL,
      completedAt: null,
      completedBy: null,
      voidedAt: null,
      voidedBy: null,
    },
  ];
}

export function demoJobVoiceNotes(): JobVoiceNoteRow[] {
  const createdAt = new Date(now - 5 * 60 * 60 * 1000);
  return [
    {
      id: DEMO_VOICE_NOTE_ID,
      createdAt,
      updatedAt: createdAt,
      jobId: DEMO_JOB_ID,
      workAreaId: DEMO_WORK_AREA_ID,
      taskId: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2",
      annotationId: DEMO_PLAN_ASSIGNED_ANNOTATION_ID,
      documentId: DEMO_PLAN_DOCUMENT_ID,
      source: "task",
      filename: "podium-deck.wav",
      contentType: "audio/wav",
      sizeBytes: 1_024,
      pathname: `jobs/${DEMO_JOB_ID}/voice/${DEMO_VOICE_NOTE_ID}/podium-deck.wav`,
      storage: "memory",
      durationSeconds: 18,
      language: "en",
      provider: "demo",
      model: "strongfoam-demo-stt",
      status: "completed",
      machineTranscript:
        "Voice note on Acme podium insulation. Install closed-cell at podium deck is in progress. Hold the south elevation for inspection and request more closed-cell if the next lift starts today.",
      transcript:
        "Voice note on Acme podium insulation. Install closed-cell at podium deck is in progress. Hold the south elevation for inspection and request more closed-cell if the next lift starts today.",
      confidence: 0.86,
      queuedAt: createdAt,
      processingStartedAt: createdAt,
      completedAt: createdAt,
      failedAt: null,
      error: null,
      consentAt: createdAt,
      createdBy: DEMO_FIELD_EMAIL,
    },
  ];
}

export function demoJobFieldNotes(): JobFieldNoteRow[] {
  return [
    {
      id: DEMO_FIELD_NOTE_ID,
      createdAt: new Date(now - 6 * 60 * 60 * 1000),
      jobId: DEMO_JOB_ID,
      workAreaId: DEMO_WORK_AREA_ID,
      taskId: DEMO_JOB_TASK_ID,
      annotationId: null,
      kind: "note",
      body: "Staging is complete. Start closed-cell at the podium deck after the morning safety talk.",
      quantity: null,
      unit: null,
      createdBy: DEMO_FIELD_EMAIL,
    },
    {
      id: "ffffffff-ffff-4fff-8fff-ffffffffff01",
      createdAt: new Date(now - 5 * 60 * 60 * 1000),
      jobId: DEMO_JOB_ID,
      workAreaId: DEMO_WORK_AREA_ID,
      // Job-level quantity. A link to the dated install task would also propose a schedule slip.
      taskId: null,
      annotationId: null,
      kind: "quantity",
      body: "Closed-cell installed on the podium deck.",
      quantity: 48,
      unit: "bags",
      createdBy: DEMO_FIELD_EMAIL,
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

export function priceBookVersionId(itemId: string): string {
  return itemId.replace("11111111110", "11111111120");
}

export function demoPriceBookItems(): PriceBookItemRow[] {
  const createdAt = demoDate(-30);
  return [
    {
      id: "11111111-1111-4111-8111-111111111101",
      organizationId: DEMO_ORGANIZATION_ID,
      createdAt,
      updatedAt: createdAt,
      trade: "spray-foam",
      name: "Closed-cell spray foam",
      unit: "bags",
      unitPriceCents: 18500,
      active: true,
      createdBy: DEMO_ADMIN_EMAIL,
    },
    {
      id: "11111111-1111-4111-8111-111111111102",
      organizationId: DEMO_ORGANIZATION_ID,
      createdAt,
      updatedAt: createdAt,
      trade: "spray-foam",
      name: "Open-cell spray foam",
      unit: "bags",
      unitPriceCents: 9200,
      active: true,
      createdBy: DEMO_ADMIN_EMAIL,
    },
    {
      id: "11111111-1111-4111-8111-111111111103",
      organizationId: DEMO_ORGANIZATION_ID,
      createdAt,
      updatedAt: createdAt,
      trade: "fireproofing",
      name: "Cementitious fireproofing",
      unit: "sq_ft",
      unitPriceCents: 450,
      active: true,
      createdBy: DEMO_ADMIN_EMAIL,
    },
    {
      id: "11111111-1111-4111-8111-111111111104",
      organizationId: DEMO_ORGANIZATION_ID,
      createdAt,
      updatedAt: createdAt,
      trade: "intumescent",
      name: "Intumescent coating",
      unit: "sq_ft",
      unitPriceCents: 875,
      active: true,
      createdBy: DEMO_ADMIN_EMAIL,
    },
    {
      id: "11111111-1111-4111-8111-111111111105",
      organizationId: DEMO_ORGANIZATION_ID,
      createdAt,
      updatedAt: createdAt,
      trade: "avb",
      name: "Air and vapor barrier",
      unit: "sq_ft",
      unitPriceCents: 320,
      active: true,
      createdBy: DEMO_ADMIN_EMAIL,
    },
    {
      id: "11111111-1111-4111-8111-111111111106",
      organizationId: DEMO_ORGANIZATION_ID,
      createdAt,
      updatedAt: createdAt,
      trade: "spray-foam",
      name: "Legacy sample kit",
      unit: "each",
      unitPriceCents: 0,
      active: false,
      createdBy: DEMO_ADMIN_EMAIL,
    },
  ].map((item) => ({
    ...item,
    currentApprovedVersionId: priceBookVersionId(item.id),
  }));
}

export function demoPriceBookVersions(): PriceBookItemVersionRow[] {
  return demoPriceBookItems().map((item) => ({
    id: item.currentApprovedVersionId ?? priceBookVersionId(item.id),
    organizationId: item.organizationId,
    itemId: item.id,
    versionNumber: 1,
    createdAt: item.createdAt,
    trade: item.trade,
    description: item.name,
    unit: item.unit,
    unitPriceCents: item.unitPriceCents,
    status: "approved",
    effectiveAt: item.createdAt,
    createdBy: item.createdBy,
    approvedBy: item.createdBy,
    approvedAt: item.createdAt,
    contentHash: priceRevisionContentHash({
      itemId: item.id,
      versionNumber: 1,
      trade: item.trade,
      description: item.name,
      unit: item.unit,
      unitPriceCents: item.unitPriceCents,
    }),
  }));
}

const DEMO_ESTIMATE_TEXT = "Sheet A-201 podium plan closed cell";

export function demoEstimateCitationHash(): string {
  return createHash("sha256").update(DEMO_ESTIMATE_TEXT).digest("hex");
}

export function demoEstimateSeed(createdAt = demoDate(-2)) {
  const citationHash = demoEstimateCitationHash();
  const closedCell = demoPriceBookVersions().find(
    (version) => version.itemId === "11111111-1111-4111-8111-111111111101",
  );
  const avb = demoPriceBookVersions().find(
    (version) => version.itemId === "11111111-1111-4111-8111-111111111105",
  );
  if (!closedCell || !avb) throw new Error("Demo price revisions are missing.");
  const prepared = prepareEstimateVersion(
    {
      organizationId: DEMO_ORGANIZATION_ID,
      estimateId: DEMO_ESTIMATE_ID,
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      createdBy: DEMO_ADMIN_EMAIL,
      versionId: DEMO_ESTIMATE_VERSION_ID,
      overheadBasisPoints: 0,
      markupBasisPoints: 1000,
      taxBasisPoints: 1300,
      clauses: [
        {
          id: "22222222-2222-4222-8222-222222222231",
          kind: "inclusion",
          text: "Closed-cell at the podium",
          sortOrder: 0,
        },
        {
          id: "22222222-2222-4222-8222-222222222232",
          kind: "exclusion",
          text: "Interior finishes",
          sortOrder: 1,
        },
      ],
      alternates: [
        {
          id: "22222222-2222-4222-8222-222222222241",
          key: "intumescent",
          name: "Intumescent upgrade",
          description: "Add intumescent coating at the podium",
          included: false,
          sortOrder: 0,
        },
      ],
      lines: [
        {
          id: "22222222-2222-4222-8222-222222222221",
          sortOrder: 0,
          category: "material",
          description: "Closed-cell spray foam",
          trade: "spray-foam",
          location: "Podium",
          method: "unit",
          quantity: "2.5000",
          unit: "bags",
          unitPriceCents: null,
          basisPoints: null,
          basisCategories: [],
          taxable: true,
          alternateKey: null,
          priceBookItemId: closedCell.itemId,
          priceBookVersionId: closedCell.id,
          sources: [
            {
              id: "22222222-2222-4222-8222-222222222271",
              documentVersionId: DEMO_ESTIMATE_DOCUMENT_VERSION_ID,
              pageNumber: 1,
              sheetLabel: "A-201",
              chunkId: DEMO_ESTIMATE_CHUNK_ID,
              contentHash: citationHash,
              startOffset: 0,
              endOffset: DEMO_ESTIMATE_TEXT.length,
            },
          ],
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          sortOrder: 1,
          category: "material",
          description: "Air and vapor barrier",
          trade: "avb",
          location: "North elevation",
          method: "unit",
          quantity: "100.0000",
          unit: "sq_ft",
          unitPriceCents: null,
          basisPoints: null,
          basisCategories: [],
          taxable: true,
          alternateKey: null,
          priceBookItemId: avb.itemId,
          priceBookVersionId: avb.id,
          sources: [],
        },
        {
          id: "22222222-2222-4222-8222-222222222223",
          sortOrder: 2,
          category: "material",
          description: "Intumescent coating",
          trade: "intumescent",
          location: "Podium",
          method: "fixed",
          quantity: null,
          unit: null,
          unitPriceCents: 25000,
          basisPoints: null,
          basisCategories: [],
          taxable: false,
          alternateKey: "intumescent",
          priceBookItemId: null,
          priceBookVersionId: null,
          sources: [],
        },
      ],
      jobPackages: [
        {
          id: "22222222-2222-4222-8222-222222222251",
          key: "podium",
          name: "Podium closed-cell spray foam",
          trade: "spray-foam",
          scope: "Podium closed-cell",
          sortOrder: 0,
          workAreas: [
            {
              id: "22222222-2222-4222-8222-222222222252",
              key: "podium-area",
              name: "Podium",
              kind: "area",
              sortOrder: 0,
            },
          ],
          tasks: [
            {
              id: "22222222-2222-4222-8222-222222222253",
              title: "Mask podium",
              workAreaKey: "podium-area",
              sortOrder: 0,
            },
          ],
        },
        {
          id: "22222222-2222-4222-8222-222222222261",
          key: "avb",
          name: "North elevation AVB",
          trade: "avb",
          scope: "North elevation barrier",
          sortOrder: 1,
          workAreas: [
            {
              id: "22222222-2222-4222-8222-222222222262",
              key: "north",
              name: "North elevation",
              kind: "area",
              sortOrder: 0,
            },
          ],
          tasks: [
            {
              id: "22222222-2222-4222-8222-222222222263",
              title: "Install AVB",
              workAreaKey: "north",
              sortOrder: 0,
            },
          ],
        },
      ],
    },
    {
      revisions: [closedCell, avb].map((version) => ({
        id: version.id,
        itemId: version.itemId,
        organizationId: version.organizationId,
        status: version.status,
        active: true,
        trade: version.trade,
        description: version.description,
        unit: version.unit,
        unitPriceCents: version.unitPriceCents,
      })),
      citations: [
        {
          id: DEMO_ESTIMATE_CHUNK_ID,
          organizationId: DEMO_ORGANIZATION_ID,
          documentVersionId: DEMO_ESTIMATE_DOCUMENT_VERSION_ID,
          pageNumber: 1,
          contentHash: citationHash,
          startOffset: 0,
          endOffset: DEMO_ESTIMATE_TEXT.length,
        },
      ],
      existingVersionNumbers: [],
    },
  );
  if (!prepared.ok) throw new Error(prepared.error);
  return {
    graph: prepared.version,
    records: estimateRecords(prepared.version, createdAt),
    estimate: {
      id: DEMO_ESTIMATE_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      createdAt,
      updatedAt: createdAt,
      number: "EST-1001",
      title: "Harbour bid package",
      createdBy: DEMO_ADMIN_EMAIL,
      currentVersionId: DEMO_ESTIMATE_VERSION_ID,
    },
    document: {
      id: "33333333-3333-4333-8333-333333333301",
      organizationId: DEMO_ORGANIZATION_ID,
      createdAt,
      title: "Harbour podium plan",
      createdBy: DEMO_ADMIN_EMAIL,
    },
    documentVersion: {
      id: DEMO_ESTIMATE_DOCUMENT_VERSION_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      documentId: "33333333-3333-4333-8333-333333333301",
      versionNumber: 1,
      createdAt,
      filename: "harbour-podium.pdf",
      contentType: "application/pdf",
      sizeBytes: 1200,
      pathname: `opportunities/${DEMO_ORGANIZATION_ID}/${DEMO_OPEN_OPPORTUNITY_ID}/harbour-podium.pdf`,
      sha256: citationHash,
      status: "clean",
      kind: "plan",
      revisionLabel: "Rev A",
      uploadedBy: DEMO_ADMIN_EMAIL,
    },
    extraction: {
      id: "33333333-3333-4333-8333-333333333303",
      organizationId: DEMO_ORGANIZATION_ID,
      documentVersionId: DEMO_ESTIMATE_DOCUMENT_VERSION_ID,
      status: "ready",
      provider: null,
      model: null,
      pageProgress: 1,
      pageCount: 1,
      error: null,
      createdAt,
      updatedAt: createdAt,
    },
    page: {
      id: "33333333-3333-4333-8333-333333333305",
      organizationId: DEMO_ORGANIZATION_ID,
      documentVersionId: DEMO_ESTIMATE_DOCUMENT_VERSION_ID,
      extractionId: "33333333-3333-4333-8333-333333333303",
      pageNumber: 1,
      sheetLabel: "A-201",
      machineText: DEMO_ESTIMATE_TEXT,
      correctedText: null,
    },
    chunk: {
      id: DEMO_ESTIMATE_CHUNK_ID,
      organizationId: DEMO_ORGANIZATION_ID,
      documentVersionId: DEMO_ESTIMATE_DOCUMENT_VERSION_ID,
      pageId: "33333333-3333-4333-8333-333333333305",
      startOffset: 0,
      endOffset: DEMO_ESTIMATE_TEXT.length,
      contentHash: citationHash,
      text: DEMO_ESTIMATE_TEXT,
      bbox: null,
    },
    link: {
      id: "33333333-3333-4333-8333-333333333306",
      organizationId: DEMO_ORGANIZATION_ID,
      documentVersionId: DEMO_ESTIMATE_DOCUMENT_VERSION_ID,
      entityType: "estimate",
      entityId: DEMO_ESTIMATE_ID,
      purpose: "estimate-source",
      createdAt,
    },
  };
}
