export type PartnerCategory = "supplier" | "client-contractor";
export type PartnerPublicationStatus = "publish" | "hold" | "reject";

export type PartnerRecord = {
  id: `partner-${string}`;
  displayName: string;
  category: PartnerCategory;
  identity: {
    known: boolean;
    reason: string;
  };
  currentRelationship: {
    approved: boolean;
    reason: string;
  };
  publicationPermission: {
    approved: boolean;
    reason: string;
  };
  logo: {
    approvedOfficialPath: string | null;
    alt: string;
  };
  publicationStatus: PartnerPublicationStatus;
  publicationReason: string;
};

export function filterPublishablePartners(
  records: readonly PartnerRecord[],
): readonly PartnerRecord[] {
  return records.filter(
    (record) =>
      record.publicationStatus === "publish" &&
      record.identity.known &&
      record.currentRelationship.approved &&
      record.publicationPermission.approved &&
      Boolean(record.logo.approvedOfficialPath) &&
      record.logo.alt.trim().length > 0,
  );
}
