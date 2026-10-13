import { ResponsivePicture } from "@/components/marketing/responsive-picture";
import { aboutImages } from "@/content/page-media";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
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
import { companyContent } from "@/content/site";

export const metadata: Metadata = {
  title: "About Strong Foam Insulation",
  description:
    "Learn how Strong Foam approaches ICI and multi-unit work, employee culture, safe field practices, service, and long-term relationships.",
  alternates: { canonical: "/about" },
};

assertMarketingClaimsSafe(metadata, "metadata /about");

const commitments = [
  ["Mission", companyContent.mission],
  ["Vision", companyContent.vision],
  ["Purpose", companyContent.purpose],
  ["Promise", companyContent.promise],
  ["Objective", companyContent.objective],
] as const;

export default function AboutPage() {
  return (
    <main id="main-content" className="flex-1">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
      <InteriorHero
        eyebrow="Company"
        title="About Strong Foam"
        description={companyContent.story}
        media={heroMedia["about"]}
      />
      <section
        className="marketing-section page-rail"
        aria-labelledby="company-focus-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Company focus</p>
          <h2 id="company-focus-title">Field-minded specialty work</h2>
          <p>{companyContent.focus}</p>
        </div>
        <div className="marketing-card-grid">
          <Card className="marketing-card">
            <CardHeader>
              <CardTitle>
                <h3>Employee culture</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{companyContent.culture}</p>
            </CardContent>
          </Card>
          <Card className="marketing-card">
            <CardHeader>
              <CardTitle>
                <h3>Safety</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{companyContent.safety}</p>
            </CardContent>
          </Card>
        </div>
      </section>
      <section
        className="marketing-section page-rail"
        aria-labelledby="company-commitments-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Commitments</p>
          <h2 id="company-commitments-title">How Strong Foam works</h2>
        </div>
        <div className="marketing-card-grid">
          {commitments.map(([title, body]) => (
            <Card key={title} className="marketing-card">
              <CardHeader>
                <CardTitle>
                  <h3>{title}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section
        className="marketing-section page-rail"
        aria-labelledby="company-slogans-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Strong Foam</p>
          <h2 id="company-slogans-title">The words behind the work</h2>
        </div>
        <div className="marketing-card-grid">
          {companyContent.slogans.map((slogan) => (
            <Card key={slogan} className="marketing-card">
              <CardContent>
                <p>{slogan}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section
        className="marketing-section page-rail service-media"
        aria-labelledby="about-field-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">On site</p>
          <h2 id="about-field-title">Our crews and equipment</h2>
        </div>
        <div className="service-media__grid">
          {aboutImages.map((image) => (
            <figure key={image.manifestId} className="service-media__item">
              <ResponsivePicture
                image={image}
                sizes="(max-width: 900px) 100vw, 25vw"
                className="service-media__img"
              />
              <figcaption>{image.alt}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <CtaBand
        heading="Explore the service scopes"
        description="Review the four service families or share a project package with estimating."
        primary={{ label: "Explore services", href: "/services" }}
        secondary={{ label: "Request an estimate", href: "/request-estimate" }}
      />
    </main>
  );
}
