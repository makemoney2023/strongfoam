import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { ContactInquiryForm } from "@/components/marketing/contact-inquiry-form";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { heroMedia } from "@/content/page-media";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact Strong Foam",
  description:
    "Call or email Strong Foam for approved public company information, project-estimating questions, and the shared request intake.",
  alternates: { canonical: "/contact" },
};

assertMarketingClaimsSafe(metadata, "metadata /contact");

export default function ContactPage() {
  return (
    <main id="main-content" className="flex-1">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <InteriorHero
        eyebrow="Contact"
        title="Contact Strong Foam"
        description="Use the public channels below for company questions, estimating coordination, or the shared project intake."
        media={heroMedia["contact"]}
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
      <section className="marketing-section page-rail" aria-labelledby="contact-form-title">
        <div className="marketing-section__intro">
          <p className="section-kicker">General inquiry</p>
          <h2 id="contact-form-title">Send a question</h2>
        </div>
        <ContactInquiryForm />
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
