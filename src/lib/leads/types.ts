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

export const SERVICE_IDS = [
  "spray-foam",
  "fireproofing",
  "intumescent",
  "avb",
  "spf-roofing",
] as const;
export type ListedServiceId = (typeof SERVICE_IDS)[number];

export type QualifyInput = {
  projectType: ProjectType;
  province: Province;
  services: ListedServiceId[];
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
