import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { listOperationsExceptions } from "@/lib/ops/ai-exceptions";
import { PORTFOLIO_SCHEDULE_WIDGETS } from "@/lib/ops/portfolio-schedule-query";
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

describe("Home operations exceptions", () => {
  const source = readFileSync(new URL("../../app/app/page.tsx", import.meta.url), "utf8");
  const now = new Date("2026-09-19T16:00:00.000Z");

  it("renders the exception list under Schedule attention", () => {
    const schedule = source.indexOf("Schedule attention");
    const exceptions = source.indexOf("Operations exceptions");
    const empty = source.indexOf("No operations exceptions.");
    const count = source.indexOf("to review");
    const nextUp = source.indexOf("<CardTitle>Next up</CardTitle>");
    expect(schedule).toBeGreaterThan(-1);
    expect(exceptions).toBeGreaterThan(schedule);
    expect(empty).toBeGreaterThan(exceptions);
    expect(count).toBeGreaterThan(exceptions);
    expect(nextUp).toBeGreaterThan(exceptions);
  });

  it("builds one row per exception type and skips a job that already has today's report", () => {
    const rows = listOperationsExceptions({
      now,
      jobs: [
        {
          id: "job-open",
          name: "Podium",
          status: "in_progress",
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
        {
          id: "job-logged",
          name: "Logged",
          status: "in_progress",
          updatedAt: now,
        },
        {
          id: "job-blocked",
          name: "Dock",
          status: "blocked",
          updatedAt: new Date("2026-09-17T12:00:00.000Z"),
        },
      ],
      tasks: [
        {
          id: "task-late",
          jobId: "job-open",
          title: "Prepare deck",
          status: "open",
          dueAt: new Date("2026-09-18T12:00:00.000Z"),
          plannedEndAt: null,
        },
      ],
      fieldNotes: [
        {
          jobId: "job-logged",
          kind: "daily_report",
          createdAt: new Date("2026-09-19T15:00:00.000Z"),
        },
        {
          jobId: "job-blocked",
          kind: "daily_report",
          createdAt: new Date("2026-09-19T15:00:00.000Z"),
        },
      ],
      voiceNotes: [
        {
          id: "voice-fail",
          jobId: "job-open",
          status: "failed",
          transcript: null,
          filename: "fail.webm",
          createdAt: new Date("2026-09-16T12:00:00.000Z"),
        },
        {
          id: "voice-raw",
          jobId: "job-open",
          status: "completed",
          transcript: "Hold inspection.",
          filename: "raw.webm",
          createdAt: new Date("2026-09-15T12:00:00.000Z"),
        },
      ],
      events: [],
    });
    expect(rows.map((row) => [row.kind, row.href])).toEqual([
      ["unextracted_voice_note", "/app/jobs/job-open#voice-notes"],
      ["failed_transcription", "/app/jobs/job-open#voice-notes"],
      ["blocked_job", "/app/jobs?status=blocked"],
      ["overdue_task", PORTFOLIO_SCHEDULE_WIDGETS.overdueTasks.href],
      ["missing_daily_log", "/app/jobs/job-open#field-log"],
    ]);
    expect(rows.some((row) => row.label.includes("Logged"))).toBe(false);
  });
});

describe("Home Schedule integration", () => {
  const source = readFileSync(
    new URL("../../app/app/page.tsx", import.meta.url),
    "utf8",
  );

  it("preserves Home timing while capturing Schedule time after reads", () => {
    expect(source).toMatch(
      /buildHomeSummary\(\s*\{ requests, opportunities, projects, jobs \},\s*opsNow\.getTime\(\),?\s*\)/,
    );
    expect(source).toContain("const opsNow = getOpsNow();");
    expect(source.indexOf("const opsNow = getOpsNow();")).toBeGreaterThan(
      source.indexOf("await Promise.all"),
    );
  });

  it("uses exact Schedule copy and appends partial hints", () => {
    expect(source).toContain("Exceptions across active projects.");
    expect(source).toContain(
      "`${hint} · Partial result — portfolio limit reached`",
    );
  });

  it("places upcoming events after Next up and before How work flows", () => {
    const nextUp = source.indexOf("<CardTitle>Next up</CardTitle>");
    const upcoming = source.indexOf(
      "<CardTitle>Upcoming schedule events</CardTitle>",
    );
    const workflow = source.indexOf("<CardTitle>How work flows</CardTitle>");

    expect(nextUp).toBeGreaterThan(-1);
    expect(upcoming).toBeGreaterThan(nextUp);
    expect(workflow).toBeGreaterThan(upcoming);
  });

  it("renders every canonical widget and upcoming-event href", () => {
    for (const key of [
      "overdueTasks",
      "unscheduledActiveWork",
      "projectsBehindBaseline",
      "peopleWithPotentialOverlap",
    ]) {
      expect(source).toContain(
        `href={PORTFOLIO_SCHEDULE_WIDGETS.${key}.href}`,
      );
    }
    expect(source).toContain("href={event.href}");
  });
});
