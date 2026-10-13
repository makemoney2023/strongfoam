import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { heroMedia } from "@/content/page-media";
import { ProjectGallery } from "@/components/marketing/project-gallery";
import { assertMarketingClaimsSafe } from "@/content/claims";
import { projectRecords } from "@/content/projects";

export const metadata: Metadata = {
  title: "Project Photography",
  description:
    "See Strong Foam spray foam, air barrier, and building-envelope work on projects across Ontario.",
  alternates: { canonical: "/projects" },
};

assertMarketingClaimsSafe(metadata, "metadata /projects");

export default function ProjectsPage() {
  return (
    <main id="main-content" className="flex-1">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Projects" }]} />
      <InteriorHero
        eyebrow="Projects"
        title="Our work in the field"
        description="A look at Strong Foam crews on commercial, industrial, and multi-unit residential projects across Ontario."
        media={heroMedia["projects"]}
      />
      <section
        className="marketing-section page-rail"
        aria-labelledby="project-gallery-title"
      >
        <div className="marketing-section__intro">
          <p className="section-kicker">Field work</p>
          <h2 id="project-gallery-title">Project gallery</h2>
          <p>
            Building envelopes, air barriers, and spray foam installations by
            the Strong Foam team.
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
