import "server-only";

import { assertMarketingClaimsSafe } from "@/content/claims";
import type { PartnerCategory, PartnerRecord } from "@/content/partner-publication";

export type {
  PartnerCategory,
  PartnerPublicationStatus,
  PartnerRecord,
} from "@/content/partner-publication";
export { filterPublishablePartners } from "@/content/partner-publication";

function heldPartner(
  id: PartnerRecord["id"],
  displayName: string,
  category: PartnerCategory,
  identityReason: string,
): PartnerRecord {
  return {
    id,
    displayName,
    category,
    identity: {
      known: true,
      reason: identityReason,
    },
    currentRelationship: {
      approved: false,
      reason:
        category === "supplier"
          ? "A current supplier relationship has not been approved."
          : "A current client or contractor relationship has not been approved.",
    },
    publicationPermission: {
      approved: false,
      reason: "Permission to publish the third-party mark is not recorded.",
    },
    logo: {
      approvedOfficialPath: null,
      alt: `${displayName} logo`,
    },
    publicationStatus: "hold",
    publicationReason:
      "Hold until the current relationship, official artwork, and publication permission are approved.",
  };
}

export const partnerRecords: readonly PartnerRecord[] = [
  heldPartner(
    "partner-genyk",
    "Genyk",
    "supplier",
    "The supplied mark and source copy identify Genyk.",
  ),
  heldPartner(
    "partner-basf",
    "BASF",
    "supplier",
    "The source copy identifies BASF.",
  ),
  heldPartner(
    "partner-soprema",
    "Soprema",
    "supplier",
    "The supplied mark and source copy identify Soprema.",
  ),
  heldPartner(
    "partner-henry",
    "Henry",
    "supplier",
    "The supplied mark and source copy identify Henry.",
  ),
  heldPartner(
    "partner-gcp-grace",
    "GCP / Grace",
    "supplier",
    "The supplied mark and source copy identify GCP / Grace.",
  ),
  heldPartner(
    "partner-carboline",
    "Carboline",
    "supplier",
    "The source copy identifies Carboline.",
  ),
  heldPartner(
    "partner-hilti",
    "Hilti",
    "supplier",
    "The source copy identifies Hilti.",
  ),
  heldPartner(
    "partner-demilec",
    "Demilec",
    "supplier",
    "The source copy identifies Demilec.",
  ),
  heldPartner(
    "partner-sherwin-williams",
    "Sherwin-Williams",
    "supplier",
    "The source copy identifies Sherwin-Williams.",
  ),
  heldPartner(
    "partner-3m",
    "3M",
    "supplier",
    "The source copy identifies 3M.",
  ),
  heldPartner(
    "partner-dakon-construction",
    "Dakon Construction",
    "client-contractor",
    "The supplied mark identifies Dakon Construction.",
  ),
  heldPartner(
    "partner-blockwall",
    "Blockwall",
    "client-contractor",
    "The supplied mark identifies Blockwall.",
  ),
  heldPartner(
    "partner-mcc",
    "MCC",
    "client-contractor",
    "The supplied mark identifies MCC.",
  ),
  heldPartner(
    "partner-sem-construction",
    "SEM Construction",
    "client-contractor",
    "The supplied mark identifies SEM Construction.",
  ),
] as const;

assertMarketingClaimsSafe(partnerRecords, "typed partner review records");
