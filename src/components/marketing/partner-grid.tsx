import {
  filterPublishablePartners,
  type PartnerRecord,
} from "@/content/partner-publication";
import { PartnerLogo } from "@/components/marketing/partner-logo";

export function PartnerGrid({
  partners,
  columns = 4,
  emptyMessage = "Approved partner marks will appear here after relationship and publication permissions are recorded.",
}: {
  partners: readonly PartnerRecord[];
  emptyMessage?: string;
  /** Desktop column count; 3 keeps short lists (suppliers) in full rows. */
  columns?: 3 | 4;
}) {
  const approvedPartners = filterPublishablePartners(partners).filter(
    (partner) => partner.logo.approvedOfficialPath,
  );

  if (approvedPartners.length === 0) {
    return <p className="marketing-empty-state">{emptyMessage}</p>;
  }

  return (
    <ul className={`partner-logo-grid${columns === 3 ? " partner-logo-grid--3" : ""}`}>
      {approvedPartners.map((partner) => (
        <li key={partner.id} className="partner-logo-grid__cell">
          <PartnerLogo partner={partner} />
          <span className="partner-logo-grid__name">{partner.displayName}</span>
        </li>
      ))}
    </ul>
  );
}
