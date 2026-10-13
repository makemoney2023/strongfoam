import {
  filterPublishablePartners,
  type PartnerRecord,
} from "@/content/partner-publication";
import { PartnerLogo } from "@/components/marketing/partner-logo";

function MarqueeRow({
  label,
  partners,
  reverse = false,
}: {
  label: string;
  partners: readonly PartnerRecord[];
  reverse?: boolean;
}) {
  if (partners.length === 0) return null;
  // Slower for longer rows so every row moves at the same speed.
  const duration = `${partners.length * 3.2}s`;
  return (
    <div className="partner-marquee__row">
      <p className="partner-marquee__label">{label}</p>
      <div
        className={`partner-marquee__viewport${reverse ? " partner-marquee__viewport--reverse" : ""}`}
        style={{ ["--marquee-duration" as string]: duration }}
      >
        <div className="partner-marquee__track">
          <ul className="partner-marquee__list" aria-label={label}>
            {partners.map((partner) => (
              <li key={partner.id}>
                <PartnerLogo partner={partner} />
              </li>
            ))}
          </ul>
          <ul className="partner-marquee__list partner-marquee__list--clone" aria-hidden="true">
            {partners.map((partner) => (
              <li key={partner.id}>
                <PartnerLogo partner={partner} decorative />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Home trust band: reversed marks in slow, pausable marquee rows. */
export function PartnerMarquee({
  partners,
  emptyMessage,
}: {
  partners: readonly PartnerRecord[];
  emptyMessage: string;
}) {
  const approved = filterPublishablePartners(partners).filter(
    (partner) => partner.logo.approvedOfficialPath,
  );
  if (approved.length === 0) {
    return <p className="marketing-empty-state">{emptyMessage}</p>;
  }
  return (
    <div className="partner-marquee">
      <MarqueeRow label="Suppliers" partners={approved.filter((p) => p.category === "supplier")} />
      <MarqueeRow
        label="Clients & contractors"
        partners={approved.filter((p) => p.category !== "supplier")}
        reverse
      />
    </div>
  );
}
