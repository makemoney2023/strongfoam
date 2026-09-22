import { describe, expect, it } from "vitest";
import { listOperationsExceptions } from "@/lib/ops/ai-exceptions";
import { listDemoHomeExceptionSource } from "@/lib/ops/demo-store";
import { DEMO_JOB_ID } from "@/lib/ops/demo-data";
import { PORTFOLIO_SCHEDULE_WIDGETS } from "@/lib/ops/portfolio-schedule-query";

const NOW = new Date("2026-09-19T16:00:00.000Z");

describe("operations exceptions", () => {
  it("lists each current-record exception and skips an extracted transcript", () => {
    const rows = listOperationsExceptions({
      now: NOW,
      jobs: [
        {
          id: "job-open",
          name: "Podium",
          status: "in_progress",
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
        {
          id: "job-blocked",
          name: "Dock",
          status: "blocked",
          updatedAt: new Date("2026-09-17T12:00:00.000Z"),
        },
        {
          id: "job-logged",
          name: "Logged",
          status: "scheduled",
          updatedAt: NOW,
        },
      ],
      tasks: [
        {
          id: "task-late",
          jobId: "job-open",
          title: "Prepare deck",
          status: "open",
          dueAt: new Date("2026-09-18T15:00:00.000Z"),
          plannedEndAt: null,
        },
        {
          id: "task-done",
          jobId: "job-open",
          title: "Done work",
          status: "done",
          dueAt: new Date("2026-09-01T00:00:00.000Z"),
          plannedEndAt: null,
        },
      ],
      fieldNotes: [
        {
          jobId: "job-logged",
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
          transcript: "Hold the south elevation.",
          filename: "raw.webm",
          createdAt: new Date("2026-09-15T12:00:00.000Z"),
        },
        {
          id: "voice-done",
          jobId: "job-open",
          status: "completed",
          transcript: "Already extracted.",
          filename: "done.webm",
          createdAt: new Date("2026-09-14T12:00:00.000Z"),
        },
      ],
      events: [
        {
          kind: "voice_note_extracted",
          payload: { voiceNoteId: "voice-done" },
          createdAt: new Date("2026-09-14T13:00:00.000Z"),
        },
      ],
    });

    expect(rows.map((row) => row.kind)).toEqual([
      "unextracted_voice_note",
      "failed_transcription",
      "blocked_job",
      "overdue_task",
      "missing_daily_log",
      "missing_daily_log",
    ]);
    expect(rows.find((row) => row.kind === "missing_daily_log" && row.label.includes("Logged"))).toBeUndefined();
    expect(rows.find((row) => row.label.includes("done.webm"))).toBeUndefined();
    const partial = listOperationsExceptions({
      now: NOW,
      jobs: [],
      tasks: [{ id: "task-1", jobId: "job-open", title: "Tape windows", status: "open", dueAt: null, plannedEndAt: null }],
      fieldNotes: [],
      voiceNotes: [
        {
          id: "voice-partial",
          jobId: "job-open",
          status: "completed",
          transcript: "Hold the south wall. Request more tape for the afternoon lift.",
          filename: "partial.webm",
          createdAt: new Date("2026-09-15T12:00:00.000Z"),
        },
        {
          id: "voice-finished",
          jobId: "job-open",
          status: "completed",
          transcript: "Hold the south wall.",
          filename: "finished.webm",
          createdAt: new Date("2026-09-15T11:00:00.000Z"),
        },
      ],
      events: [
        {
          kind: "voice_note_extracted",
          payload: { voiceNoteId: "voice-partial", selectedText: "Hold the south wall." },
          createdAt: new Date("2026-09-15T12:30:00.000Z"),
        },
        {
          kind: "voice_note_extracted",
          payload: { voiceNoteId: "voice-finished", selectedText: "Hold the south wall." },
          createdAt: new Date("2026-09-15T11:30:00.000Z"),
        },
      ],
    });
    expect(partial.find((row) => row.label.includes("partial.webm"))?.label).toBe(
      "Remaining transcript: partial.webm",
    );
    expect(partial.find((row) => row.label.includes("finished.webm"))).toBeUndefined();
    expect(rows.find((row) => row.kind === "failed_transcription")?.href).toBe(
      "/app/jobs/job-open#voice-notes",
    );
    expect(rows.find((row) => row.kind === "blocked_job")?.href).toBe(
      "/app/jobs?status=blocked",
    );
    expect(rows.find((row) => row.kind === "overdue_task")?.href).toBe(
      PORTFOLIO_SCHEDULE_WIDGETS.overdueTasks.href,
    );
    expect(rows.find((row) => row.kind === "unextracted_voice_note")?.href).toBe(
      "/app/jobs/job-open#voice-notes",
    );
    expect(rows.find((row) => row.label.includes("Podium"))?.href).toBe(
      "/app/jobs/job-open#field-log",
    );
  });

  it("returns the eight oldest rows", () => {
    const jobs = Array.from({ length: 10 }, (_, index) => ({
      id: `job-${index}`,
      name: `Job ${index}`,
      status: "in_progress",
      updatedAt: new Date(NOW.getTime() - index * 86_400_000),
    }));
    const rows = listOperationsExceptions({
      now: NOW,
      jobs,
      tasks: [],
      fieldNotes: [],
      voiceNotes: [],
      events: [],
    });
    expect(rows).toHaveLength(8);
  });

  it("keeps a quantity pace warning when older rows fill the list", () => {
    const jobs = Array.from({ length: 10 }, (_, index) => ({
      id: `job-${index}`,
      name: `Job ${index}`,
      status: "in_progress",
      updatedAt: new Date(NOW.getTime() - (index + 1) * 86_400_000),
    }));
    const rows = listOperationsExceptions({
      now: NOW,
      jobs,
      tasks: [
        {
          id: "task-1",
          jobId: "job-0",
          title: "Install",
          status: "open",
          dueAt: null,
          plannedEndAt: null,
          statedQuantity: 40,
          statedUnit: "bags",
        },
      ],
      fieldNotes: [],
      quantities: [{ jobId: "job-0", quantity: 48, unit: "bags" }],
      voiceNotes: [],
      events: [],
    });
    expect(rows.filter((row) => row.kind === "missing_daily_log")).toHaveLength(8);
    expect(rows.some((row) => row.kind === "quantity_pace")).toBe(true);
    expect(rows).toHaveLength(9);
  });

  it("uses each job calendar for today's daily log", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    const rows = listOperationsExceptions({
      now,
      jobs: [
        {
          id: "toronto",
          name: "Toronto job",
          status: "in_progress",
          updatedAt: now,
          timeZone: "America/Toronto",
        },
        {
          id: "honolulu",
          name: "Honolulu job",
          status: "in_progress",
          updatedAt: now,
          timeZone: "Pacific/Honolulu",
        },
      ],
      tasks: [],
      fieldNotes: [
        {
          jobId: "toronto",
          kind: "daily_report",
          createdAt: new Date("2026-09-19T05:00:00.000Z"),
        },
        {
          jobId: "honolulu",
          kind: "daily_report",
          createdAt: new Date("2026-09-19T05:00:00.000Z"),
        },
      ],
      voiceNotes: [],
      events: [],
    });
    expect(rows.find((row) => row.label.includes("Toronto"))).toBeUndefined();
    expect(rows.find((row) => row.label.includes("Honolulu"))?.kind).toBe(
      "missing_daily_log",
    );
  });

  it("reads the demo home source without dropping jobs", () => {
    const source = listDemoHomeExceptionSource();
    const rows = listOperationsExceptions({
      now: NOW,
      ...source,
    });
    expect(source.jobs.some((job) => job.id === DEMO_JOB_ID)).toBe(true);
    expect(rows.some((row) => row.href.includes(DEMO_JOB_ID))).toBe(true);
  });

  it("warns when installed quantity is ahead of the stated remainder", () => {
    const rows = listOperationsExceptions({
      now: NOW,
      jobs: [
        {
          id: "job-open",
          name: "Podium",
          status: "in_progress",
          updatedAt: NOW,
        },
      ],
      tasks: [
        {
          id: "task-1",
          jobId: "job-open",
          title: "Install closed-cell",
          status: "open",
          dueAt: null,
          plannedEndAt: null,
          statedQuantity: 40,
          statedUnit: "bags",
        },
      ],
      fieldNotes: [],
      quantities: [{ jobId: "job-open", quantity: 48, unit: "bags" }],
      voiceNotes: [],
      events: [],
    });
    const pace = rows.find((row) => row.kind === "quantity_pace");
    expect(pace?.href).toBe("/app/jobs/job-open#tasks");
    expect(pace?.label).toBe(
      "Quantity pace: 48 bags installed is ahead of 40 bags still stated on open tasks: Podium",
    );
  });

  it("links dead-letter commercial jobs for the viewer's organization", () => {
    const opportunityId = "99999999-9999-4999-8999-999999999991";
    const projectId = "88888888-8888-4888-8888-888888888881";
    const rows = listOperationsExceptions({
      now: NOW,
      jobs: [],
      tasks: [],
      fieldNotes: [],
      voiceNotes: [],
      events: [],
      viewerOrganizationId: "org-1",
      backgroundJobs: [
        {
          id: "scan",
          organizationId: "org-1",
          kind: "document.scan",
          status: "dead_letter",
          payload: { opportunityId },
          updatedAt: new Date("2026-09-18T12:00:00.000Z"),
        },
        {
          id: "extract",
          organizationId: "org-1",
          kind: "document.extract",
          status: "failed",
          payload: { opportunityId },
          updatedAt: new Date("2026-09-18T13:00:00.000Z"),
        },
        {
          id: "draft",
          organizationId: "org-1",
          kind: "commercial_ai.draft",
          status: "dead_letter",
          payload: { opportunityId },
          updatedAt: new Date("2026-09-18T14:00:00.000Z"),
        },
        {
          id: "convert",
          organizationId: "org-1",
          kind: "estimate.converted",
          status: "dead_letter",
          payload: { projectId },
          updatedAt: new Date("2026-09-18T15:00:00.000Z"),
        },
        {
          id: "other-org",
          organizationId: "org-2",
          kind: "document.scan",
          status: "dead_letter",
          payload: { opportunityId },
          updatedAt: new Date("2026-09-18T11:00:00.000Z"),
        },
        {
          id: "queued",
          organizationId: "org-1",
          kind: "document.scan",
          status: "queued",
          payload: { opportunityId },
          updatedAt: NOW,
        },
      ],
    });
    expect(rows.map((row) => [row.kind, row.href])).toEqual([
      ["failed_document_scan", `/app/opportunities/${opportunityId}#bid-package`],
      ["failed_document_extraction", `/app/opportunities/${opportunityId}#bid-package`],
      ["failed_bid_proposal", `/app/opportunities/${opportunityId}#estimates`],
      ["failed_estimate_conversion", `/app/projects/${projectId}`],
    ]);
  });

  it("keeps a commercial dead letter when older rows fill the list", () => {
    const jobs = Array.from({ length: 10 }, (_, index) => ({
      id: `job-${index}`,
      name: `Job ${index}`,
      status: "in_progress",
      updatedAt: new Date(NOW.getTime() - (index + 1) * 86_400_000),
    }));
    const rows = listOperationsExceptions({
      now: NOW,
      jobs,
      tasks: [],
      fieldNotes: [],
      voiceNotes: [],
      events: [],
      viewerOrganizationId: "org-1",
      backgroundJobs: [
        {
          id: "scan",
          organizationId: "org-1",
          kind: "document.scan",
          status: "dead_letter",
          payload: { opportunityId: "99999999-9999-4999-8999-999999999991" },
          updatedAt: new Date("2026-09-01T00:00:00.000Z"),
        },
      ],
    });
    expect(rows.some((row) => row.kind === "failed_document_scan")).toBe(true);
    expect(rows.filter((row) => row.kind === "missing_daily_log")).toHaveLength(8);
  });
});
