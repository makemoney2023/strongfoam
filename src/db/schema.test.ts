import { describe, expect, it } from "vitest";
import {
  calendlyUnmatchedEvents,
  estimateRequestComments,
  estimateRequestEvents,
  estimateRequestTasks,
  jobEvents,
  jobs,
  leads,
  projects,
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
  });
});
