import { describe, expect, it } from "vitest";
import { buildMorningBrief } from "@/lib/ops/morning-brief";

const NOW = new Date("2026-09-19T16:00:00.000Z");

describe("morning brief", () => {
  it("keeps today's assigned work and drops another person's notes", () => {
    const lines = buildMorningBrief({
      jobId: "job-1",
      userId: "user-1",
      now: NOW,
      siteLabel: "Podium · Toronto",
      plan: { id: "plan-1", filename: "level-2.png" },
      tasks: [
        {
          id: "today",
          title: "Spray the podium",
          status: "open",
          assigneeUserId: "user-1",
          plannedStartAt: new Date("2026-09-19T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-19T20:00:00.000Z"),
          dueAt: null,
        },
        {
          id: "later",
          title: "Next week",
          status: "open",
          assigneeUserId: "user-1",
          plannedStartAt: new Date("2026-09-23T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-23T20:00:00.000Z"),
          dueAt: null,
        },
        {
          id: "theirs",
          title: "Someone else",
          status: "open",
          assigneeUserId: "user-2",
          plannedStartAt: new Date("2026-09-19T12:00:00.000Z"),
          plannedEndAt: new Date("2026-09-19T20:00:00.000Z"),
          dueAt: null,
        },
      ],
      notes: [
        {
          id: "mine",
          kind: "blocker",
          body: "Hold the south elevation.",
          taskId: "today",
        },
        {
          id: "theirs-note",
          kind: "material_request",
          body: "Bags for the other crew.",
          taskId: "theirs",
        },
        {
          id: "job-material",
          kind: "material_request",
          body: "Closed-cell for the next lift.",
          taskId: null,
        },
      ],
    });
    expect(lines.find((line) => line.label === "Site")?.detail).toBe(
      "Podium · Toronto",
    );
    expect(lines.find((line) => line.label === "Plan")?.href).toContain("plan-1");
    expect(lines.filter((line) => line.label === "Task").map((line) => line.detail)).toEqual([
      "Spray the podium",
    ]);
    expect(lines.find((line) => line.label === "Blocker")?.detail).toBe(
      "Hold the south elevation.",
    );
    expect(lines.map((line) => line.detail)).not.toContain("Bags for the other crew.");
    expect(lines.find((line) => line.detail === "Closed-cell for the next lift.")?.href).toBe(
      "/field/jobs/job-1#field-log",
    );
  });
});
