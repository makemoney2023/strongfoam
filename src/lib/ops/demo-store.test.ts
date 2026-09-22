import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { draftCrmFromRequest, parseCrmConversion } from "@/lib/ops/crm";
import {
  DEMO_SCHEDULE_NOW,
  demoEstimateRequests,
  demoPortfolioScheduleSeed,
  type JobRow,
  type JobTaskDependencyRow,
  type JobTaskRow,
  type ProjectRow,
  type ProjectScheduleBaselineItemRow,
  type ProjectScheduleBaselineRow,
  type ScheduleCalendarExceptionRow,
  type ScheduleCalendarRow,
} from "@/lib/ops/demo-data";
import {
  buildPortfolioProjects,
  buildPortfolioResourceLanes,
  buildPortfolioScheduleAssignments,
  buildPortfolioScheduleSummary,
  serializePortfolioSchedule,
} from "@/lib/ops/portfolio-schedule";
import {
  addDemoCompany,
  addDemoJobDocument,
  addDemoJobFieldNote,
  addDemoJobVoiceNote,
  addDemoJobPlanAnnotation,
  addDemoJobTaskDependency,
  addDemoJobTask,
  addDemoUser,
  addDemoWorkArea,
  captureDemoProjectScheduleBaseline,
  convertDemoOpportunityToProject,
  convertDemoRequestToCrm,
  saveDemoEstimateAcceptance,
  saveDemoProposal,
  deleteDemoJobFieldNote,
  deleteDemoJobVoiceNote,
  extractDemoVoiceNote,
  deleteDemoJobDocument,
  deleteDemoJobTaskDependency,
  deleteDemoWorkArea,
  getDemoCompany,
  getDemoEstimateRequest,
  getDemoFieldIdentityByEmail,
  getDemoJob,
  getDemoJobDocumentDownload,
  getDemoProject,
  getDemoProjectScheduleBaseline,
  getDemoUserAssignmentSummary,
  listDemoUserEvents,
  listDemoJobDocuments,
  listDemoJobPlanAnnotations,
  listDemoJobAssignments,
  listDemoJobEvents,
  listDemoJobFieldNotes,
  listDemoJobVoiceNotes,
  listDemoJobTasks,
  listDemoProjectJobTasks,
  listDemoProjectScheduleBaselines,
  listDemoProjectTaskDependencies,
  listDemoJobs,
  listDemoOpportunities,
  listDemoWorkAreas,
  listDemoUsers,
  canDemoFieldUserAccessJob,
  matchesEstimateRequestFilters,
  removeDemoProjectScheduleBaseline,
  removeDemoScheduleCalendarException,
  rescheduleDemoJobTask,
  resolveDemoProjectScheduleCalendar,
  saveDemoProjectScheduleCalendar,
  resetDemoUserPassword,
  revokeDemoUserSessions,
  setDemoJobPlanAnnotationStatus,
  setDemoJobTaskStatus,
  setDemoUserActive,
  updateDemoEstimateRequest,
  updateDemoJobDocument,
  updateDemoJobFieldNote,
  updateDemoJobTask,
  updateDemoVoiceTranscript,
  updateDemoUser,
  updateDemoWorkArea,
  upsertDemoScheduleCalendarException,
  voidDemoJobPlanAnnotation,
  isDemoOpsStore,
  boundedRows,
  listDemoPortfolioSchedule,
} from "@/lib/ops/demo-store";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_USER_ID,
  DEMO_ESTIMATE_ID,
  DEMO_ESTIMATE_VERSION_ID,
  DEMO_OPEN_OPPORTUNITY_ID,
  DEMO_ORGANIZATION_ID,
  DEMO_FIELD_EMAIL,
  DEMO_FIELD_USER_ID,
  DEMO_JOB_ID,
  DEMO_JOB_TASK_ID,
  DEMO_VOICE_NOTE_ID,
  DEMO_PLAN_ASSIGNED_ANNOTATION_ID,
  DEMO_PLAN_DOCUMENT_ID,
  DEMO_PROJECT_ID,
} from "@/lib/ops/demo-data";
import {
  listPortfolioSchedule,
  type PortfolioScheduleTruncation,
} from "@/lib/ops/store";

type DemoPortfolioState = {
  projects: ProjectRow[];
  jobsList: JobRow[];
  jobTasks: JobTaskRow[];
  jobTaskDependencies: JobTaskDependencyRow[];
  scheduleCalendars: ScheduleCalendarRow[];
  scheduleCalendarExceptions: ScheduleCalendarExceptionRow[];
  projectScheduleBaselines: ProjectScheduleBaselineRow[];
  projectScheduleBaselineItems: ProjectScheduleBaselineItemRow[];
};

const PORTFOLIO_IDS = {
  projectExplicit: "10000000-0000-4000-8000-000000000001",
  projectFallback: "20000000-0000-4000-8000-000000000002",
  projectArchived: "30000000-0000-4000-8000-000000000003",
  jobExplicit: "11000000-0000-4000-8000-000000000001",
  jobFallback: "21000000-0000-4000-8000-000000000002",
  jobArchived: "31000000-0000-4000-8000-000000000003",
  taskExplicit: "12000000-0000-4000-8000-000000000001",
  taskExplicitSecond: "12000000-0000-4000-8000-000000000002",
  taskFallback: "22000000-0000-4000-8000-000000000002",
  taskFallbackSecond: "22000000-0000-4000-8000-000000000003",
  taskArchived: "32000000-0000-4000-8000-000000000003",
  taskArchivedSecond: "32000000-0000-4000-8000-000000000004",
  dependencyExplicit: "13000000-0000-4000-8000-000000000001",
  dependencyFallback: "23000000-0000-4000-8000-000000000002",
  dependencyArchived: "33000000-0000-4000-8000-000000000003",
  calendarDefault: "14000000-0000-4000-8000-000000000001",
  calendarExplicit: "24000000-0000-4000-8000-000000000002",
  calendarUnrelated: "34000000-0000-4000-8000-000000000003",
  baselineOld: "15000000-0000-4000-8000-000000000001",
  baselineTieLow: "25000000-0000-4000-8000-000000000002",
  baselineTieHigh: "f5000000-0000-4000-8000-000000000003",
  baselineDeleted: "d5000000-0000-4000-8000-000000000004",
  baselineFallback: "35000000-0000-4000-8000-000000000005",
} as const;

function getDemoPortfolioState(): DemoPortfolioState {
  return (
    globalThis as typeof globalThis & {
      __strongfoamDemoOps: DemoPortfolioState;
    }
  ).__strongfoamDemoOps;
}

function addPortfolioFixtures(state: DemoPortfolioState): void {
  const createdAt = new Date("2026-09-19T12:00:00.000Z");
  const updatedAt = new Date("2026-09-19T13:00:00.000Z");
  const project = (
    id: string,
    name: string,
    status: string,
    projectManager: string,
    scheduleCalendarId: string | null,
    offset: number,
  ): ProjectRow => ({
    id,
    organizationId: "00000000-0000-4000-8000-000000000001",
    createdAt: new Date(createdAt.getTime() + offset),
    updatedAt,
    companyId: null,
    siteId: null,
    opportunityId: null,
    sourceLeadId: null,
    name,
    status,
    projectManager,
    scheduleCalendarId,
  });
  state.projects.push(
    project(
      PORTFOLIO_IDS.projectExplicit,
      "North Tower",
      "active",
      "Portfolio Alex Rivera",
      PORTFOLIO_IDS.calendarExplicit,
      3,
    ),
    project(
      PORTFOLIO_IDS.projectFallback,
      "South Yard",
      "active",
      "Jordan Patel",
      null,
      2,
    ),
    project(
      PORTFOLIO_IDS.projectArchived,
      "Archive Warehouse",
      "archived",
      "Portfolio Alex Rivera",
      PORTFOLIO_IDS.calendarUnrelated,
      1,
    ),
  );

  const job = (id: string, projectId: string): JobRow => ({
    id,
    organizationId: "00000000-0000-4000-8000-000000000001",
    createdAt,
    updatedAt,
    projectId,
    companyId: null,
    siteId: null,
    opportunityId: null,
    name: `Job ${id}`,
    status: "draft",
    scope: null,
    services: [],
    projectManager: null,
    foreman: null,
    plannedStartAt: null,
    plannedEndAt: null,
    blockerNote: null,
  });
  state.jobsList.push(
    job(PORTFOLIO_IDS.jobExplicit, PORTFOLIO_IDS.projectExplicit),
    job(PORTFOLIO_IDS.jobFallback, PORTFOLIO_IDS.projectFallback),
    job(PORTFOLIO_IDS.jobArchived, PORTFOLIO_IDS.projectArchived),
  );

  const task = (id: string, jobId: string): JobTaskRow => ({
    id,
    createdAt,
    updatedAt,
    jobId,
    workAreaId: null,
    title: `Task ${id}`,
    assignee: null,
    assigneeUserId: null,
    dueAt: null,
    plannedStartAt: null,
    plannedEndAt: null,
    completedAt: null,
    status: "open",
    statedQuantity: null,
    statedUnit: null,
    createdBy: "fixture@strongfoam.com",
  });
  state.jobTasks.push(
    task(PORTFOLIO_IDS.taskExplicit, PORTFOLIO_IDS.jobExplicit),
    task(PORTFOLIO_IDS.taskExplicitSecond, PORTFOLIO_IDS.jobExplicit),
    task(PORTFOLIO_IDS.taskFallback, PORTFOLIO_IDS.jobFallback),
    task(PORTFOLIO_IDS.taskFallbackSecond, PORTFOLIO_IDS.jobFallback),
    task(PORTFOLIO_IDS.taskArchived, PORTFOLIO_IDS.jobArchived),
    task(PORTFOLIO_IDS.taskArchivedSecond, PORTFOLIO_IDS.jobArchived),
  );

  const dependency = (
    id: string,
    projectId: string,
    predecessorTaskId: string,
    successorTaskId: string,
  ): JobTaskDependencyRow => ({
    id,
    createdAt,
    projectId,
    predecessorTaskId,
    successorTaskId,
    lagDays: 0,
    createdBy: "fixture@strongfoam.com",
  });
  state.jobTaskDependencies.push(
    dependency(
      PORTFOLIO_IDS.dependencyExplicit,
      PORTFOLIO_IDS.projectExplicit,
      PORTFOLIO_IDS.taskExplicit,
      PORTFOLIO_IDS.taskExplicitSecond,
    ),
    dependency(
      PORTFOLIO_IDS.dependencyFallback,
      PORTFOLIO_IDS.projectFallback,
      PORTFOLIO_IDS.taskFallback,
      PORTFOLIO_IDS.taskFallbackSecond,
    ),
    dependency(
      PORTFOLIO_IDS.dependencyArchived,
      PORTFOLIO_IDS.projectArchived,
      PORTFOLIO_IDS.taskArchived,
      PORTFOLIO_IDS.taskArchivedSecond,
    ),
  );

  const calendar = (
    id: string,
    name: string,
    isDefault: boolean,
    calendarCreatedAt: Date = createdAt,
  ): ScheduleCalendarRow => ({
    id,
    createdAt: calendarCreatedAt,
    updatedAt,
    updatedBy: "fixture@strongfoam.com",
    name,
    timeZone: "America/Toronto",
    weekendDays: [0, 6],
    isDefault,
  });
  state.scheduleCalendars.push(
    calendar(
      PORTFOLIO_IDS.calendarDefault,
      "Default",
      true,
      new Date("1990-01-01T00:00:00.000Z"),
    ),
    calendar(PORTFOLIO_IDS.calendarExplicit, "North Tower", false),
    calendar(PORTFOLIO_IDS.calendarUnrelated, "Archive", false),
  );
  state.scheduleCalendarExceptions.push(
    {
      id: "16000000-0000-4000-8000-000000000001",
      createdAt,
      updatedAt,
      updatedBy: "fixture@strongfoam.com",
      calendarId: PORTFOLIO_IDS.calendarDefault,
      date: "2026-12-25",
      name: "Default holiday",
      isWorkingDay: false,
    },
    {
      id: "26000000-0000-4000-8000-000000000002",
      createdAt,
      updatedAt,
      updatedBy: "fixture@strongfoam.com",
      calendarId: PORTFOLIO_IDS.calendarExplicit,
      date: "2026-12-26",
      name: "North shutdown",
      isWorkingDay: false,
    },
    {
      id: "36000000-0000-4000-8000-000000000003",
      createdAt,
      updatedAt,
      updatedBy: "fixture@strongfoam.com",
      calendarId: PORTFOLIO_IDS.calendarUnrelated,
      date: "2026-12-27",
      name: "Archive shutdown",
      isWorkingDay: false,
    },
  );

  const capturedAt = new Date("2026-09-18T12:00:00.000Z");
  const baseline = (
    id: string,
    projectId: string,
    capturedOffset: number,
    deletedAt: Date | null = null,
  ): ProjectScheduleBaselineRow => ({
    id,
    projectId,
    name: `Baseline ${id}`,
    capturedAt: new Date(capturedAt.getTime() + capturedOffset),
    capturedBy: "fixture@strongfoam.com",
    deletedAt,
    deletedBy: deletedAt ? "fixture@strongfoam.com" : null,
  });
  state.projectScheduleBaselines.push(
    baseline(PORTFOLIO_IDS.baselineOld, PORTFOLIO_IDS.projectExplicit, 1),
    baseline(PORTFOLIO_IDS.baselineTieLow, PORTFOLIO_IDS.projectExplicit, 2),
    baseline(PORTFOLIO_IDS.baselineTieHigh, PORTFOLIO_IDS.projectExplicit, 2),
    baseline(
      PORTFOLIO_IDS.baselineDeleted,
      PORTFOLIO_IDS.projectExplicit,
      3,
      updatedAt,
    ),
    baseline(
      PORTFOLIO_IDS.baselineFallback,
      PORTFOLIO_IDS.projectFallback,
      1,
    ),
  );
  for (const baselineId of [
    PORTFOLIO_IDS.baselineOld,
    PORTFOLIO_IDS.baselineTieLow,
    PORTFOLIO_IDS.baselineTieHigh,
    PORTFOLIO_IDS.baselineDeleted,
    PORTFOLIO_IDS.baselineFallback,
  ]) {
    state.projectScheduleBaselineItems.push({
      id: crypto.randomUUID(),
      baselineId,
      entityType: "job",
      entityId: PORTFOLIO_IDS.jobExplicit,
      plannedStartAt: null,
      plannedEndAt: null,
      dueAt: null,
    });
  }
}

const BOUND_CREATED_AT = new Date("2026-09-19T12:00:00.000Z");

function boundUuid(namespace: number, index: number): string {
  return `${namespace.toString(16).padStart(8, "0")}-0000-4000-8000-${index
    .toString(16)
    .padStart(12, "0")}`;
}

function boundProject(
  id: string,
  name: string,
  scheduleCalendarId: string | null = null,
): ProjectRow {
  return {
    id,
    organizationId: "00000000-0000-4000-8000-000000000001",
    createdAt: BOUND_CREATED_AT,
    updatedAt: BOUND_CREATED_AT,
    companyId: null,
    siteId: null,
    opportunityId: null,
    sourceLeadId: null,
    name,
    status: "active",
    projectManager: "Bounds Manager",
    scheduleCalendarId,
  };
}

function expectOnlyTruncated(
  truncation: PortfolioScheduleTruncation,
  flag: keyof PortfolioScheduleTruncation,
): void {
  expect(truncation).toEqual({
    projects: flag === "projects",
    jobs: flag === "jobs",
    tasks: flag === "tasks",
    dependencies: flag === "dependencies",
    calendarExceptions: flag === "calendarExceptions",
    baselineItems: flag === "baselineItems",
  });
}

describe("demo ops store", () => {
  it("seeds every deterministic portfolio browser-acceptance fact", () => {
    const seed = demoPortfolioScheduleSeed();
    const data = serializePortfolioSchedule({
      ...seed,
      truncation: {
        projects: false,
        jobs: false,
        tasks: false,
        dependencies: false,
        calendarExceptions: false,
        baselineItems: false,
      },
    });
    const now = new Date(DEMO_SCHEDULE_NOW);
    const projected = buildPortfolioProjects(data.projects, now);
    const active = projected.filter((project) => project.status === "active");
    const closed = projected.filter((project) => project.status === "closed");

    expect(active).toHaveLength(3);
    expect(closed).toHaveLength(1);
    expect(active.some((project) => project.jobs.length === 0)).toBe(true);
    expect(
      active.flatMap((project) => project.jobs).some(
        (job) =>
          job.status !== "complete" &&
          job.status !== "closed" &&
          !job.plannedStartAt &&
          !job.plannedEndAt,
      ),
    ).toBe(true);
    expect(
      active
        .flatMap((project) => project.jobs)
        .flatMap((job) => job.tasks)
        .some(
          (task) =>
            task.status === "open" &&
            !task.plannedStartAt &&
            !task.plannedEndAt &&
            !task.dueAt,
        ),
    ).toBe(true);
    expect(
      active.flatMap((project) => project.jobs).some(
        (job) => job.status === "blocked",
      ),
    ).toBe(true);

    const summary = buildPortfolioScheduleSummary(data, now);
    expect(summary.overdueTasks).toBeGreaterThanOrEqual(2);
    expect(summary.upcomingEvents).toHaveLength(5);
    expect(
      active
        .flatMap((project) => project.jobs)
        .flatMap((job) => job.tasks)
        .filter(
          (task) =>
            task.status === "open" &&
            task.dueAt !== null &&
            task.dueAt.slice(0, 10) >= "2026-09-19" &&
            task.dueAt.slice(0, 10) <= "2026-10-03",
        ),
    ).toHaveLength(6);

    const calendarIds = new Set(
      active.slice(0, 2).map((project) => project.calendar.id),
    );
    expect(calendarIds.size).toBe(2);
    expect(
      active.slice(0, 2).every(
        (project) => project.calendar.exceptions.length > 0,
      ),
    ).toBe(true);

    for (const project of active.slice(0, 2)) {
      const tasks = project.jobs.flatMap((job) => job.tasks);
      expect(project.dependencies.length).toBeGreaterThanOrEqual(1);
      expect(project.criticalTaskIds.size).toBeGreaterThanOrEqual(2);
      expect(
        tasks.some(
          (task) =>
            task.title.includes("Parallel") &&
            !project.criticalTaskIds.has(task.id),
        ),
      ).toBe(true);
    }

    expect(
      active.map((project) => project.baselineFinishVarianceDays),
    ).toEqual(expect.arrayContaining([
      expect.any(Number),
      expect.any(Number),
      null,
    ]));
    expect(
      active.some((project) => (project.baselineFinishVarianceDays ?? 0) > 0),
    ).toBe(true);
    expect(
      active.some((project) => (project.baselineFinishVarianceDays ?? 0) < 0),
    ).toBe(true);
    expect(active.some((project) => project.latestBaseline === null)).toBe(
      true,
    );

    const morgan = buildPortfolioResourceLanes(
      buildPortfolioScheduleAssignments(projected),
    ).find((lane) => lane.key === "morgan cole");
    expect(morgan).toBeDefined();
    expect(morgan?.potentialOverlapCount).toBeGreaterThanOrEqual(1);
    expect(
      morgan?.assignments.filter((assignment) =>
        assignment.label.includes("Weekend-only"),
      ),
    ).toHaveLength(2);
    expect(
      morgan?.assignments
        .filter((assignment) => assignment.label.includes("Weekend-only"))
        .every((assignment) => !assignment.hasPotentialOverlap),
    ).toBe(true);
  });

  it("uses demo data when the database URL is absent", () => {
    expect(isDemoOpsStore({})).toBe(true);
    expect(isDemoOpsStore({ DATABASE_URL: "postgres://example" })).toBe(false);
    expect(
      isDemoOpsStore({ DATABASE_URL: "postgres://example", OPS_DEMO: "1" }),
    ).toBe(true);
  });

  it("routes an assigned job to the stable field identity", () => {
    expect(getDemoFieldIdentityByEmail(DEMO_FIELD_EMAIL)).toMatchObject({
      userId: DEMO_FIELD_USER_ID,
      role: "field_worker",
      active: true,
    });
    expect(listDemoUsers()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: DEMO_FIELD_USER_ID }),
      ]),
    );
    expect(listDemoJobAssignments(DEMO_JOB_ID)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: DEMO_FIELD_USER_ID,
          role: "foreman",
        }),
      ]),
    );
    expect(canDemoFieldUserAccessJob(DEMO_FIELD_USER_ID, DEMO_JOB_ID)).toBe(
      true,
    );
    expect(
      listDemoJobs({ fieldUserId: DEMO_FIELD_USER_ID }).map((job) => job.id),
    ).toContain(DEMO_JOB_ID);
  });

  it("manages individual users with revocable sessions and audit events", () => {
    expect(getDemoFieldIdentityByEmail(DEMO_ADMIN_EMAIL)).toMatchObject({
      userId: DEMO_ADMIN_USER_ID,
      role: "administrator",
      sessionVersion: 1,
    });
    const created = addDemoUser({
      actor: DEMO_ADMIN_EMAIL,
      displayName: "Office Tester",
      email: "office.tester@example.com",
      passwordHash: "hash-one",
      role: "office",
    });
    expect(created).toMatchObject({ role: "office", sessionVersion: 1 });
    if (!created) return;
    expect(
      updateDemoUser({
        userId: created.userId,
        actor: DEMO_ADMIN_EMAIL,
        input: {
          displayName: "Office Manager",
          email: "office.manager@example.com",
          role: "administrator",
        },
      }),
    ).toMatchObject({
      displayName: "Office Manager",
      role: "administrator",
      sessionVersion: 2,
    });
    expect(
      resetDemoUserPassword({
        userId: created.userId,
        actor: DEMO_ADMIN_EMAIL,
        passwordHash: "hash-two",
      }),
    ).toMatchObject({ sessionVersion: 3 });
    expect(
      revokeDemoUserSessions({
        userId: created.userId,
        actor: DEMO_ADMIN_EMAIL,
      }),
    ).toMatchObject({ sessionVersion: 4 });
    expect(
      setDemoUserActive(created.userId, false, DEMO_ADMIN_EMAIL),
    ).toMatchObject({ active: false, sessionVersion: 5 });
    expect(getDemoUserAssignmentSummary(created.userId)).toEqual({
      jobAssignments: 0,
      taskAssignments: 0,
    });
    expect(
      listDemoUserEvents().filter((event) => event.userId === created.userId),
    ).toHaveLength(5);
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

  it("lists all tasks for one project without leaking other projects", () => {
    const result = listDemoProjectJobTasks(DEMO_PROJECT_ID);
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.tasks.every((task) => task.jobId === DEMO_JOB_ID)).toBe(true);
    expect(
      listDemoProjectJobTasks("00000000-0000-4000-8000-000000000000"),
    ).toEqual({ tasks: [], truncated: false });
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

  it("sends accepted estimates to the conversion preview", () => {
    const proposalId = crypto.randomUUID();
    const acceptanceId = crypto.randomUUID();
    saveDemoProposal({
      id: proposalId,
      organizationId: DEMO_ORGANIZATION_ID,
      estimateId: DEMO_ESTIMATE_ID,
      estimateVersionId: DEMO_ESTIMATE_VERSION_ID,
      versionNumber: 1,
      contentHash: "hash",
      pdfSha256: "pdf",
      pdfBase64: "",
      tokenHash: `token-${proposalId}`,
      expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      createdBy: DEMO_ADMIN_EMAIL,
      createdAt: new Date("2026-09-22T00:00:00.000Z"),
      snapshot: {
        organizationName: "Strong Foam",
        companyName: "Acme",
        siteName: "Waterloo",
        estimateNumber: "EST-1001",
        estimateTitle: "Harbour bid package",
        versionNumber: 1,
        lines: [],
        inclusions: [],
        exclusions: [],
        scope: [],
        totalCents: 97265,
        acceptanceTerms: "terms",
      },
    });
    saveDemoEstimateAcceptance({
      id: acceptanceId,
      organizationId: DEMO_ORGANIZATION_ID,
      proposalId,
      estimateId: DEMO_ESTIMATE_ID,
      estimateVersionId: DEMO_ESTIMATE_VERSION_ID,
      contentHash: "hash",
      recipientName: "Pat",
      recipientEmail: "pat@example.com",
      attestation: "accepted",
      ipAddress: null,
      userAgent: null,
      createdAt: new Date("2026-09-22T00:00:00.000Z"),
    });
    const refused = convertDemoOpportunityToProject({
      opportunityId: DEMO_OPEN_OPPORTUNITY_ID,
      actor: DEMO_ADMIN_EMAIL,
      input: {
        projectName: "Harbour",
        jobName: "One job",
        scope: "",
        projectManager: null,
        foreman: null,
        plannedStartAt: null,
        plannedEndAt: null,
      },
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.error).toBe(
        "Accepted estimate EST-1001 must be converted from its preview.",
      );
    }
    const state = (
      globalThis as typeof globalThis & {
        __strongfoamDemoOps?: {
          proposals: Array<{ id: string }>;
          estimateAcceptances: Array<{ id: string }>;
        };
      }
    ).__strongfoamDemoOps;
    if (state) {
      state.proposals = state.proposals.filter((item) => item.id !== proposalId);
      state.estimateAcceptances = state.estimateAcceptances.filter(
        (item) => item.id !== acceptanceId,
      );
    }
  });
});

describe("job workspace", () => {
  it("adds work areas, tasks, and documents to a job", () => {
    const area = addDemoWorkArea({
      jobId: DEMO_JOB_ID,
      actor: "estimating@strongfoam.com",
      input: {
        name: "Unit 4",
        kind: "unit",
        notes: "West stair",
      },
    });
    expect(area?.name).toBe("Unit 4");
    expect(listDemoWorkAreas(DEMO_JOB_ID).some((item) => item.name === "Unit 4")).toBe(
      true,
    );

    const task = addDemoJobTask({
      jobId: DEMO_JOB_ID,
      actor: "estimating@strongfoam.com",
      input: {
        title: "Tape the AVB laps",
        assignee: "Morgan Cole",
        assigneeUserId: null,
        dueAt: null,
        plannedStartAt: null,
        plannedEndAt: null,
        workAreaId: area?.id ?? null,
      },
    });
    expect(task?.title).toBe("Tape the AVB laps");
    expect(setDemoJobTaskStatus({
      jobId: DEMO_JOB_ID,
      taskId: task?.id ?? "",
      actor: "estimating@strongfoam.com",
      status: "done",
    })?.status).toBe("done");
    expect(
      listDemoJobTasks(DEMO_JOB_ID).find((item) => item.id === task?.id)?.status,
    ).toBe("done");

    const bytes = new Uint8Array([37, 80, 68, 70]);
    const document = addDemoJobDocument({
      jobId: DEMO_JOB_ID,
      actor: "estimating@strongfoam.com",
      input: {
        filename: "north-elevation.pdf",
        contentType: "application/pdf",
        sizeBytes: bytes.byteLength,
        kind: "plan",
        workAreaId: area?.id ?? null,
      },
      bytes,
    });
    expect(document?.filename).toBe("north-elevation.pdf");
    expect(listDemoJobDocuments(DEMO_JOB_ID)[0]?.id).toBe(document?.id);
    expect(
      getDemoJobDocumentDownload(DEMO_JOB_ID, document?.id ?? "")?.bytes,
    ).toEqual(bytes);
    expect(
      listDemoJobEvents(DEMO_JOB_ID).some(
        (event) => event.kind === "document_uploaded",
      ),
    ).toBe(true);

    const quantity = addDemoJobFieldNote({
      jobId: DEMO_JOB_ID,
      actor: "morgan.cole@strongfoam.com",
      input: {
        kind: "quantity",
        body: "Closed-cell at podium",
        workAreaId: area?.id ?? null,
        taskId: task?.id ?? null,
        quantity: 240,
        unit: "board_feet",
      },
    });
    expect(quantity?.quantity).toBe(240);
    expect(listDemoJobFieldNotes(DEMO_JOB_ID)[0]?.id).toBe(quantity?.id);
  });

  it("keeps plan marks on the revision they were drawn on", () => {
    const seeded = listDemoJobPlanAnnotations(DEMO_JOB_ID, DEMO_PLAN_DOCUMENT_ID);
    expect(seeded.map((annotation) => annotation.id)).toContain(
      DEMO_PLAN_ASSIGNED_ANNOTATION_ID,
    );
    expect(
      setDemoJobPlanAnnotationStatus({
        jobId: DEMO_JOB_ID,
        annotationId: DEMO_PLAN_ASSIGNED_ANNOTATION_ID,
        actor: DEMO_FIELD_EMAIL,
        status: "completed",
        body: "North elevation filled.",
      }),
    ).toMatchObject({
      status: "completed",
      completedBy: DEMO_FIELD_EMAIL,
    });
    const replacement = addDemoJobDocument({
      jobId: DEMO_JOB_ID,
      actor: DEMO_ADMIN_EMAIL,
      input: {
        filename: "level-2-podium-rev2.png",
        contentType: "image/png",
        sizeBytes: 12,
        kind: "plan",
        workAreaId: null,
        replacesDocumentId: DEMO_PLAN_DOCUMENT_ID,
      },
      bytes: new Uint8Array([1, 2, 3, 4]),
    });
    expect(replacement).toMatchObject({
      versionNumber: 2,
      replacesDocumentId: DEMO_PLAN_DOCUMENT_ID,
      supersededAt: null,
    });
    expect(
      listDemoJobDocuments(DEMO_JOB_ID).find(
        (document) => document.id === DEMO_PLAN_DOCUMENT_ID,
      )?.supersededAt,
    ).toBeInstanceOf(Date);
    expect(
      listDemoJobPlanAnnotations(DEMO_JOB_ID, DEMO_PLAN_DOCUMENT_ID).map(
        (annotation) => annotation.id,
      ),
    ).toContain(DEMO_PLAN_ASSIGNED_ANNOTATION_ID);
    expect(listDemoJobPlanAnnotations(DEMO_JOB_ID, replacement?.id ?? "")).toEqual(
      [],
    );
    expect(
      addDemoJobPlanAnnotation({
        jobId: DEMO_JOB_ID,
        actor: DEMO_ADMIN_EMAIL,
        input: {
          documentId: DEMO_PLAN_DOCUMENT_ID,
          pageNumber: 1,
          x: 0.2,
          y: 0.2,
          kind: "pin",
          geometry: { type: "pin" },
          status: "planned",
          trade: null,
          title: "Should stay off superseded sheet",
          body: null,
          workAreaId: null,
          taskId: DEMO_JOB_TASK_ID,
        },
      }),
    ).toBeNull();
    expect(
      setDemoJobPlanAnnotationStatus({
        jobId: DEMO_JOB_ID,
        annotationId: DEMO_PLAN_ASSIGNED_ANNOTATION_ID,
        actor: DEMO_FIELD_EMAIL,
        status: "planned",
      }),
    ).toBeNull();
    expect(
      voidDemoJobPlanAnnotation({
        jobId: DEMO_JOB_ID,
        annotationId: DEMO_PLAN_ASSIGNED_ANNOTATION_ID,
        actor: DEMO_ADMIN_EMAIL,
      }),
    ).toBeNull();
    expect(
      addDemoJobDocument({
        jobId: DEMO_JOB_ID,
        actor: DEMO_ADMIN_EMAIL,
        input: {
          filename: "branched-revision.png",
          contentType: "image/png",
          sizeBytes: 12,
          kind: "plan",
          workAreaId: null,
          replacesDocumentId: DEMO_PLAN_DOCUMENT_ID,
        },
        bytes: new Uint8Array([1, 2, 3, 4]),
      }),
    ).toBeNull();

    expect(
      deleteDemoJobDocument({
        jobId: DEMO_JOB_ID,
        documentId: DEMO_PLAN_DOCUMENT_ID,
        actor: DEMO_ADMIN_EMAIL,
      }),
    ).toBeNull();
    expect(
      updateDemoJobDocument({
        jobId: DEMO_JOB_ID,
        documentId: DEMO_PLAN_DOCUMENT_ID,
        actor: DEMO_ADMIN_EMAIL,
        input: { kind: "photo", workAreaId: null },
      }),
    ).toBeNull();
    expect(
      listDemoJobDocuments(DEMO_JOB_ID).find(
        (document) => document.id === replacement?.id,
      )?.replacesDocumentId,
    ).toBe(DEMO_PLAN_DOCUMENT_ID);
  });

  it("shares document bytes across module lookups", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const document = addDemoJobDocument({
      jobId: DEMO_JOB_ID,
      actor: "estimating@strongfoam.com",
      input: {
        filename: "shared.pdf",
        contentType: "application/pdf",
        sizeBytes: bytes.byteLength,
        kind: "plan",
        workAreaId: null,
      },
      bytes,
    });
    expect(document).not.toBeNull();
    expect(
      getDemoJobDocumentDownload(DEMO_JOB_ID, document?.id ?? "")?.bytes,
    ).toEqual(bytes);
  });

  it("rejects tasks and documents for missing jobs or work areas", () => {
    expect(
      addDemoWorkArea({
        jobId: "missing",
        actor: "estimating@strongfoam.com",
        input: { name: "Room 1", kind: "room", notes: null },
      }),
    ).toBeNull();
    expect(
      addDemoJobTask({
        jobId: DEMO_JOB_ID,
        actor: "estimating@strongfoam.com",
        input: {
          title: "Missing area",
          assignee: null,
          assigneeUserId: null,
          dueAt: null,
          plannedStartAt: null,
          plannedEndAt: null,
          workAreaId: "00000000-0000-4000-8000-000000000000",
        },
      }),
    ).toBeNull();
  });
});

describe("workspace CRUD and filters", () => {
  it("captures immutable project baselines and soft-removes their headers", () => {
    const expectedJobs = listDemoJobs({ projectId: DEMO_PROJECT_ID });
    const expectedTasks = listDemoProjectJobTasks(DEMO_PROJECT_ID).tasks;
    const result = captureDemoProjectScheduleBaseline({
      projectId: DEMO_PROJECT_ID,
      name: `Approved ${crypto.randomUUID()}`,
      actor: "pm@strongfoam.com",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(expectedJobs.length + expectedTasks.length);
    expect(result.baseline.capturedBy).toBe("pm@strongfoam.com");
    expect(
      result.items.find(
        (item) =>
          item.entityType === "job" && item.entityId === expectedJobs[0]?.id,
      ),
    ).toMatchObject({
      plannedStartAt: expectedJobs[0]?.plannedStartAt ?? null,
      plannedEndAt: expectedJobs[0]?.plannedEndAt ?? null,
      dueAt: null,
    });

    expect(
      removeDemoProjectScheduleBaseline({
        projectId: DEMO_PROJECT_ID,
        baselineId: result.baseline.id,
        actor: "director@strongfoam.com",
      }),
    ).toEqual({ ok: true });
    expect(
      listDemoProjectScheduleBaselines(DEMO_PROJECT_ID).some(
        (baseline) => baseline.id === result.baseline.id,
      ),
    ).toBe(false);
    const removed = getDemoProjectScheduleBaseline(
      DEMO_PROJECT_ID,
      result.baseline.id,
    );
    expect(removed?.baseline).toMatchObject({
      capturedBy: "pm@strongfoam.com",
      deletedBy: "director@strongfoam.com",
    });
    expect(removed?.baseline.deletedAt).toBeInstanceOf(Date);
    expect(removed?.items).toEqual(result.items);
  });

  it("resolves a default calendar and audits dated exception upserts", () => {
    const fallback = resolveDemoProjectScheduleCalendar(DEMO_PROJECT_ID);
    expect(fallback.weekendDays).toEqual([0, 6]);

    const saved = saveDemoProjectScheduleCalendar({
      projectId: DEMO_PROJECT_ID,
      name: "Project working calendar",
      timeZone: "America/Toronto",
      weekendDays: [0, 6],
      actor: "pm@strongfoam.com",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;

    const date = "2026-09-26";
    const created = upsertDemoScheduleCalendarException({
      projectId: DEMO_PROJECT_ID,
      calendarId: saved.calendar.id,
      date,
      name: "Saturday shutdown",
      isWorkingDay: false,
      actor: "pm@strongfoam.com",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const updated = upsertDemoScheduleCalendarException({
      projectId: DEMO_PROJECT_ID,
      calendarId: saved.calendar.id,
      date,
      name: "Saturday recovery shift",
      isWorkingDay: true,
      actor: "director@strongfoam.com",
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.exception.id).toBe(created.exception.id);
    expect(updated.exception).toMatchObject({
      name: "Saturday recovery shift",
      isWorkingDay: true,
      updatedBy: "director@strongfoam.com",
    });
    expect(
      resolveDemoProjectScheduleCalendar(DEMO_PROJECT_ID).exceptions.filter(
        (exception) => exception.date === date,
      ),
    ).toHaveLength(1);
    expect(
      removeDemoScheduleCalendarException({
        projectId: DEMO_PROJECT_ID,
        calendarId: saved.calendar.id,
        exceptionId: updated.exception.id,
        actor: "pm@strongfoam.com",
      }),
    ).toEqual({ ok: true });
  });

  it("reschedules tasks with stale-write and dependency protection", () => {
    const predecessor = addDemoJobTask({
      jobId: DEMO_JOB_ID,
      actor: "pm@strongfoam.com",
      input: {
        title: `Predecessor ${crypto.randomUUID()}`,
        assignee: null,
        assigneeUserId: null,
        dueAt: null,
        plannedStartAt: new Date("2026-09-19T12:00:00.000Z"),
        plannedEndAt: new Date("2026-09-21T12:00:00.000Z"),
        workAreaId: null,
      },
    });
    const successor = addDemoJobTask({
      jobId: DEMO_JOB_ID,
      actor: "pm@strongfoam.com",
      input: {
        title: `Successor ${crypto.randomUUID()}`,
        assignee: null,
        assigneeUserId: null,
        dueAt: null,
        plannedStartAt: new Date("2026-09-22T12:00:00.000Z"),
        plannedEndAt: new Date("2026-09-23T12:00:00.000Z"),
        workAreaId: null,
      },
    });
    expect(predecessor).not.toBeNull();
    expect(successor).not.toBeNull();
    if (!predecessor || !successor) return;

    const accepted = rescheduleDemoJobTask({
      projectId: DEMO_PROJECT_ID,
      jobId: DEMO_JOB_ID,
      taskId: successor.id,
      plannedStartAt: new Date("2026-09-23T12:00:00.000Z"),
      plannedEndAt: new Date("2026-09-24T12:00:00.000Z"),
      dueAt: null,
      expectedUpdatedAt: successor.updatedAt,
      actor: "pm@strongfoam.com",
    });
    expect(accepted.ok).toBe(true);
    expect(
      listDemoJobEvents(DEMO_JOB_ID).some(
        (event) => event.kind === "task_rescheduled",
      ),
    ).toBe(true);
    const stale = rescheduleDemoJobTask({
      projectId: DEMO_PROJECT_ID,
      jobId: DEMO_JOB_ID,
      taskId: successor.id,
      plannedStartAt: new Date("2026-09-24T12:00:00.000Z"),
      plannedEndAt: new Date("2026-09-25T12:00:00.000Z"),
      dueAt: null,
      expectedUpdatedAt: new Date("2000-01-01T00:00:00.000Z"),
      actor: "pm@strongfoam.com",
    });
    expect(stale).toEqual({
      ok: false,
      error: "This schedule changed. Refresh and try again.",
    });

    const dependency = addDemoJobTaskDependency({
      projectId: DEMO_PROJECT_ID,
      predecessorTaskId: predecessor.id,
      successorTaskId: successor.id,
      lagDays: 1,
      actor: "pm@strongfoam.com",
    });
    expect(dependency.ok).toBe(true);
    const current = listDemoJobTasks(DEMO_JOB_ID).find(
      (task) => task.id === successor.id,
    );
    const rejected = rescheduleDemoJobTask({
      projectId: DEMO_PROJECT_ID,
      jobId: DEMO_JOB_ID,
      taskId: successor.id,
      plannedStartAt: new Date("2026-09-20T12:00:00.000Z"),
      plannedEndAt: new Date("2026-09-21T12:00:00.000Z"),
      dueAt: null,
      expectedUpdatedAt: current?.updatedAt ?? new Date(0),
      actor: "pm@strongfoam.com",
    });
    expect(rejected.ok).toBe(false);
    expect(
      listDemoJobTasks(DEMO_JOB_ID).find(
        (task) => task.id === successor.id,
      )?.plannedStartAt,
    ).toEqual(current?.plannedStartAt);
    if (dependency.ok) {
      deleteDemoJobTaskDependency({
        projectId: DEMO_PROJECT_ID,
        dependencyId: dependency.dependency.id,
        actor: "pm@strongfoam.com",
      });
    }
  });

  it("validates, creates, and removes project task dependencies", () => {
    const makeTask = (title: string) =>
      addDemoJobTask({
        jobId: DEMO_JOB_ID,
        actor: "pm@strongfoam.com",
        input: {
          title: `${title} ${crypto.randomUUID()}`,
          assignee: null,
          assigneeUserId: null,
          dueAt: null,
          plannedStartAt: new Date("2026-09-20T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-21T12:00:00.000Z"),
          workAreaId: null,
        },
      });
    const first = makeTask("First");
    const second = makeTask("Second");
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    if (!first || !second) return;

    const before = listDemoProjectTaskDependencies(DEMO_PROJECT_ID).edges.length;
    const result = addDemoJobTaskDependency({
      projectId: DEMO_PROJECT_ID,
      predecessorTaskId: first.id,
      successorTaskId: second.id,
      lagDays: 1,
      actor: "pm@strongfoam.com",
    });
    expect(result.ok).toBe(true);
    expect(listDemoProjectTaskDependencies(DEMO_PROJECT_ID).edges).toHaveLength(
      before + 1,
    );
    expect(
      addDemoJobTaskDependency({
        projectId: DEMO_PROJECT_ID,
        predecessorTaskId: first.id,
        successorTaskId: second.id,
        lagDays: 1,
        actor: "pm@strongfoam.com",
      }).ok,
    ).toBe(false);
    expect(
      addDemoJobTaskDependency({
        projectId: DEMO_PROJECT_ID,
        predecessorTaskId: second.id,
        successorTaskId: first.id,
        lagDays: 0,
        actor: "pm@strongfoam.com",
      }).ok,
    ).toBe(false);
    expect(
      addDemoJobTaskDependency({
        projectId: DEMO_PROJECT_ID,
        predecessorTaskId: first.id,
        successorTaskId: first.id,
        lagDays: 0,
        actor: "pm@strongfoam.com",
      }).ok,
    ).toBe(false);
    expect(
      addDemoJobTaskDependency({
        projectId: "00000000-0000-4000-8000-000000000000",
        predecessorTaskId: first.id,
        successorTaskId: second.id,
        lagDays: 0,
        actor: "pm@strongfoam.com",
      }).ok,
    ).toBe(false);
    if (!result.ok) return;
    expect(
      deleteDemoJobTaskDependency({
        projectId: DEMO_PROJECT_ID,
        dependencyId: result.dependency.id,
        actor: "pm@strongfoam.com",
      }).ok,
    ).toBe(true);
    expect(listDemoProjectTaskDependencies(DEMO_PROJECT_ID).edges).toHaveLength(
      before,
    );
  });

  it("persists planned task dates and actual completion", () => {
    const plannedStartAt = new Date("2026-09-20T12:00:00.000Z");
    const plannedEndAt = new Date("2026-09-22T12:00:00.000Z");
    const task = addDemoJobTask({
      jobId: DEMO_JOB_ID,
      actor: "estimating@strongfoam.com",
      input: {
        title: `Schedule test ${crypto.randomUUID()}`,
        assignee: "Morgan Cole",
        assigneeUserId: null,
        dueAt: null,
        plannedStartAt,
        plannedEndAt,
        workAreaId: null,
      },
    });

    expect(task?.plannedStartAt).toEqual(plannedStartAt);
    expect(task?.plannedEndAt).toEqual(plannedEndAt);
    expect(task?.statedQuantity).toBeNull();
    const completed = setDemoJobTaskStatus({
      jobId: DEMO_JOB_ID,
      taskId: task?.id ?? "",
      actor: "estimating@strongfoam.com",
      status: "done",
    });
    expect(completed?.completedAt).toBeInstanceOf(Date);
    const reopened = setDemoJobTaskStatus({
      jobId: DEMO_JOB_ID,
      taskId: task?.id ?? "",
      actor: "estimating@strongfoam.com",
      status: "open",
    });
    expect(reopened?.completedAt).toBeNull();
  });

  it("keeps a stated quantity when a due-date update omits it", () => {
    const task = addDemoJobTask({
      jobId: DEMO_JOB_ID,
      actor: "estimating@strongfoam.com",
      input: {
        title: `Quantity ${crypto.randomUUID()}`,
        assignee: null,
        assigneeUserId: null,
        dueAt: new Date("2026-09-20T12:00:00.000Z"),
        plannedStartAt: null,
        plannedEndAt: null,
        workAreaId: null,
        statedQuantity: 40,
        statedUnit: "bags",
      },
    });
    const updated = updateDemoJobTask({
      jobId: DEMO_JOB_ID,
      taskId: task?.id ?? "",
      actor: "estimating@strongfoam.com",
      input: {
        title: task?.title ?? "",
        assignee: null,
        assigneeUserId: null,
        dueAt: new Date("2026-09-21T12:00:00.000Z"),
        plannedStartAt: null,
        plannedEndAt: null,
        workAreaId: null,
      },
    });
    expect(updated?.statedQuantity).toBe(40);
    expect(updated?.statedUnit).toBe("bags");
    expect(updated?.dueAt).toEqual(new Date("2026-09-21T12:00:00.000Z"));
  });

  it("updates and deletes work areas and field notes", () => {
    const area = addDemoWorkArea({
      jobId: DEMO_JOB_ID,
      actor: "estimating@strongfoam.com",
      input: { name: "Stair 2", kind: "zone", notes: null },
    });
    expect(area).not.toBeNull();
    const updated = updateDemoWorkArea({
      jobId: DEMO_JOB_ID,
      workAreaId: area?.id ?? "",
      actor: "estimating@strongfoam.com",
      input: { name: "Stair 2 west", kind: "zone", notes: "Updated" },
    });
    expect(updated?.name).toBe("Stair 2 west");

    const note = addDemoJobFieldNote({
      jobId: DEMO_JOB_ID,
      actor: "morgan.cole@strongfoam.com",
      input: {
        kind: "note",
        body: "Access cleared",
        workAreaId: area?.id ?? null,
        taskId: null,
        quantity: null,
        unit: null,
      },
    });
    expect(
      updateDemoJobFieldNote({
        jobId: DEMO_JOB_ID,
        noteId: note?.id ?? "",
        actor: "morgan.cole@strongfoam.com",
        input: {
          kind: "blocker",
          body: "Still waiting on access",
          workAreaId: area?.id ?? null,
          taskId: null,
          quantity: null,
          unit: null,
        },
      })?.kind,
    ).toBe("blocker");
    expect(
      deleteDemoJobFieldNote({
        jobId: DEMO_JOB_ID,
        noteId: note?.id ?? "",
        actor: "morgan.cole@strongfoam.com",
      })?.id,
    ).toBe(note?.id);
    const currentPlan = listDemoJobDocuments(DEMO_JOB_ID).find(
      (document) => document.kind === "plan" && !document.supersededAt,
    );
    const annotation = currentPlan
      ? addDemoJobPlanAnnotation({
          jobId: DEMO_JOB_ID,
          actor: DEMO_ADMIN_EMAIL,
          input: {
            documentId: currentPlan.id,
            pageNumber: 1,
            x: 0.4,
            y: 0.4,
            kind: "pin",
            geometry: { type: "pin" },
            status: "planned",
            trade: null,
            title: "Stair 2 west",
            body: null,
            workAreaId: area?.id ?? null,
            taskId: null,
          },
        })
      : null;
    expect(annotation?.workAreaId).toBe(area?.id);
    expect(deleteDemoWorkArea({
      jobId: DEMO_JOB_ID,
      workAreaId: area?.id ?? "",
      actor: "estimating@strongfoam.com",
    })?.id).toBe(area?.id);
    expect(
      listDemoJobPlanAnnotations(DEMO_JOB_ID, currentPlan?.id).find(
        (item) => item.id === annotation?.id,
      )?.workAreaId,
    ).toBeNull();
  });

  it("stores circle and polygon marks on the current plan", () => {
    const currentPlan = listDemoJobDocuments(DEMO_JOB_ID).find(
      (document) => document.kind === "plan" && !document.supersededAt,
    );
    expect(currentPlan).toBeTruthy();
    const circle = addDemoJobPlanAnnotation({
      jobId: DEMO_JOB_ID,
      actor: DEMO_ADMIN_EMAIL,
      input: {
        documentId: currentPlan?.id ?? "",
        pageNumber: 1,
        x: 0.33,
        y: 0.44,
        kind: "circle",
        geometry: { type: "circle", rx: 0.08, ry: 0.07 },
        status: "planned",
        trade: "spray_foam",
        title: "Riser chase",
        body: null,
        workAreaId: null,
        taskId: null,
      },
    });
    expect(circle).toMatchObject({
      kind: "circle",
      geometry: { type: "circle", rx: 0.08, ry: 0.07 },
      trade: "spray_foam",
    });
    const polygon = addDemoJobPlanAnnotation({
      jobId: DEMO_JOB_ID,
      actor: DEMO_ADMIN_EMAIL,
      input: {
        documentId: currentPlan?.id ?? "",
        pageNumber: 1,
        x: 0.1,
        y: 0.1,
        kind: "polygon",
        geometry: {
          type: "polygon",
          points: [
            { x: 0.1, y: 0.1 },
            { x: 0.2, y: 0.1 },
            { x: 0.15, y: 0.2 },
          ],
        },
        status: "blocked",
        trade: "fireproofing",
        title: "Unit 204",
        body: null,
        workAreaId: null,
        taskId: null,
      },
    });
    expect(polygon?.kind).toBe("polygon");
    expect(polygon?.status).toBe("blocked");
  });

  it("filters jobs by status and planned date", () => {
    const inProgress = listDemoJobs({ status: "in_progress" });
    expect(inProgress.some((job) => job.id === DEMO_JOB_ID)).toBe(true);
    const closed = listDemoJobs({ status: "closed" });
    expect(closed).toHaveLength(1);
    expect(closed.every((job) => job.status === "closed")).toBe(true);
    expect(listDemoJobs({ q: "north elevation" }).some((job) => job.id === DEMO_JOB_ID)).toBe(
      true,
    );
  });

  it("creates a company record from a parsed input", () => {
    const company = addDemoCompany({
      name: "Northside Builders",
      email: "office@northside.example",
      phone: "519-555-0199",
      city: "Waterloo",
      province: "ON",
    });
    expect(getDemoCompany(company.id)?.city).toBe("Waterloo");
  });

  it("queues, transcribes, edits, extracts, and deletes voice notes", () => {
    const seeded = listDemoJobVoiceNotes(DEMO_JOB_ID).find(
      (note) => note.id === DEMO_VOICE_NOTE_ID,
    );
    expect(seeded?.status).toBe("completed");
    expect(seeded?.transcript).toContain("south elevation");

    const created = addDemoJobVoiceNote({
      jobId: DEMO_JOB_ID,
      actor: DEMO_FIELD_EMAIL,
      input: {
        source: "job",
        workAreaId: null,
        taskId: null,
        annotationId: null,
        documentId: null,
        filename: "site.webm",
        contentType: "audio/webm",
        sizeBytes: 2048,
        durationSeconds: 8,
        language: "en",
        consentAt: new Date(),
      },
      bytes: new Uint8Array(2048),
    });
    expect(created?.status).toBe("queued");
    const listed = listDemoJobVoiceNotes(DEMO_JOB_ID).find(
      (note) => note.id === created?.id,
    );
    expect(listed?.status).toBe("completed");
    expect(listed?.transcript).toContain("south elevation");
    expect(
      updateDemoVoiceTranscript({
        jobId: DEMO_JOB_ID,
        voiceNoteId: created?.id ?? "",
        actor: DEMO_FIELD_EMAIL,
        transcript: "Hold the south elevation for inspection.",
      })?.transcript,
    ).toBe("Hold the south elevation for inspection.");
    expect(
      extractDemoVoiceNote({
        jobId: DEMO_JOB_ID,
        voiceNoteId: created?.id ?? "",
        actor: DEMO_FIELD_EMAIL,
        kind: "deficiency",
        selectedText: "Hold the south elevation for inspection.",
      }),
    ).toEqual({ ok: true, created: "field_note" });
    expect(
      listDemoJobFieldNotes(DEMO_JOB_ID).some(
        (note) =>
          note.kind === "deficiency" &&
          note.body === "Hold the south elevation for inspection.",
      ),
    ).toBe(true);
    expect(
      deleteDemoJobVoiceNote({
        jobId: DEMO_JOB_ID,
        voiceNoteId: created?.id ?? "",
        actor: DEMO_FIELD_EMAIL,
      })?.id,
    ).toBe(created?.id);
  });
});

describe("portfolio Schedule store", () => {
  let state: DemoPortfolioState;
  let snapshot: DemoPortfolioState;

  beforeEach(() => {
    state = getDemoPortfolioState();
    snapshot = {
      projects: [...state.projects],
      jobsList: [...state.jobsList],
      jobTasks: [...state.jobTasks],
      jobTaskDependencies: [...state.jobTaskDependencies],
      scheduleCalendars: [...state.scheduleCalendars],
      scheduleCalendarExceptions: [...state.scheduleCalendarExceptions],
      projectScheduleBaselines: [...state.projectScheduleBaselines],
      projectScheduleBaselineItems: [...state.projectScheduleBaselineItems],
    };
    addPortfolioFixtures(state);
  });

  afterEach(() => {
    for (const key of Object.keys(snapshot) as Array<keyof DemoPortfolioState>) {
      state[key].splice(0, state[key].length, ...snapshot[key] as never[]);
    }
  });

  it("enforces the 250-project cap and suppresses unselected dependents", () => {
    state.projects.push(
      ...Array.from({ length: 251 }, (_, index) =>
        boundProject(
          boundUuid(0x91, index + 1),
          `Project bound ${index + 1}`,
        ),
      ),
    );
    state.jobsList.push({
      id: boundUuid(0x92, 1),
      organizationId: "00000000-0000-4000-8000-000000000001",
      createdAt: BOUND_CREATED_AT,
      updatedAt: BOUND_CREATED_AT,
      projectId: boundUuid(0x91, 251),
      companyId: null,
      siteId: null,
      opportunityId: null,
      name: "Dependent outside selected projects",
      status: "in_progress",
      scope: null,
      services: [],
      projectManager: null,
      foreman: null,
      plannedStartAt: null,
      plannedEndAt: null,
      blockerNote: null,
    });

    const result = listDemoPortfolioSchedule({ q: "Project bound" });

    expect(result.projects).toHaveLength(250);
    expect(result.jobs).toEqual([]);
    expect(result.tasks).toEqual([]);
    expect(result.dependencies).toEqual([]);
    expect(result.baselines).toEqual([]);
    expect(result.baselineItems).toEqual([]);
    expectOnlyTruncated(result.truncation, "projects");
  });

  it("enforces the 2,000-job cap without unrelated truncation", () => {
    const projectId = boundUuid(0x93, 1);
    state.projects.push(boundProject(projectId, "Job bound project"));
    state.jobsList.push(
      ...Array.from({ length: 2_001 }, (_, index): JobRow => ({
        id: boundUuid(0x94, index + 1),
        organizationId: "00000000-0000-4000-8000-000000000001",
        createdAt: new Date(BOUND_CREATED_AT.getTime() + index),
        updatedAt: BOUND_CREATED_AT,
        projectId,
        companyId: null,
        siteId: null,
        opportunityId: null,
        name: `Bound job ${index + 1}`,
        status: "in_progress",
        scope: null,
        services: [],
        projectManager: null,
        foreman: null,
        plannedStartAt: null,
        plannedEndAt: null,
        blockerNote: null,
      })),
    );

    const result = listDemoPortfolioSchedule({ q: "Job bound project" });

    expect(result.jobs).toHaveLength(2_000);
    expectOnlyTruncated(result.truncation, "jobs");
  });

  it("enforces the 5,000-task cap without unrelated truncation", () => {
    const projectId = boundUuid(0x95, 1);
    const jobId = boundUuid(0x96, 1);
    state.projects.push(boundProject(projectId, "Task bound project"));
    state.jobsList.push({
      id: jobId,
      organizationId: "00000000-0000-4000-8000-000000000001",
      createdAt: BOUND_CREATED_AT,
      updatedAt: BOUND_CREATED_AT,
      projectId,
      companyId: null,
      siteId: null,
      opportunityId: null,
      name: "Task bound job",
      status: "in_progress",
      scope: null,
      services: [],
      projectManager: null,
      foreman: null,
      plannedStartAt: null,
      plannedEndAt: null,
      blockerNote: null,
    });
    state.jobTasks.push(
      ...Array.from({ length: 5_001 }, (_, index): JobTaskRow => ({
        id: boundUuid(0x97, index + 1),
        createdAt: new Date(BOUND_CREATED_AT.getTime() + index),
        updatedAt: BOUND_CREATED_AT,
        jobId,
        workAreaId: null,
        title: `Bound task ${index + 1}`,
        assignee: null,
        assigneeUserId: null,
        dueAt: null,
        plannedStartAt: null,
        plannedEndAt: null,
        completedAt: null,
        status: "open",
        statedQuantity: null,
        statedUnit: null,
        createdBy: "bounds@strongfoam.com",
      })),
    );

    const result = listDemoPortfolioSchedule({ q: "Task bound project" });

    expect(result.tasks).toHaveLength(5_000);
    expectOnlyTruncated(result.truncation, "tasks");
  });

  it("enforces the 10,000-dependency cap without unrelated truncation", () => {
    const projectId = boundUuid(0x98, 1);
    const jobId = boundUuid(0x99, 1);
    const tasks = Array.from({ length: 143 }, (_, index): JobTaskRow => ({
      id: boundUuid(0x9a, index + 1),
      createdAt: new Date(BOUND_CREATED_AT.getTime() + index),
      updatedAt: BOUND_CREATED_AT,
      jobId,
      workAreaId: null,
      title: `Dependency task ${index + 1}`,
      assignee: null,
      assigneeUserId: null,
      dueAt: null,
      plannedStartAt: null,
      plannedEndAt: null,
      completedAt: null,
      status: "open",
      statedQuantity: null,
      statedUnit: null,
      createdBy: "bounds@strongfoam.com",
    }));
    const dependencies: JobTaskDependencyRow[] = [];
    for (
      let predecessor = 0;
      predecessor < tasks.length && dependencies.length < 10_001;
      predecessor += 1
    ) {
      for (
        let successor = predecessor + 1;
        successor < tasks.length && dependencies.length < 10_001;
        successor += 1
      ) {
        dependencies.push({
          id: boundUuid(0x9b, dependencies.length + 1),
          createdAt: new Date(
            BOUND_CREATED_AT.getTime() + dependencies.length,
          ),
          projectId,
          predecessorTaskId: tasks[predecessor]!.id,
          successorTaskId: tasks[successor]!.id,
          lagDays: 0,
          createdBy: "bounds@strongfoam.com",
        });
      }
    }
    state.projects.push(boundProject(projectId, "Dependency bound project"));
    state.jobsList.push({
      id: jobId,
      organizationId: "00000000-0000-4000-8000-000000000001",
      createdAt: BOUND_CREATED_AT,
      updatedAt: BOUND_CREATED_AT,
      projectId,
      companyId: null,
      siteId: null,
      opportunityId: null,
      name: "Dependency bound job",
      status: "in_progress",
      scope: null,
      services: [],
      projectManager: null,
      foreman: null,
      plannedStartAt: null,
      plannedEndAt: null,
      blockerNote: null,
    });
    state.jobTasks.push(...tasks);
    state.jobTaskDependencies.push(...dependencies);

    const result = listDemoPortfolioSchedule({
      q: "Dependency bound project",
    });

    expect(result.dependencies).toHaveLength(10_000);
    expectOnlyTruncated(result.truncation, "dependencies");
  });

  it("enforces the 5,000-calendar-exception cap without unrelated truncation", () => {
    const projectId = boundUuid(0x9c, 1);
    const calendarId = boundUuid(0x9d, 1);
    state.projects.push(
      boundProject(projectId, "Calendar exception bound project", calendarId),
    );
    state.scheduleCalendars.push({
      id: calendarId,
      createdAt: BOUND_CREATED_AT,
      updatedAt: BOUND_CREATED_AT,
      updatedBy: "bounds@strongfoam.com",
      name: "Exception bound calendar",
      timeZone: "America/Toronto",
      weekendDays: [0, 6],
      isDefault: false,
    });
    state.scheduleCalendarExceptions.push(
      ...Array.from(
        { length: 5_001 },
        (_, index): ScheduleCalendarExceptionRow => ({
          id: boundUuid(0x9e, index + 1),
          createdAt: BOUND_CREATED_AT,
          updatedAt: BOUND_CREATED_AT,
          updatedBy: "bounds@strongfoam.com",
          calendarId,
          date: new Date(Date.UTC(2030, 0, index + 1))
            .toISOString()
            .slice(0, 10),
          name: `Exception ${index + 1}`,
          isWorkingDay: index % 2 === 0,
        }),
      ),
    );

    const result = listDemoPortfolioSchedule({
      q: "Calendar exception bound project",
    });

    expect(result.calendarExceptions).toHaveLength(5_000);
    expectOnlyTruncated(result.truncation, "calendarExceptions");
  });

  it("enforces the 5,000-baseline-item cap without unrelated truncation", () => {
    const projectId = boundUuid(0x9f, 1);
    const baselineId = boundUuid(0xa0, 1);
    state.projects.push(boundProject(projectId, "Baseline item bound project"));
    state.projectScheduleBaselines.push({
      id: baselineId,
      projectId,
      name: "Bound baseline",
      capturedAt: BOUND_CREATED_AT,
      capturedBy: "bounds@strongfoam.com",
      deletedAt: null,
      deletedBy: null,
    });
    state.projectScheduleBaselineItems.push(
      ...Array.from(
        { length: 5_001 },
        (_, index): ProjectScheduleBaselineItemRow => ({
          id: boundUuid(0xa1, index + 1),
          baselineId,
          entityType: "task",
          entityId: boundUuid(0xa2, index + 1),
          plannedStartAt: null,
          plannedEndAt: null,
          dueAt: null,
        }),
      ),
    );

    const result = listDemoPortfolioSchedule({
      q: "Baseline item bound project",
    });

    expect(result.baselineItems).toHaveLength(5_000);
    expectOnlyTruncated(result.truncation, "baselineItems");
  });

  it("filters by status and exact trimmed project manager", () => {
    const active = listDemoPortfolioSchedule({ projectStatus: "active" });
    expect(active.projects.some((project) => project.id === PORTFOLIO_IDS.projectExplicit)).toBe(
      true,
    );
    expect(active.projects.some((project) => project.id === PORTFOLIO_IDS.projectArchived)).toBe(
      false,
    );

    const managed = listDemoPortfolioSchedule({
      projectStatus: "active",
      projectManager: "  Portfolio Alex Rivera  ",
    });
    expect(managed.projects.map((project) => project.id)).toEqual([
      PORTFOLIO_IDS.projectExplicit,
    ]);
    expect(
      listDemoPortfolioSchedule({
        projectStatus: "active",
        projectManager: "Portfolio Alex",
      }).projects,
    ).toEqual([]);
    expect(
      listDemoPortfolioSchedule({ projectStatus: "archived" }).projects.some(
        (project) => project.id === PORTFOLIO_IDS.projectArchived,
      ),
    ).toBe(true);
  });

  it("matches q against project name and project manager", () => {
    expect(
      listDemoPortfolioSchedule({ q: "  north tower  " }).projects.map(
        (project) => project.id,
      ),
    ).toEqual([PORTFOLIO_IDS.projectExplicit]);
    expect(
      listDemoPortfolioSchedule({
        q: "portfolio alex",
        projectStatus: "archived",
      }).projects.map((project) => project.id),
    ).toEqual([PORTFOLIO_IDS.projectArchived]);
  });

  it("does not leak unrelated jobs, tasks, or dependencies", () => {
    const result = listDemoPortfolioSchedule({
      projectStatus: "active",
      projectManager: "Portfolio Alex Rivera",
    });

    expect(result.jobs.map((job) => job.id)).toEqual([
      PORTFOLIO_IDS.jobExplicit,
    ]);
    expect(result.tasks.map((task) => task.id)).toEqual([
      PORTFOLIO_IDS.taskExplicit,
      PORTFOLIO_IDS.taskExplicitSecond,
    ]);
    expect(result.dependencies.map((dependency) => dependency.id)).toEqual([
      PORTFOLIO_IDS.dependencyExplicit,
    ]);
  });

  it("returns only the deterministic latest non-deleted baseline and its items", () => {
    const result = listDemoPortfolioSchedule({
      projectStatus: "active",
      projectManager: "Portfolio Alex Rivera",
    });

    expect(result.baselines.map((baseline) => baseline.id)).toEqual([
      PORTFOLIO_IDS.baselineTieHigh,
    ]);
    expect(result.baselineItems).toHaveLength(1);
    expect(result.baselineItems[0]?.baselineId).toBe(
      PORTFOLIO_IDS.baselineTieHigh,
    );
  });

  it("returns only selected explicit and default calendars and their exceptions", () => {
    const result = listDemoPortfolioSchedule({
      projectStatus: "active",
      projectManager: "Portfolio Alex Rivera",
    });

    expect(result.calendars.map((calendar) => calendar.id).sort()).toEqual(
      [
        PORTFOLIO_IDS.calendarDefault,
        PORTFOLIO_IDS.calendarExplicit,
      ].sort(),
    );
    expect(
      result.calendarExceptions.map((exception) => exception.calendarId).sort(),
    ).toEqual(
      [
        PORTFOLIO_IDS.calendarDefault,
        PORTFOLIO_IDS.calendarExplicit,
      ].sort(),
    );
    expect(result.truncation.calendarExceptions).toBe(false);
  });

  it("does not persist a fallback calendar during a portfolio read", () => {
    state.scheduleCalendars.splice(0);
    state.scheduleCalendarExceptions.splice(0);
    const calendarsBefore = structuredClone(state.scheduleCalendars);
    const exceptionsBefore = structuredClone(state.scheduleCalendarExceptions);

    const result = listDemoPortfolioSchedule({ q: "South Yard" });
    const repeated = listDemoPortfolioSchedule({ q: "South Yard" });

    expect(result.calendars).toHaveLength(1);
    expect(result.calendars[0]).toMatchObject({
      name: "Standard Monday–Friday",
      timeZone: "America/Toronto",
      weekendDays: [0, 6],
      isDefault: true,
    });
    expect(repeated.calendars).toEqual(result.calendars);
    expect(state.scheduleCalendars).toHaveLength(calendarsBefore.length);
    expect(state.scheduleCalendars).toEqual(calendarsBefore);
    expect(state.scheduleCalendarExceptions).toHaveLength(
      exceptionsBefore.length,
    );
    expect(state.scheduleCalendarExceptions).toEqual(exceptionsBefore);
  });

  it("distinguishes exact-bound and over-bound rows", () => {
    expect(boundedRows(["a", "b"], 2)).toEqual({
      rows: ["a", "b"],
      truncated: false,
    });
    expect(boundedRows(["a", "b", "c"], 2)).toEqual({
      rows: ["a", "b"],
      truncated: true,
    });
    const boundedExceptions = boundedRows(
      Array.from({ length: 5_001 }, (_, index) => index),
      5_000,
    );
    expect(boundedExceptions.rows).toHaveLength(5_000);
    expect(boundedExceptions.truncated).toBe(true);
  });

  it("returns fresh arrays without mutating demo state", () => {
    const projectOrder = state.projects.map((project) => project.id);
    const first = listDemoPortfolioSchedule({
      projectStatus: "active",
      projectManager: "Portfolio Alex Rivera",
    });
    const second = listDemoPortfolioSchedule({
      projectStatus: "active",
      projectManager: "Portfolio Alex Rivera",
    });

    expect(first.projects).not.toBe(second.projects);
    expect(first.jobs).not.toBe(second.jobs);
    expect(first.tasks).not.toBe(second.tasks);
    expect(first.dependencies).not.toBe(second.dependencies);
    expect(first.calendars).not.toBe(second.calendars);
    expect(first.calendarExceptions).not.toBe(second.calendarExceptions);
    expect(first.baselines).not.toBe(second.baselines);
    expect(first.baselineItems).not.toBe(second.baselineItems);
    first.projects.length = 0;
    first.jobs.length = 0;
    expect(second.projects).toHaveLength(1);
    expect(second.jobs).toHaveLength(1);
    expect(state.projects.map((project) => project.id)).toEqual(projectOrder);
  });

  it("deep-clones portfolio rows and nested values on every read", () => {
    type ProjectWithNestedJson = ProjectRow & {
      nestedJson: { labels: string[]; audit: { source: string } };
    };
    const sourceProject = state.projects.find(
      (project) => project.id === PORTFOLIO_IDS.projectExplicit,
    ) as ProjectWithNestedJson;
    sourceProject.nestedJson = {
      labels: ["original"],
      audit: { source: "demo" },
    };
    const sourceJob = state.jobsList.find(
      (job) => job.id === PORTFOLIO_IDS.jobExplicit,
    )!;
    const sourceCalendar = state.scheduleCalendars.find(
      (calendar) => calendar.id === PORTFOLIO_IDS.calendarExplicit,
    )!;
    const sourceJobCreatedAt = sourceJob.createdAt.getTime();
    const sourceCalendarCreatedAt = sourceCalendar.createdAt.getTime();

    const first = listDemoPortfolioSchedule({
      projectStatus: "active",
      projectManager: "Portfolio Alex Rivera",
    });
    const firstProject = first.projects[0] as ProjectWithNestedJson;
    firstProject.name = "Mutated";
    firstProject.nestedJson.labels.push("mutated");
    firstProject.nestedJson.audit.source = "mutated";
    first.jobs[0]!.services.push("mutated");
    first.jobs[0]!.createdAt.setTime(0);
    first.calendars
      .find((calendar) => calendar.id === PORTFOLIO_IDS.calendarExplicit)!
      .weekendDays.push(5);
    first.calendars
      .find((calendar) => calendar.id === PORTFOLIO_IDS.calendarExplicit)!
      .createdAt.setTime(0);

    const second = listDemoPortfolioSchedule({
      projectStatus: "active",
      projectManager: "Portfolio Alex Rivera",
    });
    const secondProject = second.projects[0] as ProjectWithNestedJson;
    expect(secondProject.name).toBe("North Tower");
    expect(secondProject.nestedJson).toEqual({
      labels: ["original"],
      audit: { source: "demo" },
    });
    expect(second.jobs[0]?.services).toEqual([]);
    expect(second.jobs[0]?.createdAt.getTime()).toBe(sourceJobCreatedAt);
    const secondCalendar = second.calendars.find(
      (calendar) => calendar.id === PORTFOLIO_IDS.calendarExplicit,
    );
    expect(secondCalendar?.weekendDays).toEqual([0, 6]);
    expect(secondCalendar?.createdAt.getTime()).toBe(sourceCalendarCreatedAt);
    expect(sourceProject.name).toBe("North Tower");
    expect(sourceProject.nestedJson.labels).toEqual(["original"]);
  });

  it("delegates the public store read to the demo adapter", async () => {
    const filters = {
      projectStatus: "active",
      projectManager: "Portfolio Alex Rivera",
    };

    await expect(listPortfolioSchedule(filters)).resolves.toEqual(
      listDemoPortfolioSchedule(filters),
    );
  });

  it("returns empty dependent arrays and false truncation for no projects", () => {
    expect(
      listDemoPortfolioSchedule({
        projectStatus: "missing",
        projectManager: "Nobody",
      }),
    ).toEqual({
      projects: [],
      jobs: [],
      tasks: [],
      dependencies: [],
      calendars: [],
      calendarExceptions: [],
      baselines: [],
      baselineItems: [],
      truncation: {
        projects: false,
        jobs: false,
        tasks: false,
        dependencies: false,
        calendarExceptions: false,
        baselineItems: false,
      },
    });
  });
});
