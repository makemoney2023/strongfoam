import { describe, expect, it } from "vitest";
import { DEMO_JOB_TASK_ID, demoJobTasks } from "@/lib/ops/demo-data";
import { DEFAULT_WORKING_CALENDAR } from "@/lib/ops/project-schedule-planning";
import { proposeTaskCommand } from "@/lib/ops/task-command";

describe("task commands", () => {
  const task = demoJobTasks().find((item) => item.id === DEMO_JOB_TASK_ID)!;

  it("proposes marking an open task done and refuses a second completion", () => {
    const proposal = proposeTaskCommand({
      task,
      kind: "complete",
      calendar: DEFAULT_WORKING_CALENDAR,
    });
    expect(proposal?.effect).toContain("Prepare podium deck");
    expect(
      proposeTaskCommand({
        task: { ...task, status: "done" },
        kind: "complete",
        calendar: DEFAULT_WORKING_CALENDAR,
      }),
    ).toBeNull();
  });

  it("moves a due date one working day", () => {
    const proposal = proposeTaskCommand({
      task,
      kind: "slip_due",
      calendar: DEFAULT_WORKING_CALENDAR,
    });
    expect(proposal?.effect).toContain("from 2026-09-18 to 2026-09-21");
    expect(proposal?.dueAt?.slice(0, 10)).toBe("2026-09-21");
  });
});
