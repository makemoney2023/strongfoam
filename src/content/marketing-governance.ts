import "server-only";

import { assertMarketingClaimsSafe } from "@/content/claims";
import { site } from "@/content/site";

type HeldApproval<T> = {
  approved: false;
  value: T;
  reason: string;
};

export const contentApprovals: {
  founding2016: HeldApproval<number>;
  alternate2020Date: HeldApproval<number>;
  fiftyYearsExperience: HeldApproval<number>;
  oneHundredYearsExperience: HeldApproval<number>;
  currentGtaStatus: HeldApproval<string>;
  namedClients: HeldApproval<readonly string[]>;
  namedProjects: HeldApproval<readonly string[]>;
  supplierRelationships: HeldApproval<readonly string[]>;
  applicatorStatus: HeldApproval<readonly string[]>;
} = {
  founding2016: {
    approved: false,
    value: 2016,
    reason: "The founding date requires explicit client approval.",
  },
  alternate2020Date: {
    approved: false,
    value: 2020,
    reason: "The alternate date conflicts with the higher-priority source.",
  },
  fiftyYearsExperience: {
    approved: false,
    value: 50,
    reason: "The combined-experience claim needs substantiation.",
  },
  oneHundredYearsExperience: {
    approved: false,
    value: 100,
    reason: "The older combined-experience claim conflicts with later copy.",
  },
  currentGtaStatus: {
    approved: false,
    value: "Woodbridge / GTA",
    reason: "Current operating status and public NAP are not confirmed.",
  },
  namedClients: {
    approved: false,
    value: [],
    reason: "No named client has current relationship and publication approval.",
  },
  namedProjects: {
    approved: false,
    value: [],
    reason: "No named project has client and publication approval.",
  },
  supplierRelationships: {
    approved: false,
    value: ["Genyk", "Henry", "Soprema"],
    reason:
      "Current supplier relationships and logo permissions are not confirmed.",
  },
  applicatorStatus: {
    approved: false,
    value: ["Henry Blueskin", "Soprema Sopraseal"],
    reason: "Current certification or applicator status is not confirmed.",
  },
};

export type PublicLocation = {
  id:
    | "kitchener-operations"
    | "kitchener-head-office"
    | "london-dorchester"
    | "gta-woodbridge";
  label: string;
  address: {
    street: string;
    locality: string;
    region: string;
    postal: string;
    country: "CA";
  } | null;
  serviceAreaWording: string;
  approvals: {
    address: boolean;
    activeStatus: boolean;
    publicLabel: boolean;
    serviceAreaWording: boolean;
  };
  publicationStatus: "publish" | "hold";
  publicationReason: string;
};

export const locationRecords: readonly PublicLocation[] = [
  {
    id: "kitchener-operations",
    label: site.primaryOps.label,
    address: {
      street: site.primaryOps.street,
      locality: site.primaryOps.locality,
      region: site.primaryOps.region,
      postal: site.primaryOps.postal,
      country: site.primaryOps.country,
    },
    serviceAreaWording: "Kitchener operations",
    approvals: {
      address: true,
      activeStatus: true,
      publicLabel: true,
      serviceAreaWording: true,
    },
    publicationStatus: "publish",
    publicationReason:
      "The current source-copy audit approves the Breithaupt Street operations address for public location and contact use.",
  },
  {
    id: "kitchener-head-office",
    label: "Kitchener head office",
    address: {
      street: "322-72 St. Leger Street",
      locality: "Kitchener",
      region: "ON",
      postal: "N2H 6R4",
      country: "CA",
    },
    serviceAreaWording: "Kitchener head office",
    approvals: {
      address: false,
      activeStatus: false,
      publicLabel: false,
      serviceAreaWording: false,
    },
    publicationStatus: "hold",
    publicationReason:
      "Hold until the address, active status, public label, and service-area wording are approved.",
  },
  {
    id: "london-dorchester",
    label: "London branch",
    address: {
      street: "5130 Hamilton Road",
      locality: "Dorchester",
      region: "ON",
      postal: "N0L 1G6",
      country: "CA",
    },
    serviceAreaWording: "London / Dorchester",
    approvals: {
      address: false,
      activeStatus: false,
      publicLabel: false,
      serviceAreaWording: false,
    },
    publicationStatus: "hold",
    publicationReason:
      "Hold until the branch address, active status, public label, and service-area wording are approved.",
  },
  {
    id: "gta-woodbridge",
    label: "GTA / Woodbridge",
    address: null,
    serviceAreaWording: "Greater Toronto Area",
    approvals: {
      address: false,
      activeStatus: false,
      publicLabel: false,
      serviceAreaWording: false,
    },
    publicationStatus: "hold",
    publicationReason:
      "Hold until a public address and current GTA operating status are approved.",
  },
] as const;

export function filterPublishableLocations(
  records: readonly PublicLocation[],
): readonly PublicLocation[] {
  return records.filter(
    (location) =>
      location.publicationStatus === "publish" &&
      location.address !== null &&
      Object.values(location.approvals).every(Boolean),
  );
}

assertMarketingClaimsSafe(
  { contentApprovals, locationRecords },
  "server-only marketing governance",
);
