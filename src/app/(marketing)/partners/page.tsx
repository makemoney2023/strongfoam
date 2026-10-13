import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { heroMedia } from "@/content/page-media";
import { PartnerGrid } from "@/components/marketing/partner-grid";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { partnerRecords } from "@/content/partners";

export const metadata: Metadata = {
  title: "Partners and Clients",
  description:
    "The manufacturers Strong Foam installs and the builders and general contractors who trust our crews.",
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
        title="Strong relationships"
        description="We work with leading manufacturers and general contractors across Ontario. Strong People. Strong Service. Strong Results."
        media={heroMedia["partners"]}
      />
      <section
        className="marketing-section page-rail"
        aria-labelledby="supplier-partners-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Suppliers</p>
          <h2 id="supplier-partners-title">Manufacturers we install</h2>
        </div>
        <PartnerGrid
          partners={suppliers}
          columns={3}
        />
      </section>
      <section
        className="marketing-section page-rail"
        aria-labelledby="client-partners-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Clients and contractors</p>
          <h2 id="client-partners-title">
            Trusted by builders across Ontario
          </h2>
        </div>
        <PartnerGrid partners={clientContractors} />
      </section>
      <CtaBand
        heading="Start a project conversation"
        description="Tell us about your project, or send the drawings for an estimate."
        primary={{ label: "Request an estimate", href: "/request-estimate" }}
        secondary={{ label: "Contact Strong Foam", href: "/contact" }}
      />
    </main>
  );
}
