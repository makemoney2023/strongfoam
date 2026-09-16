import { services } from "@/content/site";

export const DRAFT_STORAGE_KEY = "sf-estimate-draft";
export const DRAFT_VERSION = 1 as const;

export const FIT_OPTIONS = [
  { value: "commercial_ici", label: "Commercial / ICI" },
  { value: "multi_unit", label: "Multi-unit residential" },
  { value: "industrial", label: "Industrial" },
  { value: "residential_other", label: "Residential / other" },
] as const;

export const PROVINCE_OPTIONS = [
  { value: "ON", label: "Ontario" },
  { value: "outside_ontario", label: "Outside Ontario" },
] as const;

export const ROLE_OPTIONS = [
  { value: "gc", label: "General contractor / construction manager" },
  { value: "owner_rep", label: "Developer / owner's representative" },
  { value: "consultant", label: "Architect / consultant" },
  { value: "property_manager", label: "Property / asset manager" },
  { value: "other", label: "Other" },
] as const;

export const TIMELINE_OPTIONS = [
  { value: "now_tendering", label: "Tendering now" },
  { value: "0_3_months", label: "Start within 3 months" },
  { value: "3_12_months", label: "Start within 12 months" },
  { value: "exploratory", label: "Exploratory" },
] as const;

export const DRAWINGS_OPTIONS = [
  { value: "yes", label: "Drawings ready" },
  { value: "no", label: "Not yet" },
  { value: "later", label: "Will send later" },
] as const;

export const CONSENT_LABEL =
  "I agree Strong Foam Insulation Inc. may use this information to respond to my estimate request.";

export const SCOPE_OPTIONS = services.map((service) => ({
  value: service.id,
  title: service.title,
  overlay: service.overlay,
}));
