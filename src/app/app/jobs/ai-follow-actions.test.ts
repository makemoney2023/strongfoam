import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  acceptScheduleDiff,
  confirmSpokenPlanMark,
  previewSpokenPlanMark,
  rejectScheduleDiff,
} from "@/app/app/jobs/ai-follow-actions";
import {
  DEMO_JOB_ID,
  DEMO_JOB_TASK_ID,
  DEMO_PLAN_DOCUMENT_ID,
  DEMO_PROJECT_ID,
  DEMO_VOICE_NOTE_ID,
} from "@/lib/ops/demo-data";
import {
  addDemoJobFieldNote,
  getDemoJobVoiceNote,
  listDemoJobPlanAnnotations,
  listDemoJobTasks,
  listDemoProjectJobTasks,
  listDemoProjectTaskDependencies,
  resolveDemoProjectScheduleCalendar,
} from "@/lib/ops/demo-store";
import { proposeScheduleDiff } from "@/lib/ops/schedule-diff";
import {
  addWorkingDays,
  calendarDate,
  DEFAULT_WORKING_CALENDAR,
} from "@/lib/ops/project-schedule-planning";

const officeSession = {
  userId: "20202020-2020-4020-8020-202020202020",
  organizationId: "00000000-0000-4000-8000-000000000001",
  email: "office.only@example.com",
  role: "office" as const,
  sessionVersion: 1,
  issuedAt: 1,
  expiresAt: 2,
  displayName: "Office Only",
  legacy: false,
};

type DemoSlice = {
  jobPlanAnnotations: Array<{ id: string }>;
  jobFieldNotes: Array<{ id: string }>;
  jobEvents: Array<{ id: string }>;
  jobTasks: Array<{
    id: string;
    plannedStartAt: Date | null;
    plannedEndAt: Date | null;
    dueAt: Date | null;
    updatedAt: Date;
  }>;
  jobVoiceNotes: Array<{
    id: string;
    annotationId: string | null;
    documentId: string | null;
    taskId: string | null;
    source: string;
    updatedAt: Date;
  }>;
};

function demoSlice(): DemoSlice | undefined {
  return (
    globalThis as typeof globalThis & { __strongfoamDemoOps?: DemoSlice }
  ).__strongfoamDemoOps;
}

describe("plan voice and schedule diff actions", () => {
  let snapshot: DemoSlice | null = null;

  beforeEach(() => {
    getOpsSession.mockReset();
    process.env.OPS_DEMO = "1";
    listDemoJobTasks(DEMO_JOB_ID);
    const current = demoSlice();
    snapshot = current
      ? {
          jobPlanAnnotations: current.jobPlanAnnotations.map((row) => ({ ...row })),
          jobFieldNotes: current.jobFieldNotes.map((row) => ({ ...row })),
          jobEvents: current.jobEvents.map((row) => ({ ...row })),
          jobTasks: current.jobTasks.map((row) => ({
            ...row,
            plannedStartAt: row.plannedStartAt
              ? new Date(row.plannedStartAt)
              : null,
            plannedEndAt: row.plannedEndAt ? new Date(row.plannedEndAt) : null,
            dueAt: row.dueAt ? new Date(row.dueAt) : null,
            updatedAt: new Date(row.updatedAt),
          })),
          jobVoiceNotes: current.jobVoiceNotes.map((row) => ({
            ...row,
            updatedAt: new Date(row.updatedAt),
          })),
        }
      : null;
  });

  afterEach(() => {
    const current = demoSlice();
    if (!current || !snapshot) return;
    current.jobPlanAnnotations.splice(
      0,
      current.jobPlanAnnotations.length,
      ...snapshot.jobPlanAnnotations,
    );
    current.jobFieldNotes.splice(
      0,
      current.jobFieldNotes.length,
      ...snapshot.jobFieldNotes,
    );
    current.jobEvents.splice(0, current.jobEvents.length, ...snapshot.jobEvents);
    for (const saved of snapshot.jobTasks) {
      const task = current.jobTasks.find((row) => row.id === saved.id);
      if (!task) continue;
      task.plannedStartAt = saved.plannedStartAt;
      task.plannedEndAt = saved.plannedEndAt;
      task.dueAt = saved.dueAt;
      task.updatedAt = saved.updatedAt;
    }
    for (const saved of snapshot.jobVoiceNotes) {
      const note = current.jobVoiceNotes.find((row) => row.id === saved.id);
      if (!note) continue;
      note.annotationId = saved.annotationId;
      note.documentId = saved.documentId;
      note.taskId = saved.taskId;
      note.source = saved.source;
      note.updatedAt = saved.updatedAt;
    }
  });

  it("rejects a caller without an office session", async () => {
    getOpsSession.mockResolvedValue(null);
    await expect(
      previewSpokenPlanMark(
        DEMO_JOB_ID,
        DEMO_PLAN_DOCUMENT_ID,
        DEMO_VOICE_NOTE_ID,
      ),
    ).rejects.toThrow("REDIRECT:/app/login");
  });

  it("rejects a field session", async () => {
    getOpsSession.mockResolvedValue({
      ...officeSession,
      role: "field_worker",
    });
    await expect(rejectScheduleDiff()).rejects.toThrow("REDIRECT:/app/login");
    await expect(
      confirmSpokenPlanMark(
        DEMO_JOB_ID,
        DEMO_PLAN_DOCUMENT_ID,
        DEMO_VOICE_NOTE_ID,
        "unused",
      ),
    ).rejects.toThrow("REDIRECT:/app/login");
  });

  it("places one pin and attaches the voice note", async () => {
    getOpsSession.mockResolvedValue(officeSession);
    const before = listDemoJobPlanAnnotations(
      DEMO_JOB_ID,
      DEMO_PLAN_DOCUMENT_ID,
    );
    const preview = await previewSpokenPlanMark(
      DEMO_JOB_ID,
      DEMO_PLAN_DOCUMENT_ID,
      DEMO_VOICE_NOTE_ID,
    );
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    const stale = await confirmSpokenPlanMark(
      DEMO_JOB_ID,
      DEMO_PLAN_DOCUMENT_ID,
      DEMO_VOICE_NOTE_ID,
      "Place a different pin.",
    );
    expect(stale).toEqual({
      ok: false,
      error: "That transcript changed. Refresh and try again.",
    });
    expect(
      listDemoJobPlanAnnotations(DEMO_JOB_ID, DEMO_PLAN_DOCUMENT_ID),
    ).toHaveLength(before.length);
    const result = await confirmSpokenPlanMark(
      DEMO_JOB_ID,
      DEMO_PLAN_DOCUMENT_ID,
      DEMO_VOICE_NOTE_ID,
      preview.proposal.effect,
    );
    expect(result.ok).toBe(true);
    const after = listDemoJobPlanAnnotations(
      DEMO_JOB_ID,
      DEMO_PLAN_DOCUMENT_ID,
    );
    expect(after).toHaveLength(before.length + 1);
    const note = getDemoJobVoiceNote(DEMO_JOB_ID, DEMO_VOICE_NOTE_ID);
    const placed = after.find((mark) => mark.id === note?.annotationId);
    expect(placed?.kind).toBe("pin");
    expect(placed?.status).toBe("blocked");
    expect(placed?.x).toBe(0.5);
    expect(placed?.y).toBe(0.5);
    expect(note?.source).toBe("annotation");
    expect(note?.documentId).toBe(DEMO_PLAN_DOCUMENT_ID);
  });

  it("leaves task dates unchanged when a schedule suggestion is rejected", async () => {
    getOpsSession.mockResolvedValue(officeSession);
    const before = listDemoJobTasks(DEMO_JOB_ID).find(
      (task) => task.id === DEMO_JOB_TASK_ID,
    );
    await expect(rejectScheduleDiff()).resolves.toEqual({ ok: true });
    const after = listDemoJobTasks(DEMO_JOB_ID).find(
      (task) => task.id === DEMO_JOB_TASK_ID,
    );
    expect(after?.plannedStartAt?.toISOString()).toBe(
      before?.plannedStartAt?.toISOString(),
    );
    expect(after?.plannedEndAt?.toISOString()).toBe(
      before?.plannedEndAt?.toISOString(),
    );
  });

  it("moves the blocked task one working day through the existing reschedule", async () => {
    getOpsSession.mockResolvedValue(officeSession);
    const note = addDemoJobFieldNote({
      jobId: DEMO_JOB_ID,
      actor: officeSession.email,
      input: {
        kind: "blocker",
        body: "Hold the south elevation for inspection.",
        workAreaId: null,
        taskId: DEMO_JOB_TASK_ID,
        annotationId: null,
        quantity: null,
        unit: null,
      },
    });
    expect(note).not.toBeNull();
    const before = listDemoJobTasks(DEMO_JOB_ID).find(
      (task) => task.id === DEMO_JOB_TASK_ID,
    );
    const beforeStartIso = before?.plannedStartAt?.toISOString() ?? "";
    const beforeEndIso = before?.plannedEndAt?.toISOString() ?? "";
    const beforeDueIso = before?.dueAt?.toISOString();
    const proposal = proposeScheduleDiff({
      note: note!,
      tasks: listDemoProjectJobTasks(DEMO_PROJECT_ID).tasks,
      edges: listDemoProjectTaskDependencies(DEMO_PROJECT_ID).edges,
      calendar: resolveDemoProjectScheduleCalendar(DEMO_PROJECT_ID),
    });
    expect(proposal?.effect).toContain("Prepare podium deck");
    const stale = await acceptScheduleDiff(
      DEMO_JOB_ID,
      note!.id,
      "Slip a different task.",
    );
    expect(stale).toEqual({
      ok: false,
      error: "That schedule changed. Refresh and try again.",
    });
    expect(
      listDemoJobTasks(DEMO_JOB_ID).find((task) => task.id === DEMO_JOB_TASK_ID)
        ?.plannedStartAt?.toISOString(),
    ).toBe(beforeStartIso);
    const result = await acceptScheduleDiff(
      DEMO_JOB_ID,
      note!.id,
      proposal!.effect,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.effect).toContain("Prepare podium deck");
    const after = listDemoJobTasks(DEMO_JOB_ID).find(
      (task) => task.id === DEMO_JOB_TASK_ID,
    );
    const beforeStart = calendarDate(beforeStartIso, DEFAULT_WORKING_CALENDAR);
    const beforeEnd = calendarDate(beforeEndIso, DEFAULT_WORKING_CALENDAR);
    expect(beforeStart && beforeEnd).toBeTruthy();
    expect(
      calendarDate(
        after?.plannedStartAt?.toISOString() ?? "",
        DEFAULT_WORKING_CALENDAR,
      ),
    ).toBe(addWorkingDays(beforeStart!, 1, DEFAULT_WORKING_CALENDAR));
    expect(
      calendarDate(
        after?.plannedEndAt?.toISOString() ?? "",
        DEFAULT_WORKING_CALENDAR,
      ),
    ).toBe(addWorkingDays(beforeEnd!, 1, DEFAULT_WORKING_CALENDAR));
    expect(after?.dueAt?.toISOString()).toBe(beforeDueIso);
    const again = await acceptScheduleDiff(
      DEMO_JOB_ID,
      note!.id,
      proposal!.effect,
    );
    expect(again).toEqual({
      ok: false,
      error: "That schedule suggestion was already accepted.",
    });
    const stayed = listDemoJobTasks(DEMO_JOB_ID).find(
      (task) => task.id === DEMO_JOB_TASK_ID,
    );
    expect(stayed?.plannedStartAt?.toISOString()).toBe(
      after?.plannedStartAt?.toISOString(),
    );
  });
});
