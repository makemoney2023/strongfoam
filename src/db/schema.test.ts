import { describe, expect, it } from "vitest";
import {
  calendlyUnmatchedEvents,
  estimateRequestComments,
  estimateRequestEvents,
  estimateRequestTasks,
  jobAssignments,
  jobDocuments,
  jobEvents,
  jobFieldNotes,
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
    expect(jobFieldNotes).toBeDefined();
  });
});
