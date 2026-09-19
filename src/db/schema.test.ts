import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  calendlyUnmatchedEvents,
  estimateRequestComments,
  estimateRequestEvents,
  estimateRequestTasks,
  jobDocuments,
  jobEvents,
  jobFieldNotes,
  jobTaskDependencies,
  jobTasks,
  jobs,
  leads,
  projectScheduleBaselineItems,
  projectScheduleBaselines,
  projects,
  scheduleCalendarExceptions,
  scheduleCalendars,
  workAreas,
} from "@/db/schema";

describe("db schema exports", () => {
  it("defines leads, unmatched calendly events, and review collaboration tables", () => {
    expect(leads).toBeDefined();
    expect(calendlyUnmatchedEvents).toBeDefined();
    expect(estimateRequestEvents).toBeDefined();
    expect(estimateRequestTasks).toBeDefined();
    expect(estimateRequestComments).toBeDefined();
    expect(projects).toBeDefined();
    expect(projects.scheduleCalendarId).toBeDefined();
    expect(scheduleCalendars).toBeDefined();
    expect(scheduleCalendarExceptions).toBeDefined();
    expect(projectScheduleBaselines).toBeDefined();
    expect(projectScheduleBaselineItems).toBeDefined();
    expect(jobs).toBeDefined();
    expect(jobEvents).toBeDefined();
    expect(workAreas).toBeDefined();
    expect(jobTasks).toBeDefined();
    expect(jobTasks.plannedStartAt).toBeDefined();
    expect(jobTasks.plannedEndAt).toBeDefined();
    expect(jobTasks.completedAt).toBeDefined();
    expect(jobTaskDependencies).toBeDefined();
    expect(jobTaskDependencies.predecessorTaskId).toBeDefined();
    expect(jobTaskDependencies.successorTaskId).toBeDefined();
    expect(jobTaskDependencies.lagDays).toBeDefined();
    expect(jobDocuments).toBeDefined();
    expect(jobFieldNotes).toBeDefined();
  });

  it("allows at most one default schedule calendar", () => {
    const index = getTableConfig(scheduleCalendars).indexes.find(
      (candidate) =>
        candidate.config.name === "schedule_calendars_single_default_idx",
    );

    expect(index?.config.unique).toBe(true);
    expect(index?.config.where).toBeDefined();
  });
});
