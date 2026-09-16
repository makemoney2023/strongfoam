import { QUALIFYING_PROJECT_TYPES, SERVICE_IDS } from "@/lib/leads/types";
import type { QualifyInput, QualifyResult } from "@/lib/leads/types";

export function qualifyLead(input: QualifyInput): QualifyResult {
  const reasons: string[] = [];
  if (!QUALIFYING_PROJECT_TYPES.includes(input.projectType)) {
    reasons.push("project_type");
  }
  if (input.province !== "ON") {
    reasons.push("province");
  }
  const listed = input.services.filter((id) => SERVICE_IDS.includes(id));
  if (listed.length === 0) {
    reasons.push("services");
  }
  return {
    status: reasons.length === 0 ? "qualified" : "secondary",
    reasons,
  };
}
