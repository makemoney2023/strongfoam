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

export const OWNER_PARTNER_APPROVAL_DATE = "2026-10-13";

function ownerApprovedPartner(
  slug: string,
  displayName: string,
  category: PartnerCategory,
  logoSource: string,
): PartnerRecord {
  return {
    id: `partner-${slug}`,
    displayName,
    category,
    identity: {
      known: true,
      reason: `Identified from the owner-supplied mark (${logoSource}).`,
    },
    currentRelationship: {
      approved: true,
      reason: `The owner confirmed the relationship on ${OWNER_PARTNER_APPROVAL_DATE}.`,
    },
    publicationPermission: {
      approved: true,
      reason: `The owner confirmed permission to publish this mark on ${OWNER_PARTNER_APPROVAL_DATE}.`,
    },
    logo: {
      approvedOfficialPath: `/media/partners/${slug}.webp`,
      alt: `${displayName} logo`,
    },
    publicationStatus: "publish",
    publicationReason: `Owner approval recorded ${OWNER_PARTNER_APPROVAL_DATE}; logo cleaned from the supplied artwork.`,
  };
}

const SUP = "SFI Supplier Logo.docx";
const CLI = "SFI Client Logo's";

export const partnerRecords: readonly PartnerRecord[] = [
  ownerApprovedPartner("genyk", "Genyk", "supplier", `${CLI}/Genyk Logo.png`),
  ownerApprovedPartner("basf", "BASF", "supplier", SUP),
  ownerApprovedPartner("soprema", "Soprema", "supplier", `${CLI}/SOPREMA LOGO.png`),
  ownerApprovedPartner("henry", "Henry", "supplier", SUP),
  ownerApprovedPartner("gcp-grace", "GCP / Grace", "supplier", `${CLI}/GCP LOGO.png`),
  ownerApprovedPartner("carboline", "Carboline", "supplier", SUP),
  ownerApprovedPartner("hilti", "Hilti", "supplier", SUP),
  heldPartner(
    "partner-demilec",
    "Demilec",
    "supplier",
    "The source copy identifies Demilec; no logo file was supplied.",
  ),
  ownerApprovedPartner("sherwin-williams", "Sherwin-Williams", "supplier", SUP),
  ownerApprovedPartner("3m", "3M", "supplier", SUP),
  ownerApprovedPartner("dakon-construction", "Dakon Construction", "client-contractor", `${CLI}/Dakon-Construction.png`),
  ownerApprovedPartner("blockwall", "Blockwall Masonry", "client-contractor", `${CLI}/blockwall_logo.jpg`),
  ownerApprovedPartner("mcc", "Michael Clark Construction", "client-contractor", `${CLI}/mcc1.png`),
  ownerApprovedPartner("sem-construction", "SEM Construction", "client-contractor", `${CLI}/sem-construction-logo.png`),
  ownerApprovedPartner("southside-construction", "Southside Construction", "client-contractor", `${CLI}/0.png`),
  ownerApprovedPartner("melloul-blamey", "Melloul Blamey Construction", "client-contractor", `${CLI}/J_3EqG67_400x400.jpg`),
  ownerApprovedPartner("graceview", "Graceview General Contractors", "client-contractor", `${CLI}/Unknown-1.jpeg`),
  ownerApprovedPartner("stonerise", "Stonerise Construction", "client-contractor", `${CLI}/Unknown-1.png`),
  ownerApprovedPartner("k-and-l-construction", "K&L Construction", "client-contractor", `${CLI}/Unknown-2.jpeg`),
  ownerApprovedPartner("auburn-developments", "Auburn Developments", "client-contractor", `${CLI}/Unknown-2.png`),
  ownerApprovedPartner("drewlo", "Drewlo", "client-contractor", `${CLI}/Unknown-3.jpeg`),
  ownerApprovedPartner("devlan-construction", "Devlan Construction", "client-contractor", `${CLI}/Unknown-4.jpeg`),
  ownerApprovedPartner("hayman-construction", "Hayman Construction", "client-contractor", `${CLI}/Unknown-4.png`),
  ownerApprovedPartner("d-grant-construction", "D. Grant Construction", "client-contractor", `${CLI}/Unknown-5.jpeg`),
  ownerApprovedPartner("zehr", "Zehr", "client-contractor", `${CLI}/Unknown-5.png`),
  ownerApprovedPartner("tonda", "Tonda Construction", "client-contractor", `${CLI}/Unknown-6.jpeg`),
  ownerApprovedPartner("magil-construction", "Magil Construction", "client-contractor", `${CLI}/Unknown-6.png`),
  ownerApprovedPartner("sierra-construction", "Sierra Construction Group", "client-contractor", `${CLI}/Unknown-7.png`),
  ownerApprovedPartner("bronnenco-construction", "Bronnenco Construction", "client-contractor", `${CLI}/Unknown-8.png`),
  ownerApprovedPartner("csl", "CSL", "client-contractor", `${CLI}/Unknown.png`),
] as const;

assertMarketingClaimsSafe(partnerRecords, "typed partner review records");
