import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { draftCrmFromRequest, parseCrmConversion } from "@/lib/ops/crm";
import {
  demoEstimateRequests,
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
  addDemoCompany,
  addDemoJobDocument,
  addDemoJobFieldNote,
  addDemoJobTaskDependency,
  addDemoJobTask,
  addDemoWorkArea,
  captureDemoProjectScheduleBaseline,
  convertDemoOpportunityToProject,
  convertDemoRequestToCrm,
  deleteDemoJobFieldNote,
  deleteDemoJobTaskDependency,
  deleteDemoWorkArea,
  getDemoCompany,
  getDemoEstimateRequest,
  getDemoJob,
  getDemoJobDocumentDownload,
  getDemoProject,
  getDemoProjectScheduleBaseline,
  listDemoJobDocuments,
  listDemoJobEvents,
  listDemoJobFieldNotes,
  listDemoJobTasks,
  listDemoProjectJobTasks,
  listDemoProjectScheduleBaselines,
  listDemoProjectTaskDependencies,
  listDemoJobs,
  listDemoOpportunities,
  listDemoWorkAreas,
  matchesEstimateRequestFilters,
  removeDemoProjectScheduleBaseline,
  removeDemoScheduleCalendarException,
  rescheduleDemoJobTask,
  resolveDemoProjectScheduleCalendar,
  saveDemoProjectScheduleCalendar,
  setDemoJobTaskStatus,
  updateDemoEstimateRequest,
  updateDemoJobFieldNote,
  updateDemoWorkArea,
  upsertDemoScheduleCalendarException,
  isDemoOpsStore,
  boundedRows,
  listDemoPortfolioSchedule,
} from "@/lib/ops/demo-store";
import { DEMO_JOB_ID, DEMO_PROJECT_ID } from "@/lib/ops/demo-data";
import { listPortfolioSchedule } from "@/lib/ops/store";

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
    dueAt: null,
    plannedStartAt: null,
    plannedEndAt: null,
    completedAt: null,
    status: "open",
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
  ): ScheduleCalendarRow => ({
    id,
    createdAt,
    updatedAt,
    updatedBy: "fixture@strongfoam.com",
    name,
    timeZone: "America/Toronto",
    weekendDays: [0, 6],
    isDefault,
  });
  state.scheduleCalendars.push(
    calendar(PORTFOLIO_IDS.calendarDefault, "Default", true),
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

describe("demo ops store", () => {
  it("uses demo data when the database URL is absent", () => {
    expect(isDemoOpsStore({})).toBe(true);
    expect(isDemoOpsStore({ DATABASE_URL: "postgres://example" })).toBe(false);
    expect(
      isDemoOpsStore({ DATABASE_URL: "postgres://example", OPS_DEMO: "1" }),
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
        dueAt: null,
        plannedStartAt,
        plannedEndAt,
        workAreaId: null,
      },
    });

    expect(task?.plannedStartAt).toEqual(plannedStartAt);
    expect(task?.plannedEndAt).toEqual(plannedEndAt);
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
    expect(deleteDemoWorkArea({
      jobId: DEMO_JOB_ID,
      workAreaId: area?.id ?? "",
      actor: "estimating@strongfoam.com",
    })?.id).toBe(area?.id);
  });

  it("filters jobs by status and planned date", () => {
    const inProgress = listDemoJobs({ status: "in_progress" });
    expect(inProgress.some((job) => job.id === DEMO_JOB_ID)).toBe(true);
    expect(listDemoJobs({ status: "closed" })).toEqual([]);
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
  });

  it("does not persist a fallback calendar during a portfolio read", () => {
    state.scheduleCalendars.splice(0);
    state.scheduleCalendarExceptions.splice(0);
    const calendarsBefore = structuredClone(state.scheduleCalendars);
    const exceptionsBefore = structuredClone(state.scheduleCalendarExceptions);

    const result = listDemoPortfolioSchedule({ q: "South Yard" });

    expect(result.calendars).toHaveLength(1);
    expect(result.calendars[0]).toMatchObject({
      name: "Standard Monday–Friday",
      timeZone: "America/Toronto",
      weekendDays: [0, 6],
      isDefault: true,
    });
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
        baselineItems: false,
      },
    });
  });
});
