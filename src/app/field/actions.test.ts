import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getFieldSession,
  canFieldUserAccessJob,
  getJobPlanAnnotation,
  getJob,
  listJobPlanAnnotations,
  setJobPlanAnnotationStatus,
  updateJobStatus,
} = vi.hoisted(() => ({
  getFieldSession: vi.fn(),
  canFieldUserAccessJob: vi.fn(),
  getJobPlanAnnotation: vi.fn(),
  getJob: vi.fn(),
  listJobPlanAnnotations: vi.fn(),
  setJobPlanAnnotationStatus: vi.fn(),
  updateJobStatus: vi.fn(),
}));

vi.mock("@/lib/ops/field-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ops/field-auth")>();
  return { ...actual, getFieldSession };
});

vi.mock("@/lib/ops/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ops/store")>();
  return {
    ...actual,
    canFieldUserAccessJob,
    getJobPlanAnnotation,
    getJob,
    listJobPlanAnnotations,
    setJobPlanAnnotationStatus,
    updateJobStatus,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { setFieldPlanAnnotationStatus } from "@/app/field/actions";

const JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ANNOTATION_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function statusForm(status: string): FormData {
  const form = new FormData();
  form.set("jobId", JOB_ID);
  form.set("annotationId", ANNOTATION_ID);
  form.set("status", status);
  return form;
}

describe("field plan actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFieldSession.mockResolvedValue({
      userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      email: "field@example.com",
    });
    canFieldUserAccessJob.mockResolvedValue(true);
    getJobPlanAnnotation.mockResolvedValue({
      id: ANNOTATION_ID,
      status: "blocked",
      title: "North wall access",
      body: "Lift is unavailable.",
      taskId: null,
      workAreaId: null,
      voidedAt: null,
    });
    setJobPlanAnnotationStatus.mockResolvedValue({
      id: ANNOTATION_ID,
      status: "completed",
      title: "North wall access",
      body: "Lift is unavailable.",
      taskId: null,
      workAreaId: null,
    });
    getJob.mockResolvedValue({
      id: JOB_ID,
      projectId: null,
      status: "blocked",
      blockerNote: "Lift is unavailable.",
    });
    listJobPlanAnnotations.mockResolvedValue([]);
    updateJobStatus.mockResolvedValue({ id: JOB_ID });
  });

  it("clears a job blocker when its blocked plan mark is resolved", async () => {
    await setFieldPlanAnnotationStatus(statusForm("completed"));

    expect(updateJobStatus).toHaveBeenCalledWith({
      jobId: JOB_ID,
      actor: "field@example.com",
      status: "in_progress",
      blockerNote: null,
    });
  });

  it("does not clear an unrelated job blocker", async () => {
    getJob.mockResolvedValue({
      id: JOB_ID,
      projectId: null,
      status: "blocked",
      blockerNote: "Inspection hold.",
    });

    await setFieldPlanAnnotationStatus(statusForm("completed"));

    expect(updateJobStatus).not.toHaveBeenCalled();
  });
});
