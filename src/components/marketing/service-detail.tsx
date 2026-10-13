import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import type { ServiceContent } from "@/content/services";
import { ServiceMediaGallery } from "@/components/marketing/service-media";
import { brandLockups, serviceMedia } from "@/content/page-media";

export function ServiceMarketingPage({
  service,
}: {
  service: ServiceContent;
}) {
  return (
    <main id="main-content" className="flex-1">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/services" },
          { label: service.title },
        ]}
      />
      <InteriorHero
        eyebrow="Services"
        title={service.title}
        description={service.summary}
      />
      {service.endorsement ? (
        <div className="page-rail service-lockup">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG lockup */}
          <img
            src={brandLockups.strongFire.src}
            width={brandLockups.strongFire.width}
            height={brandLockups.strongFire.height}
            alt="Strong Fire Protection"
            className="service-lockup__img"
          />
        </div>
      ) : null}
      <ServiceDetail service={service} />
      {serviceMedia[service.slug] ? (
        <ServiceMediaGallery
          slug={service.slug}
          title={service.title}
          media={serviceMedia[service.slug]!}
        />
      ) : null}
      <CtaBand
        heading={`Discuss your ${service.title.toLowerCase()} scope`}
        description="Share the drawings, specification, access, and schedule details needed to review project fit."
        primary={service.cta}
        secondary={{ label: "Explore all services", href: "/services" }}
      />
    </main>
  );
}

export function ServiceDetail({ service }: { service: ServiceContent }) {
  return (
    <section
      className="marketing-section page-rail"
      aria-labelledby={`${service.slug}-technical-scope`}
    >
      <div className="marketing-section__intro">
        <p className="section-kicker">Technical scope</p>
        <h2 id={`${service.slug}-technical-scope`}>{service.title}</h2>
        <p>{service.summary}</p>
        {service.endorsement ? (
          <p className="marketing-endorsement">{service.endorsement}</p>
        ) : null}
      </div>

      <div className="marketing-card-grid">
        {service.technicalSections.map((section) => (
          <Card key={section.id} className="marketing-card">
            <CardHeader>
              <CardTitle>
                <h3>{section.title}</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="marketing-cautions">
        <CardHeader>
          <CardTitle>
            <h3>Project conditions</h3>
          </CardTitle>
          <CardDescription>
            Confirm these items against the project specification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul>
            {service.cautions.map((caution) => (
              <li key={caution}>{caution}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
