import { describe, expect, it } from "vitest";
import { draftCrmFromRequest, parseCrmConversion } from "@/lib/ops/crm";
import { demoEstimateRequests } from "@/lib/ops/demo-data";
import {
  addDemoCompany,
  addDemoJobDocument,
  addDemoJobFieldNote,
  addDemoJobTaskDependency,
  addDemoJobTask,
  addDemoWorkArea,
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
  listDemoJobDocuments,
  listDemoJobEvents,
  listDemoJobFieldNotes,
  listDemoJobTasks,
  listDemoProjectJobTasks,
  listDemoProjectTaskDependencies,
  listDemoJobs,
  listDemoOpportunities,
  listDemoWorkAreas,
  matchesEstimateRequestFilters,
  rescheduleDemoJobTask,
  setDemoJobTaskStatus,
  updateDemoEstimateRequest,
  updateDemoJobFieldNote,
  updateDemoWorkArea,
  isDemoOpsStore,
} from "@/lib/ops/demo-store";
import { DEMO_JOB_ID, DEMO_PROJECT_ID } from "@/lib/ops/demo-data";

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
