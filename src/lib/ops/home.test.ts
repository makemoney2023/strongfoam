import { describe, expect, it } from "vitest";
import { buildHomeSummary, isOpenRequest, isOverdue } from "./home";

const NOW = new Date("2026-09-19T12:00:00Z").getTime();

function request(
  id: string,
  workflowStatus: string,
  nextActionDueAt: string | null,
  createdAt = "2026-09-01T00:00:00Z",
) {
  return {
    id,
    workflowStatus,
    nextActionDueAt: nextActionDueAt ? new Date(nextActionDueAt) : null,
    createdAt: new Date(createdAt),
  };
}

describe("home summary", () => {
  it("treats won, lost, and archived requests as closed", () => {
    expect(isOpenRequest({ workflowStatus: "new" })).toBe(true);
    expect(isOpenRequest({ workflowStatus: "estimating" })).toBe(true);
    expect(isOpenRequest({ workflowStatus: "won" })).toBe(false);
    expect(isOpenRequest({ workflowStatus: "lost" })).toBe(false);
    expect(isOpenRequest({ workflowStatus: "archived" })).toBe(false);
  });

  it("flags overdue only when a due date is in the past", () => {
    expect(isOverdue({ nextActionDueAt: null }, NOW)).toBe(false);
    expect(isOverdue({ nextActionDueAt: new Date(NOW + 1) }, NOW)).toBe(false);
    expect(isOverdue({ nextActionDueAt: new Date(NOW - 1) }, NOW)).toBe(true);
  });

  it("counts attention items and orders next up by soonest due date", () => {
    const summary = buildHomeSummary(
      {
        requests: [
          request("a", "new", null, "2026-09-10T00:00:00Z"),
          request("b", "reviewing", "2026-09-18T00:00:00Z"),
          request("c", "estimating", "2026-09-25T00:00:00Z"),
          request("d", "won", "2026-09-01T00:00:00Z"),
          request("e", "new", null, "2026-09-12T00:00:00Z"),
        ],
        opportunities: [{ stage: "proposal" }, { stage: "won" }, { stage: "lost" }],
        projects: [{ status: "active" }, { status: "on_hold" }],
        jobs: [
          { status: "in_progress" },
          { status: "blocked" },
          { status: "draft" },
          { status: "closed" },
        ],
      },
      NOW,
    );

    expect(summary.newRequests).toBe(2);
    expect(summary.overdueFollowUps).toBe(1);
    expect(summary.openOpportunities).toBe(1);
    expect(summary.activeProjects).toBe(1);
    expect(summary.fieldJobs).toBe(2);
    expect(summary.blockedJobs).toBe(1);
    expect(summary.nextUp.map((item) => item.id)).toEqual(["b", "c", "e", "a"]);
  });

  it("limits the next up list", () => {
    const summary = buildHomeSummary(
      {
        requests: Array.from({ length: 8 }, (_, index) =>
          request(`r${index}`, "new", null, `2026-09-0${index + 1}T00:00:00Z`),
        ),
        opportunities: [],
        projects: [],
        jobs: [],
      },
      NOW,
      3,
    );
    expect(summary.nextUp).toHaveLength(3);
    expect(summary.nextUp[0].id).toBe("r7");
  });
});
