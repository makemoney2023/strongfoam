import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { LocationCards } from "@/components/marketing/location-cards";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { locationRecords } from "@/content/marketing-governance";

export const metadata: Metadata = {
  title: "Strong Foam Kitchener Operations",
  description:
    "Find approved public location information for Strong Foam operations in Kitchener, Ontario.",
  alternates: { canonical: "/locations" },
};

assertMarketingClaimsSafe(metadata, "metadata /locations");

export default function LocationsPage() {
  return (
    <main id="main-content" className="flex-1">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Locations" }]} />
      <InteriorHero
        eyebrow="Locations"
        title="Strong Foam locations"
        description="Only current locations with approved public labels, addresses, active status, and service wording appear here."
      />
      <section
        className="marketing-section page-rail"
        aria-labelledby="approved-locations-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Current public location</p>
          <h2 id="approved-locations-title">Approved operations information</h2>
        </div>
        <LocationCards locations={locationRecords} />
      </section>
      <CtaBand
        heading="Confirm project fit"
        description="Contact Strong Foam with a general question or share drawings and specifications through the estimate intake."
        primary={{ label: "Request an estimate", href: "/request-estimate" }}
        secondary={{ label: "Contact Strong Foam", href: "/contact" }}
      />
    </main>
  );
}
