import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CtaBand } from "@/components/marketing/cta-band";
import { InteriorHero } from "@/components/marketing/interior-hero";
import { LocationCards } from "@/components/marketing/location-cards";
import { PartnerGrid } from "@/components/marketing/partner-grid";
import { ProjectGallery } from "@/components/marketing/project-gallery";
import { ServiceDetail } from "@/components/marketing/service-detail";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  partnerRecords,
  type PartnerRecord,
} from "@/content/partners";
import { projectRecords } from "@/content/projects";
import { serviceContent } from "@/content/services";
import { locationRecords } from "@/content/marketing-governance";

describe("server-compatible marketing components", () => {
  it("renders one H1 before the service section headings", () => {
    const html = renderToStaticMarkup(
      <main>
        <InteriorHero
          eyebrow="Services"
          title="Strong Fire Protection"
          description="Specification-led fire-protection scopes."
        />
        <ServiceDetail service={serviceContent[1]} />
      </main>,
    );

    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<h2"));
    expect(html.indexOf("<h2")).toBeLessThan(html.indexOf("<h3"));
    expect(html).toContain("Cementitious passive fire protection");
    expect(html).toContain("Intumescent coatings");
  });

  it("renders breadcrumb labels, links, and the current page", () => {
    const html = renderToStaticMarkup(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/services" },
          { label: "Strong Fire Protection" },
        ]}
      />,
    );

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/services"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Strong Fire Protection");
  });

  it("renders primary and secondary CTA links", () => {
    const html = renderToStaticMarkup(
      <CtaBand
        heading="Plan your project scope"
        description="Share the drawings and specification."
        primary={{ label: "Request an estimate", href: "/request-estimate" }}
        secondary={{ label: "Contact Strong Foam", href: "/contact" }}
      />,
    );

    expect(html).toContain('href="/request-estimate"');
    expect(html).toContain('href="/contact"');
  });

  it("filters non-publishable projects and provides an empty state", () => {
    const heldProject = {
      ...projectRecords[0],
      id: "project-held-fixture" as const,
      publicationStatus: "hold" as const,
      publicationReason: "Awaiting publication approval.",
    };
    const populated = renderToStaticMarkup(
      <ProjectGallery projects={[projectRecords[0], heldProject]} />,
    );
    const empty = renderToStaticMarkup(
      <ProjectGallery projects={[heldProject]} emptyMessage="No approved projects." />,
    );

    expect(populated).toContain(projectRecords[0].permissionSafeCaption);
    expect(populated).not.toContain("Awaiting publication approval.");
    expect(empty).toContain("No approved projects.");
  });

  it("filters held partners and renders a truthful empty state", () => {
    const approvedPartner: PartnerRecord = {
      id: "partner-approved-fixture",
      displayName: "Approved fixture",
      category: "supplier",
      identity: { known: true, reason: "Identity confirmed." },
      currentRelationship: {
        approved: true,
        reason: "Current relationship confirmed.",
      },
      publicationPermission: {
        approved: true,
        reason: "Publication approved.",
      },
      logo: {
        approvedOfficialPath: "/media/partners/approved-fixture.svg",
        alt: "Approved fixture logo",
      },
      publicationStatus: "publish",
      publicationReason: "All publication gates are approved.",
    };
    const heldPartner: PartnerRecord = {
      ...approvedPartner,
      id: "partner-held-fixture",
      displayName: "Held fixture",
      publicationStatus: "hold",
      publicationReason: "Publication remains on hold.",
    };
    const populated = renderToStaticMarkup(
      <PartnerGrid partners={[approvedPartner, heldPartner]} />,
    );
    const empty = renderToStaticMarkup(
      <PartnerGrid
        partners={partnerRecords.filter((p) => p.publicationStatus === "hold")}
        emptyMessage="Partner approvals are in progress."
      />,
    );

    expect(populated).toContain("Approved fixture");
    expect(populated).not.toContain("Held fixture");
    expect(empty).toContain("Partner approvals are in progress.");
    expect(
      renderToStaticMarkup(
        <PartnerGrid partners={partnerRecords.filter((p) => p.publicationStatus === "hold")} />,
      ),
    ).toBe("");
  });

  it("renders only locations with every public approval", () => {
    const html = renderToStaticMarkup(
      <LocationCards locations={locationRecords} />,
    );

    expect(html).toContain("Cambridge operations");
    expect(html).not.toContain("Kitchener head office");
    expect(html).not.toContain("London branch");
    expect(html).not.toContain("GTA / Woodbridge");
  });

  it("renders a shared footer with public contact channels only", () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    expect(html).toContain('href="tel:+15199006000"');
    expect(html).toContain('href="mailto:estimating@strongfoam.com"');
    expect(html).toContain('href="/request-estimate"');
    expect(html).not.toContain("LEAD_NOTIFY_TO");
    expect(html).not.toContain("notification");
  });
});
