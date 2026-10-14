import { describe, expect, it } from "vitest";
import { fieldPrefill, prefillSaveLabel } from "@/lib/ops/field-prefill";

const userId = "user-1";

describe("field prefill", () => {
  it("uses the only dispatched job and its one open task", () => {
    const prefill = fieldPrefill({
      dispatchedJobIds: ["job-a", "job-a"],
      userId,
      jobNames: { "job-a": "Maple" },
      tasks: [
        {
          id: "task-1",
          jobId: "job-a",
          assigneeUserId: userId,
          status: "open",
          statedUnit: "bags",
          workAreaId: "area-1",
          title: "North wall",
        },
      ],
    });
    expect(prefill).toMatchObject({
      jobId: "job-a",
      jobName: "Maple",
      taskId: "task-1",
      workAreaId: "area-1",
      quantityUnit: "bags",
      laborUnit: "bags",
    });
    expect(prefillSaveLabel("Save labor", prefill)).toBe("Save labor · Maple");
  });

  it("does not guess when several jobs or tasks are open", () => {
    const prefill = fieldPrefill({
      dispatchedJobIds: ["job-a", "job-b"],
      userId,
      tasks: [
        {
          id: "task-1",
          jobId: "job-a",
          assigneeUserId: userId,
          status: "open",
          statedUnit: "sq_ft",
          workAreaId: null,
          title: "A",
        },
        {
          id: "task-2",
          jobId: "job-a",
          assigneeUserId: userId,
          status: "open",
          statedUnit: "bags",
          workAreaId: null,
          title: "B",
        },
      ],
    });
    expect(prefill.jobId).toBeNull();
    expect(prefill.taskId).toBeNull();
    expect(prefillSaveLabel("Save labor", prefill)).toBe("Save labor");
  });

  it("keeps a field unit that is not a labor unit", () => {
    const prefill = fieldPrefill({
      dispatchedJobIds: ["job-a"],
      userId,
      tasks: [
        {
          id: "task-1",
          jobId: "job-a",
          assigneeUserId: userId,
          status: "open",
          statedUnit: "board_feet",
          workAreaId: null,
          title: "Attic",
        },
      ],
    });
    expect(prefill.quantityUnit).toBe("board_feet");
    expect(prefill.laborUnit).toBeNull();
  });
});
