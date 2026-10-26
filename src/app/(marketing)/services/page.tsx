import { pageMetadata } from "@/lib/page-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { heroMedia } from "@/content/page-media";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { serviceContent, serviceCountWord } from "@/content/services";
import { countWord } from "@/lib/count-words";

export const metadata: Metadata = pageMetadata({
  title: "Commercial Insulation and Fire-Protection Services",
  description:
    `Compare ${serviceCountWord} specification-led Strong Foam service families for Ontario commercial, industrial, and multi-unit construction.`,
  alternates: { canonical: "/services" },
});

assertMarketingClaimsSafe(metadata, "metadata /services");

export default function ServicesPage() {
  return (
    <main id="main-content" className="flex-1">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Services" }]} />
      <InteriorHero
        eyebrow="Services"
        title="Specialty insulation and fire-protection services"
        description="Spray foam, fire protection, air-vapour barriers, waterproofing, and firestopping for commercial, industrial, and multi-unit projects across Ontario."
        media={heroMedia["services"]}
      />
      <section
        className="marketing-section page-rail"
        aria-labelledby="service-families-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Choose a scope</p>
          <h2 id="service-families-title">
            {countWord(serviceContent.length, { capitalize: true })} service families
          </h2>
          <p>
            Each detail page explains suitable uses, technical conditions, and
            specification dependencies.
          </p>
        </div>
        <div className="marketing-card-grid">
          {serviceContent.map((service) => (
            <Card key={service.slug} className="marketing-card">
              <CardHeader>
                <CardTitle>
                  <h3>{service.title}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{service.summary}</p>
              </CardContent>
              <CardFooter>
                <Link
                  className="marketing-link-button marketing-link-button--outline"
                  href={service.canonicalPath}
                >
                  Explore {service.title}
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
      <CtaBand
        heading="Review a coordinated package"
        description="Share the drawings and specifications so estimating can review the service scopes that belong in the package."
        primary={{ label: "Request an estimate", href: "/request-estimate" }}
        secondary={{ label: "Contact Strong Foam", href: "/contact" }}
      />
    </main>
  );
}
