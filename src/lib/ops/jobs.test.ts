import { describe, expect, it } from "vitest";
import {
  canConvertWonWork,
  draftJobFromOpportunity,
  formatJobNumber,
  isJobStatus,
  parseJobConversion,
  parseJobDetails,
  parseJobStatusUpdate,
} from "@/lib/ops/jobs";

describe("job conversion rules", () => {
  it("only converts won requests or opportunities", () => {
    expect(canConvertWonWork({ workflowStatus: "reviewing" })).toBe(false);
    expect(canConvertWonWork({ opportunityStage: "proposal" })).toBe(false);
    expect(canConvertWonWork({ workflowStatus: "won" })).toBe(true);
    expect(canConvertWonWork({ opportunityStage: "won" })).toBe(true);
  });

  it("requires project and job names and rejects inverted dates", () => {
    expect(parseJobConversion({ jobName: "Podium" }).ok).toBe(false);
    const parsed = parseJobConversion({
      projectName: "Acme podium",
      jobName: "Spray foam",
      projectManager: "Alex Rivera",
      plannedStartAt: "2026-09-22T08:00",
      plannedEndAt: "2026-09-26T17:00",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.projectManager).toBe("Alex Rivera");
    expect(
      parseJobConversion({
        projectName: "Acme",
        jobName: "Spray foam",
        plannedStartAt: "2026-09-26T17:00",
        plannedEndAt: "2026-09-22T08:00",
      }).ok,
    ).toBe(false);
  });

  it("updates job details without requiring a project name", () => {
    expect(parseJobDetails({ name: "" }).ok).toBe(false);
    const parsed = parseJobDetails({
      name: "North elevation spray foam",
      scope: "Closed-cell",
      projectManager: "Alex Rivera",
      plannedStartAt: "2026-09-22T08:00",
      plannedEndAt: "2026-09-26T17:00",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.name).toBe("North elevation spray foam");
    expect(parsed.value.scope).toBe("Closed-cell");
  });

  it("requires a blocker note when a job is blocked", () => {
    expect(isJobStatus("in_progress")).toBe(true);
    expect(parseJobStatusUpdate({ status: "blocked" }).ok).toBe(false);
    expect(parseJobStatusUpdate({ status: "blocked", blockerNote: "Access" })).toEqual({
      ok: true,
      value: { status: "blocked", blockerNote: "Access" },
    });
  });

  it("drafts project and job names from an opportunity", () => {
    expect(
      draftJobFromOpportunity({
        name: "Acme Construction · Kitchener",
        owner: "Alex",
        projectType: "commercial_ici",
      }),
    ).toEqual({
      projectName: "Acme Construction · Kitchener",
      jobName: "Acme Construction · Kitchener · field work",
      scope: "commercial_ici",
    });
    expect(formatJobNumber("aaaaaaaa-1111-4111-8111-111111111111")).toBe(
      "JOB-AAAAAAAA",
    );
  });
});
