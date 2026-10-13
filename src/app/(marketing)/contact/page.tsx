import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { SchemaScript } from "@/components/marketing/schema-script";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { site } from "@/content/site";
import { marketingMetadata } from "@/lib/site-metadata";
import { marketingPageGraph } from "@/lib/site-schema";

export const metadata = marketingMetadata({
  path: "/contact",
  title: "Contact Strong Foam",
  description:
    "Call or email Strong Foam for approved public company information, project-estimating questions, and the shared request intake.",
});

export default function ContactPage() {
  const description =
    "Use the public channels below for company questions, estimating coordination, or the shared project intake.";
  const jsonLd = marketingPageGraph({
    path: "/contact",
    name: "Contact Strong Foam",
    description,
    breadcrumbs: [{ name: "Home", path: "/" }, { name: "Contact" }],
    includeLocalBusiness: true,
  });

  return (
    <main id="main-content" className="flex-1">
      <SchemaScript graph={jsonLd} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <InteriorHero
        eyebrow="Contact"
        title="Contact Strong Foam"
        description={description}
      />
      <section
        className="marketing-section page-rail"
        aria-labelledby="contact-channels-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Public contact channels</p>
          <h2 id="contact-channels-title">Reach the Strong Foam team</h2>
        </div>
        <div className="marketing-card-grid">
          <Card className="marketing-card">
            <CardHeader>
              <CardTitle>
                <h3>Phone</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`tel:${site.phoneE164}`}>{site.phoneDisplay}</Link>
            </CardContent>
          </Card>
          <Card className="marketing-card">
            <CardHeader>
              <CardTitle>
                <h3>Estimating</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`mailto:${site.emailEstimating}`}>
                {site.emailEstimating}
              </Link>
            </CardContent>
          </Card>
          <Card className="marketing-card">
            <CardHeader>
              <CardTitle>
                <h3>Location</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{site.primaryOps.label}</p>
              <Link href="/locations">View approved location details</Link>
            </CardContent>
          </Card>
        </div>
      </section>
      <section
        className="marketing-section page-rail"
        aria-labelledby="social-channels-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Social channels</p>
          <h2 id="social-channels-title">Follow Strong Foam</h2>
        </div>
        <div className="marketing-card-grid">
          {Object.entries(site.social).map(([network, href]) => (
            <Card key={network} className="marketing-card">
              <CardContent>
                <Link href={href}>{network}</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <CtaBand
        heading="Send project details to estimating"
        description="Use the shared intake for drawings, specifications, scope, access, and schedule details."
        primary={{ label: "Request an estimate", href: "/request-estimate" }}
        secondary={{ label: "View locations", href: "/locations" }}
      />
    </main>
  );
}
