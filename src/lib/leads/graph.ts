import type { ProjectType } from "@/lib/leads/types";

export type SurveyStep =
  | "fit"
  | "location"
  | "notes"
  | "scope"
  | "project"
  | "files"
  | "contact";

export function nextSurveyStep(
  current: SurveyStep,
  projectType?: ProjectType,
): SurveyStep | "submit" {
  if (current === "fit") return "location";
  if (current === "location") {
    return projectType === "residential_other" ? "notes" : "scope";
  }
  if (current === "notes") return "contact";
  if (current === "scope") return "project";
  if (current === "project") return "files";
  if (current === "files") return "contact";
  return "submit";
}
