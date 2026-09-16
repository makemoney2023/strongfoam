import { describe, expect, it } from "vitest";
import { calendlyUnmatchedEvents, leads } from "@/db/schema";

describe("db schema exports", () => {
  it("defines leads and unmatched calendly events", () => {
    expect(leads).toBeDefined();
    expect(calendlyUnmatchedEvents).toBeDefined();
  });
});
