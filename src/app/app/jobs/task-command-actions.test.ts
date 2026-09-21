import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getOpsSession, getFieldSession } = vi.hoisted(() => ({
  getOpsSession: vi.fn(),
  getFieldSession: vi.fn(),
}));

vi.mock("@/lib/ops/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ops/auth")>();
  return { ...actual, getOpsSession };
});

vi.mock("@/lib/ops/field-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ops/field-auth")>();
  return { ...actual, getFieldSession };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { setJobWorkspaceTaskStatus } from "@/app/app/jobs/actions";
import {
  confirmTaskCommand,
  previewTaskCommand,
  undoTaskCommand,
} from "@/app/app/jobs/task-command-actions";
import { setFieldTaskStatus, undoFieldTaskStatus } from "@/app/field/actions";
import {
  DEMO_FIELD_EMAIL,
  DEMO_FIELD_USER_ID,
  DEMO_JOB_ID,
  DEMO_JOB_TASK_ID,
} from "@/lib/ops/demo-data";
import { listDemoJobTasks } from "@/lib/ops/demo-store";
import {
  calendarDate,
  DEFAULT_WORKING_CALENDAR,
  addWorkingDays,
} from "@/lib/ops/project-schedule-planning";

const INSTALL_TASK_ID = "dddddddd-dddd-4ddd-8ddd-ddddddddddd2";

const fieldSession = {
  userId: DEMO_FIELD_USER_ID,
  organizationId: "00000000-0000-4000-8000-000000000001",
  email: DEMO_FIELD_EMAIL,
  role: "field_worker" as const,
  sessionVersion: 1,
  issuedAt: 1,
  expiresAt: 2,
  displayName: "Jordan Field",
  legacy: false,
};

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
  jobEvents: Array<{ id: string }>;
  jobTasks: Array<{
    id: string;
    status: string;
    completedAt: Date | null;
    dueAt: Date | null;
    plannedStartAt: Date | null;
    plannedEndAt: Date | null;
    updatedAt: Date;
  }>;
};

function demoSlice(): DemoSlice | undefined {
  return (
    globalThis as typeof globalThis & { __strongfoamDemoOps?: DemoSlice }
  ).__strongfoamDemoOps;
}

function podiumTask() {
  return listDemoJobTasks(DEMO_JOB_ID).find((task) => task.id === DEMO_JOB_TASK_ID);
}

describe("task command actions", () => {
  let snapshot: DemoSlice | null = null;

  beforeEach(() => {
    getOpsSession.mockReset();
    getFieldSession.mockReset();
    process.env.OPS_DEMO = "1";
    getOpsSession.mockResolvedValue(officeSession);
    getFieldSession.mockResolvedValue(fieldSession);
    listDemoJobTasks(DEMO_JOB_ID);
    const current = demoSlice();
    snapshot = current
      ? {
          jobEvents: current.jobEvents.map((row) => ({ ...row })),
          jobTasks: current.jobTasks.map((row) => ({
            ...row,
            completedAt: row.completedAt ? new Date(row.completedAt) : null,
            dueAt: row.dueAt ? new Date(row.dueAt) : null,
            plannedStartAt: row.plannedStartAt ? new Date(row.plannedStartAt) : null,
            plannedEndAt: row.plannedEndAt ? new Date(row.plannedEndAt) : null,
            updatedAt: new Date(row.updatedAt),
          })),
        }
      : null;
  });

  afterEach(() => {
    const current = demoSlice();
    if (!current || !snapshot) return;
    current.jobEvents.splice(0, current.jobEvents.length, ...snapshot.jobEvents);
    for (const saved of snapshot.jobTasks) {
      const task = current.jobTasks.find((row) => row.id === saved.id);
      if (!task) continue;
      task.status = saved.status;
      task.completedAt = saved.completedAt;
      task.dueAt = saved.dueAt;
      task.plannedStartAt = saved.plannedStartAt;
      task.plannedEndAt = saved.plannedEndAt;
      task.updatedAt = saved.updatedAt;
    }
  });

  it("rejects a caller without an office session", async () => {
    getOpsSession.mockResolvedValue(null);
    await expect(
      previewTaskCommand(DEMO_JOB_ID, DEMO_JOB_TASK_ID, "complete"),
    ).rejects.toThrow("REDIRECT:/app/login");
  });

  it("rejects a field session", async () => {
    getOpsSession.mockResolvedValue({ ...officeSession, role: "field_worker" });
    await expect(undoTaskCommand(DEMO_JOB_ID, DEMO_JOB_TASK_ID)).rejects.toThrow(
      "REDIRECT:/app/login",
    );
  });

  it("marks a task done and undoes that status", async () => {
    const before = podiumTask();
    const preview = await previewTaskCommand(
      DEMO_JOB_ID,
      DEMO_JOB_TASK_ID,
      "complete",
    );
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(podiumTask()?.status).toBe(before?.status);
    const applied = await confirmTaskCommand(
      DEMO_JOB_ID,
      DEMO_JOB_TASK_ID,
      "complete",
      preview.proposal.expectedUpdatedAt,
    );
    expect(applied.ok).toBe(true);
    expect(podiumTask()?.status).toBe("done");
    const undone = await undoTaskCommand(DEMO_JOB_ID, DEMO_JOB_TASK_ID);
    expect(undone.ok).toBe(true);
    expect(podiumTask()?.status).toBe("open");
    const again = await undoTaskCommand(DEMO_JOB_ID, DEMO_JOB_TASK_ID);
    expect(again).toEqual({
      ok: false,
      error: "That task command cannot be undone.",
    });
  });

  it("refuses a stale task version", async () => {
    const result = await confirmTaskCommand(
      DEMO_JOB_ID,
      DEMO_JOB_TASK_ID,
      "complete",
      "2000-01-01T00:00:00.000Z",
    );
    expect(result).toEqual({
      ok: false,
      error: "This task changed. Refresh and try again.",
    });
    expect(podiumTask()?.status).toBe("open");
  });

  it("moves the due date one working day and restores it", async () => {
    const beforeDue = podiumTask()?.dueAt?.toISOString() ?? "";
    const preview = await previewTaskCommand(
      DEMO_JOB_ID,
      DEMO_JOB_TASK_ID,
      "slip_due",
    );
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    const applied = await confirmTaskCommand(
      DEMO_JOB_ID,
      DEMO_JOB_TASK_ID,
      "slip_due",
      preview.proposal.expectedUpdatedAt,
    );
    expect(applied.ok).toBe(true);
    const moved = calendarDate(
      podiumTask()?.dueAt?.toISOString() ?? "",
      DEFAULT_WORKING_CALENDAR,
    );
    const from = calendarDate(beforeDue, DEFAULT_WORKING_CALENDAR);
    expect(moved).toBe(addWorkingDays(from!, 1, DEFAULT_WORKING_CALENDAR));
    const undone = await undoTaskCommand(DEMO_JOB_ID, DEMO_JOB_TASK_ID);
    expect(undone.ok).toBe(true);
    expect(podiumTask()?.dueAt?.toISOString()).toBe(beforeDue);
  });

  it("undoes a due-date slip and then the earlier completion", async () => {
    const beforeDue = podiumTask()?.dueAt?.toISOString() ?? "";
    const completed = await previewTaskCommand(
      DEMO_JOB_ID,
      DEMO_JOB_TASK_ID,
      "complete",
    );
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(
      await confirmTaskCommand(
        DEMO_JOB_ID,
        DEMO_JOB_TASK_ID,
        "complete",
        completed.proposal.expectedUpdatedAt,
      ),
    ).toMatchObject({ ok: true });
    const slipped = await previewTaskCommand(
      DEMO_JOB_ID,
      DEMO_JOB_TASK_ID,
      "slip_due",
    );
    expect(slipped.ok).toBe(true);
    if (!slipped.ok) return;
    expect(
      await confirmTaskCommand(
        DEMO_JOB_ID,
        DEMO_JOB_TASK_ID,
        "slip_due",
        slipped.proposal.expectedUpdatedAt,
      ),
    ).toMatchObject({ ok: true });
    const undoSlip = await undoTaskCommand(DEMO_JOB_ID, DEMO_JOB_TASK_ID);
    expect(undoSlip.ok).toBe(true);
    expect(podiumTask()?.status).toBe("done");
    expect(podiumTask()?.dueAt?.toISOString()).toBe(beforeDue);
    const undoComplete = await undoTaskCommand(DEMO_JOB_ID, DEMO_JOB_TASK_ID);
    expect(undoComplete.ok).toBe(true);
    expect(podiumTask()?.status).toBe("open");
  });

  it("rejects an unknown command", async () => {
    const result = await previewTaskCommand(
      DEMO_JOB_ID,
      DEMO_JOB_TASK_ID,
      "rename" as "complete",
    );
    expect(result).toEqual({ ok: false, error: "Choose a task change." });
    expect(podiumTask()?.status).toBe("open");
  });

  it("lets office undo a one-click completion", async () => {
    const form = new FormData();
    form.set("jobId", DEMO_JOB_ID);
    form.set("taskId", DEMO_JOB_TASK_ID);
    form.set("status", "done");
    const result = await setJobWorkspaceTaskStatus(form);
    expect(result.notice).toEqual({ kind: "success", message: "Task completed." });
    expect(podiumTask()?.status).toBe("done");
    const undone = await undoTaskCommand(DEMO_JOB_ID, DEMO_JOB_TASK_ID);
    expect(undone.ok).toBe(true);
    expect(podiumTask()?.status).toBe("open");
  });

  it("lets a field user undo only their own status change", async () => {
    const install = () =>
      listDemoJobTasks(DEMO_JOB_ID).find((task) => task.id === INSTALL_TASK_ID);
    const form = new FormData();
    form.set("jobId", DEMO_JOB_ID);
    form.set("taskId", INSTALL_TASK_ID);
    form.set("status", "done");
    form.set("returnTo", `/field/jobs/${DEMO_JOB_ID}`);
    const completed = await setFieldTaskStatus(form);
    expect(completed.notice?.kind).toBe("success");
    expect(install()?.status).toBe("done");
    const undoForm = new FormData();
    undoForm.set("jobId", DEMO_JOB_ID);
    undoForm.set("taskId", INSTALL_TASK_ID);
    undoForm.set("returnTo", `/field/jobs/${DEMO_JOB_ID}`);
    const undone = await undoFieldTaskStatus(undoForm);
    expect(undone.notice).toEqual({
      kind: "success",
      message: "Task change undone.",
    });
    expect(install()?.status).toBe("open");

    const officeForm = new FormData();
    officeForm.set("jobId", DEMO_JOB_ID);
    officeForm.set("taskId", DEMO_JOB_TASK_ID);
    officeForm.set("status", "done");
    await setJobWorkspaceTaskStatus(officeForm);
    const foreign = await undoFieldTaskStatus(
      (() => {
        const data = new FormData();
        data.set("jobId", DEMO_JOB_ID);
        data.set("taskId", DEMO_JOB_TASK_ID);
        data.set("returnTo", `/field/jobs/${DEMO_JOB_ID}`);
        return data;
      })(),
    );
    expect(foreign.error).toBe("You can only undo your own task change.");
    expect(podiumTask()?.status).toBe("done");
  });
});
