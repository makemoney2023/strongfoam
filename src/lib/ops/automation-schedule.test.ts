import { describe, expect, it } from "vitest";
import {
  DAILY_AUTOPILOT_CRON,
  HEARTBEAT_CRON,
  MORNING_BRIEF_CRON,
  RETAIN_CRON,
  STALE_SWEEP_CRON,
  briefLines,
  dailyAutopilotMessages,
  dailyReportProposal,
  morningBriefProposal,
  schedulePlan,
  staleSweepProposal,
} from "@/lib/ops/automation-schedule";

const ORG = "00000000-0000-4000-8000-000000000001";

describe("scheduled automations", () => {
  it("maps each cron to one queue message", () => {
    expect(schedulePlan(HEARTBEAT_CRON)).toEqual([{ kind: "worker-heartbeat", data: {} }]);
    expect(schedulePlan(RETAIN_CRON)).toEqual([{ kind: "data-import.retain", data: {} }]);
    expect(schedulePlan(MORNING_BRIEF_CRON)[0]?.kind).toBe("ops.morning-brief");
    expect(schedulePlan(STALE_SWEEP_CRON)[0]?.data).toEqual({ fanout: true });
    expect(schedulePlan(DAILY_AUTOPILOT_CRON)[0]?.kind).toBe("ops.daily-autopilot");
    expect(schedulePlan("0 0 * * *")).toEqual([]);
  });

  it("fans out one daily draft per active job and never sends or prices", () => {
    const messages = dailyAutopilotMessages([
      { organizationId: ORG, id: "job-1", name: "Podium", status: "in_progress" },
      { organizationId: ORG, id: "job-2", name: "Closed", status: "complete" },
      { organizationId: ORG, id: "job-3", name: "East", status: "blocked" },
    ]);
    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.data.jobId)).toEqual(["job-1", "job-3"]);
    const proposal = dailyReportProposal({
      organizationId: ORG,
      jobId: "job-1",
      jobName: "Podium",
      workingDay: "2026-10-13",
      paragraph: "Podium is in progress.",
    });
    expect(proposal.status).toBe("proposed");
    expect(proposal.sendsToCustomer).toBe(false);
    expect(proposal.setsPrice).toBe(false);
    expect(proposal.approves).toBe(false);
    expect(proposal.requiresConfirmation).toBe(true);
  });

  it("builds a read-only morning brief and a stale digest from existing detectors", () => {
    const lines = briefLines({
      jobId: "job-1",
      userId: "user-1",
      now: new Date("2026-10-13T14:00:00.000Z"),
      siteLabel: "Podium",
      tasks: [
        {
          id: "task-1",
          title: "Spray deck",
          status: "open",
          assigneeUserId: "user-1",
          plannedStartAt: null,
          plannedEndAt: null,
          dueAt: new Date("2026-10-13T15:00:00.000Z"),
        },
      ],
      notes: [],
      plan: null,
    });
    const brief = morningBriefProposal({
      organizationId: ORG,
      jobId: "job-1",
      userId: "user-1",
      workingDay: "2026-10-13",
      lines,
    });
    expect(brief.body).toContain("Spray deck");
    expect(brief.sendsToCustomer).toBe(false);
    const sweep = staleSweepProposal({
      organizationId: ORG,
      workingDay: "2026-10-13",
      exceptions: [
        {
          kind: "missing_daily_log",
          label: "Podium is missing a daily log",
          href: "/app/jobs/job-1",
          occurredAt: "2026-10-13T12:00:00.000Z",
        },
      ],
    });
    expect(sweep.body).toContain("missing a daily log");
    expect(sweep.approves).toBe(false);
  });
});
