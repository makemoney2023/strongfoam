import { describe, expect, it } from "vitest";
import { nextSurveyStep } from "@/lib/leads/graph";

describe("nextSurveyStep", () => {
  it("sends everyone through fit then location", () => {
    expect(nextSurveyStep("fit")).toBe("location");
  });

  it("routes residential to notes then contact then submit", () => {
    expect(nextSurveyStep("location", "residential_other")).toBe("notes");
    expect(nextSurveyStep("notes", "residential_other")).toBe("contact");
    expect(nextSurveyStep("contact", "residential_other")).toBe("submit");
  });

  it("routes commercial_ici through scope, project, files, contact", () => {
    expect(nextSurveyStep("location", "commercial_ici")).toBe("scope");
    expect(nextSurveyStep("scope", "commercial_ici")).toBe("project");
    expect(nextSurveyStep("project", "commercial_ici")).toBe("files");
    expect(nextSurveyStep("files", "commercial_ici")).toBe("contact");
    expect(nextSurveyStep("contact", "commercial_ici")).toBe("submit");
  });
});
