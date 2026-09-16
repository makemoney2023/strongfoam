import type { ServiceId } from "@/content/site";

export type ProjectType =
  | "commercial_ici"
  | "multi_unit"
  | "industrial"
  | "residential_other";

export type Province = "ON" | "outside_ontario";

export type Role =
  | "gc"
  | "owner_rep"
  | "consultant"
  | "property_manager"
  | "other";

export type Timeline =
  | "now_tendering"
  | "0_3_months"
  | "3_12_months"
  | "exploratory";

export type DrawingsReady = "yes" | "no" | "later";

export type QualifyInput = {
  projectType: ProjectType;
  province: Province;
  services: ServiceId[];
};

export type QualifyResult = {
  status: "qualified" | "secondary";
  reasons: string[];
};

export const QUALIFYING_PROJECT_TYPES: ProjectType[] = [
  "commercial_ici",
  "multi_unit",
  "industrial",
];

export const SERVICE_IDS: ServiceId[] = [
  "spray-foam",
  "fireproofing",
  "intumescent",
  "avb",
  "spf-roofing",
];
