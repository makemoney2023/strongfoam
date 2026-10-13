import {
  getServiceBySlug,
  type ServiceRouteSlug,
} from "@/content/services";
import type { ListedServiceId } from "@/lib/leads/types";

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

const scopeMappings: readonly {
  value: ListedServiceId;
  displaySlug: ServiceRouteSlug;
  title: string;
  overlay: string;
}[] = [
  {
    value: "spray-foam",
    displaySlug: "spray-foam-insulation",
    title: "Spray foam insulation",
    overlay:
      "Specification-led insulation and air sealing for suitable commercial and multi-unit assemblies.",
  },
  {
    value: "fireproofing",
    displaySlug: "fire-protection",
    title: "Cementitious fireproofing",
    overlay:
      "Spray-applied passive fire protection selected to the listed design and project specification.",
  },
  {
    value: "intumescent",
    displaySlug: "fire-protection",
    title: "Intumescent coatings",
    overlay:
      "Intumescent fire-protection systems selected for the member, exposure, finish, and maintenance requirements.",
  },
  {
    value: "avb",
    displaySlug: "air-vapour-barriers",
    title: "Air-vapour barrier membranes",
    overlay:
      "Specified air and vapour control layers across suitable walls, transitions, and penetrations.",
  },
  {
    value: "spf-roofing",
    displaySlug: "spf-roofing",
    title: "SPF roofing",
    overlay:
      "Roofing foam and protective coating systems for suitable specified new or recover applications.",
  },
];

export const SCOPE_OPTIONS = scopeMappings.map((mapping) => {
  const service = getServiceBySlug(mapping.displaySlug);
  return {
    ...mapping,
    displayPath: service.canonicalPath,
  };
});
