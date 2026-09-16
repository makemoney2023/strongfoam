import { describe, expect, it } from "vitest";
import { qualifyLead } from "@/lib/leads/qualify";

describe("qualifyLead", () => {
  it("qualifies Ontario ICI with a listed service", () => {
    const result = qualifyLead({
      projectType: "commercial_ici",
      province: "ON",
      services: ["spray-foam"],
    });
    expect(result.status).toBe("qualified");
    expect(result.reasons).toEqual([]);
  });

  it("qualifies multi_unit and industrial the same way", () => {
    for (const projectType of ["multi_unit", "industrial"] as const) {
      expect(
        qualifyLead({
          projectType,
          province: "ON",
          services: ["fireproofing"],
        }).status,
      ).toBe("qualified");
    }
  });

  it("marks residential as secondary", () => {
    const result = qualifyLead({
      projectType: "residential_other",
      province: "ON",
      services: ["spray-foam"],
    });
    expect(result.status).toBe("secondary");
    expect(result.reasons).toContain("project_type");
  });

  it("marks out-of-province as secondary", () => {
    const result = qualifyLead({
      projectType: "commercial_ici",
      province: "outside_ontario",
      services: ["spray-foam"],
    });
    expect(result.status).toBe("secondary");
    expect(result.reasons).toContain("province");
  });

  it("marks empty services as secondary", () => {
    const result = qualifyLead({
      projectType: "commercial_ici",
      province: "ON",
      services: [],
    });
    expect(result.status).toBe("secondary");
    expect(result.reasons).toContain("services");
  });
});
