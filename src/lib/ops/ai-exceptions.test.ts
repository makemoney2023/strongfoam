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

  it("reads the demo home source without dropping jobs", () => {
    const source = listDemoHomeExceptionSource();
    const rows = listOperationsExceptions({
      now: NOW,
      ...source,
    });
    expect(source.jobs.some((job) => job.id === DEMO_JOB_ID)).toBe(true);
    expect(rows.some((row) => row.href.includes(DEMO_JOB_ID))).toBe(true);
  });
});
