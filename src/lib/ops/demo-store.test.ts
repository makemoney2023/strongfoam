import { describe, expect, it } from "vitest";
import { demoEstimateRequests } from "@/lib/ops/demo-data";
import {
  matchesEstimateRequestFilters,
  useDemoOpsStore,
} from "@/lib/ops/demo-store";

describe("demo ops store", () => {
  it("uses demo data when the database URL is absent", () => {
    expect(useDemoOpsStore({})).toBe(true);
    expect(useDemoOpsStore({ DATABASE_URL: "postgres://example" })).toBe(false);
    expect(
      useDemoOpsStore({ DATABASE_URL: "postgres://example", OPS_DEMO: "1" }),
    ).toBe(true);
  });

  it("filters demo requests by search and workflow", () => {
    const [qualified] = demoEstimateRequests();
    expect(
      matchesEstimateRequestFilters(qualified, { q: "acme", qualification: "qualified" }),
    ).toBe(true);
    expect(
      matchesEstimateRequestFilters(qualified, { workflowStatus: "won" }),
    ).toBe(false);
  });
});
