import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  calendlyUnmatchedEvents,
  estimateRequestComments,
  estimateRequestEvents,
  estimateRequestTasks,
  jobAssignments,
  jobDocuments,
  jobEvents,
  jobFieldNotes,
  jobPlanAnnotations,
  jobTaskDependencies,
  jobTasks,
  jobs,
  leads,
  memberships,
  organizations,
  projectScheduleBaselineItems,
  projectScheduleBaselines,
  projects,
  scheduleCalendarExceptions,
  scheduleCalendars,
  userEvents,
  users,
  workAreas,
} from "@/db/schema";

describe("db schema exports", () => {
  it("defines leads, unmatched calendly events, and review collaboration tables", () => {
    expect(leads).toBeDefined();
    expect(calendlyUnmatchedEvents).toBeDefined();
    expect(estimateRequestEvents).toBeDefined();
    expect(estimateRequestTasks).toBeDefined();
    expect(estimateRequestComments).toBeDefined();
    expect(organizations).toBeDefined();
    expect(users).toBeDefined();
    expect(users.sessionVersion).toBeDefined();
    expect(userEvents).toBeDefined();
    expect(memberships).toBeDefined();
    expect(projects).toBeDefined();
    expect(projects.scheduleCalendarId).toBeDefined();
    expect(scheduleCalendars).toBeDefined();
    expect(scheduleCalendarExceptions).toBeDefined();
    expect(projectScheduleBaselines).toBeDefined();
    expect(projectScheduleBaselineItems).toBeDefined();
    expect(jobs).toBeDefined();
    expect(jobEvents).toBeDefined();
    expect(jobAssignments).toBeDefined();
    expect(workAreas).toBeDefined();
    expect(jobTasks).toBeDefined();
    expect(jobTasks.plannedStartAt).toBeDefined();
    expect(jobTasks.plannedEndAt).toBeDefined();
    expect(jobTasks.completedAt).toBeDefined();
    expect(jobTasks.assigneeUserId).toBeDefined();
    expect(jobTaskDependencies).toBeDefined();
    expect(jobTaskDependencies.predecessorTaskId).toBeDefined();
    expect(jobTaskDependencies.successorTaskId).toBeDefined();
    expect(jobTaskDependencies.lagDays).toBeDefined();
    expect(jobDocuments).toBeDefined();
    expect(jobDocuments.sheetKey).toBeDefined();
    expect(jobDocuments.versionNumber).toBeDefined();
    expect(jobPlanAnnotations).toBeDefined();
    expect(jobFieldNotes).toBeDefined();
    expect(jobFieldNotes.annotationId).toBeDefined();
  });

  it("allows at most one default schedule calendar", () => {
    const index = getTableConfig(scheduleCalendars).indexes.find(
      (candidate) =>
        candidate.config.name === "schedule_calendars_single_default_idx",
    );

    expect(index?.config.unique).toBe(true);
    expect(index?.config.where).toBeDefined();
  });

  it("locks default-calendar writes before cleanup and index creation", () => {
    const migration = readFileSync(
      new URL(
        "../../drizzle/0011_schedule_calendar_default.sql",
        import.meta.url,
      ),
      "utf8",
    ).trim();
    const lock =
      'LOCK TABLE "schedule_calendars" IN SHARE MODE;';
    const cleanup = 'WITH "ranked_defaults" AS (';
    const index =
      'CREATE UNIQUE INDEX "schedule_calendars_single_default_idx"';

    expect(migration.startsWith(lock)).toBe(true);
    expect(migration.indexOf(lock)).toBeLessThan(migration.indexOf(cleanup));
    expect(migration.indexOf(cleanup)).toBeLessThan(migration.indexOf(index));
  });
});
