import { describe, expect, it } from "vitest";
import { buildMaterialPickList } from "@/lib/ops/material-pick-list";

describe("material pick list", () => {
  it("groups matching requests and ignores other note kinds", () => {
    const result = buildMaterialPickList([
      { id: "1", kind: "material_request", body: "Closed-cell bags" },
      { id: "2", kind: "material_request", body: "closed-cell bags" },
      { id: "3", kind: "blocker", body: "Hold the lift" },
      { id: "4", kind: "material_request", body: "  " },
    ]);
    expect(result.lines).toEqual([
      { text: "Closed-cell bags", count: 2, ids: ["1", "2"] },
    ]);
    expect(result.draft).toBe("Closed-cell bags (×2)");
  });
});
