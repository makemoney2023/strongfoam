import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { LocationCards } from "@/components/marketing/location-cards";
import { SchemaScript } from "@/components/marketing/schema-script";
import { locationRecords } from "@/content/marketing-governance";
import { marketingMetadata } from "@/lib/site-metadata";
import { marketingPageGraph } from "@/lib/site-schema";

export const metadata = marketingMetadata({
  path: "/locations",
  title: "Strong Foam Kitchener Operations",
  description:
    "Find approved public location information for Strong Foam operations in Kitchener, Ontario.",
});

export default function LocationsPage() {
  const description =
    "Only current locations with approved public labels, addresses, active status, and service wording appear here.";
  const jsonLd = marketingPageGraph({
    path: "/locations",
    name: "Strong Foam locations",
    description,
    breadcrumbs: [{ name: "Home", path: "/" }, { name: "Locations" }],
    includeLocalBusiness: true,
  });

  return (
    <main id="main-content" className="flex-1">
      <SchemaScript graph={jsonLd} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Locations" }]} />
      <InteriorHero
        eyebrow="Locations"
        title="Strong Foam locations"
        description={description}
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
