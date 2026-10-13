import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { SchemaScript } from "@/components/marketing/schema-script";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { serviceContent } from "@/content/services";
import { marketingMetadata } from "@/lib/site-metadata";
import { marketingPageGraph } from "@/lib/site-schema";

export const metadata = marketingMetadata({
  path: "/services",
  title: "Commercial Insulation and Fire-Protection Services",
  description:
    "Compare four specification-led Strong Foam service families for Ontario commercial, industrial, and multi-unit construction.",
});

export default function ServicesPage() {
  const jsonLd = marketingPageGraph({
    path: "/services",
    name: "Specialty insulation and fire-protection services",
    description:
      "Four public service families connect building-envelope and passive-fire scopes to project specifications, assemblies, and site conditions.",
    breadcrumbs: [{ name: "Home", path: "/" }, { name: "Services" }],
  });

  return (
    <main id="main-content" className="flex-1">
      <SchemaScript graph={jsonLd} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Services" }]} />
      <InteriorHero
        eyebrow="Services"
        title="Specialty insulation and fire-protection services"
        description="Four public service families connect building-envelope and passive-fire scopes to project specifications, assemblies, and site conditions."
      />
      <section
        className="marketing-section page-rail"
        aria-labelledby="service-families-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Choose a scope</p>
          <h2 id="service-families-title">Four service families</h2>
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
