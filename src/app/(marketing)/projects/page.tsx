import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { ProjectGallery } from "@/components/marketing/project-gallery";
import { SchemaScript } from "@/components/marketing/schema-script";
import { projectRecords } from "@/content/projects";
import { marketingMetadata } from "@/lib/site-metadata";
import { marketingPageGraph } from "@/lib/site-schema";

export const metadata = marketingMetadata({
  path: "/projects",
  title: "Approved Project Photography",
  description:
    "View reviewed first-party photography with permission-safe trade descriptions for Strong Foam building-envelope work.",
});

export default function ProjectsPage() {
  const description =
    "This gallery uses reviewed first-party media and generic trade descriptions without unapproved client names, addresses, or performance claims.";
  const jsonLd = marketingPageGraph({
    path: "/projects",
    name: "Approved project photography",
    description,
    breadcrumbs: [{ name: "Home", path: "/" }, { name: "Projects" }],
  });

  return (
    <main id="main-content" className="flex-1">
      <SchemaScript graph={jsonLd} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Projects" }]} />
      <InteriorHero
        eyebrow="Projects"
        title="Approved project photography"
        description={description}
      />
      <section
        className="marketing-section page-rail"
        aria-labelledby="project-gallery-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Field work</p>
          <h2 id="project-gallery-title">Permission-safe project gallery</h2>
          <p>
            Published records are limited to media and captions that passed the
            project and source-media approval gates.
          </p>
        </div>
        <ProjectGallery projects={projectRecords} />
      </section>
      <CtaBand
        heading="Plan a specification-led scope"
        description="Explore the service families, then share the project package with estimating."
        primary={{ label: "Request an estimate", href: "/request-estimate" }}
        secondary={{ label: "Explore services", href: "/services" }}
      />
    </main>
  );
}
