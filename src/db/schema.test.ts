import { describe, expect, it } from "vitest";
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
  projects,
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
});
