import { describe, expect, it } from "vitest";
import {
  calendlyUnmatchedEvents,
  estimateRequestEvents,
  leads,
} from "@/db/schema";

describe("db schema exports", () => {
  it("defines leads, unmatched calendly events, and review events", () => {
    expect(leads).toBeDefined();
    expect(calendlyUnmatchedEvents).toBeDefined();
    expect(estimateRequestEvents).toBeDefined();
  });
});
