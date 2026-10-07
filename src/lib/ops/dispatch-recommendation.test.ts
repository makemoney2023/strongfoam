import { describe, expect, it } from "vitest";
import {
  formatDispatchRecommendation,
  recommendDispatch,
} from "@/lib/ops/dispatch-recommendation";

const jordan = {
  userId: "12121212-1212-4121-8121-121212121212",
  displayName: "Jordan Field",
  role: "field_worker",
  active: true,
};
const avery = {
  userId: "13131313-1313-4131-8131-131313131313",
  displayName: "Avery Lead",
  role: "field_lead",
  active: true,
};

describe("dispatch recommendation", () => {
  it("picks the field member with remaining capacity", () => {
    const result = recommendDispatch({
      task: {
        id: "task-1",
        title: "North elevation",
        status: "open",
        assigneeUserId: null,
      },
      people: [jordan, avery],
      capacities: [{ userId: jordan.userId, jobsPerDay: 1 }],
      dispatches: [{ userId: jordan.userId, status: "scheduled", workDate: "2026-09-23" }],
      workDate: "2026-09-23",
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.recommendation.displayName).toBe("Avery Lead");
    expect(result.recommendation.jobsThatDay).toBe(0);
    expect(result.recommendation.capacity).toBe(1);
    expect(formatDispatchRecommendation(result.recommendation)).toContain("Assign Avery Lead");
  });

  it("refuses an assigned task and a full crew", () => {
    expect(
      recommendDispatch({
        task: { id: "task-1", title: "North", status: "open", assigneeUserId: jordan.userId },
        people: [jordan],
        capacities: [],
        dispatches: [],
        workDate: "2026-09-23",
      }).ok,
    ).toBe(false);
    expect(
      recommendDispatch({
        task: { id: "task-1", title: "North", status: "open", assigneeUserId: null },
        people: [jordan],
        capacities: [{ userId: jordan.userId, jobsPerDay: 1 }],
        dispatches: [{ userId: jordan.userId, status: "scheduled", workDate: "2026-09-23" }],
        workDate: "2026-09-23",
      }),
    ).toMatchObject({ ok: false, error: "Every field member is at capacity that day." });
  });
});
