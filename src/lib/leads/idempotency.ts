import { createHash } from "node:crypto";
import type { LeadPayload } from "@/lib/leads/schema";

export function idempotencyKey(payload: LeadPayload): string {
  const canonical = {
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    company: payload.company,
    projectType: payload.projectType,
    city: payload.city,
    province: payload.province,
    services: "services" in payload ? payload.services : [],
    role: "role" in payload ? payload.role : null,
    buildingType: "buildingType" in payload ? payload.buildingType : "",
    timeline: "timeline" in payload ? payload.timeline : null,
    drawingsReady: "drawingsReady" in payload ? payload.drawingsReady : null,
    notes: payload.notes ?? "",
  };
  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}
