import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { heroMedia } from "@/content/page-media";
import { PartnerGrid } from "@/components/marketing/partner-grid";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { partnerRecords } from "@/content/partners";

export const metadata: Metadata = {
  title: "Approved Partner Relationships",
  description:
    "Review Strong Foam supplier and client or contractor relationship sections governed by current-status and publication approvals.",
  alternates: { canonical: "/partners" },
};

assertMarketingClaimsSafe(metadata, "metadata /partners");

const suppliers = partnerRecords.filter(
  (partner) => partner.category === "supplier",
);
const clientContractors = partnerRecords.filter(
  (partner) => partner.category === "client-contractor",
);

export default function PartnersPage() {
  return (
    <main id="main-content" className="flex-1">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Partners" }]} />
      <InteriorHero
        eyebrow="Relationships"
        title="Approved partner relationships"
        description="Third-party marks appear only after identity, current relationship, official artwork, and publication permission are approved."
        media={heroMedia["partners"]}
      />
      <section
        className="marketing-section page-rail"
        aria-labelledby="supplier-partners-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Suppliers</p>
          <h2 id="supplier-partners-title">Approved supplier relationships</h2>
        </div>
        <PartnerGrid
          partners={suppliers}
          emptyMessage="No supplier names or logos are approved for publication yet."
        />
      </section>
      <section
        className="marketing-section page-rail"
        aria-labelledby="client-partners-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Clients and contractors</p>
          <h2 id="client-partners-title">
            Approved client and contractor relationships
          </h2>
        </div>
        <PartnerGrid
          partners={clientContractors}
          emptyMessage="No client or contractor names or logos are approved for publication yet."
        />
      </section>
      <CtaBand
        heading="Start a project conversation"
        description="Contact Strong Foam for public company information or use the shared intake for a project estimate."
        primary={{ label: "Request an estimate", href: "/request-estimate" }}
        secondary={{ label: "Contact Strong Foam", href: "/contact" }}
      />
    </main>
  );
}
