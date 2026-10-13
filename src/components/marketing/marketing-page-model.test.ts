import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildMarketingPageModel,
  homepageMarketingModel,
} from "@/components/marketing/marketing-page-model";
import { ScrollWorldPage } from "@/components/scroll-world-page";
import {
  partnerRecords,
  type PartnerRecord,
} from "@/content/partners";
import { projectRecords } from "@/content/projects";
import { locationRecords } from "@/content/marketing-governance";

describe("marketing page model", () => {
  it("locks the focused homepage section order", () => {
    expect(homepageMarketingModel.sectionOrder).toEqual([
      "hero",
      "trust",
      "services",
      "mission",
      "process",
      "sectors",
      "projects",
      "partners",
      "coverage",
      "faq",
      "contact",
    ]);
  });

  it("exposes exactly four unique public service route links", () => {
    expect(homepageMarketingModel.serviceLinks).toHaveLength(4);
    expect(
      homepageMarketingModel.serviceLinks.map((service) => service.href),
    ).toEqual([
      "/services/spray-foam-insulation",
      "/services/fire-protection",
      "/services/air-vapour-barriers",
      "/services/spf-roofing",
    ]);
    expect(
      new Set(
        homepageMarketingModel.serviceLinks.map((service) => service.href),
      ).size,
    ).toBe(4);
  });

  it("includes the endorsed Strong Fire feature and focused homepage content", () => {
    expect(homepageMarketingModel.strongFire.endorsement).toBe(
      "Strong Fire Protection, a Strong Foam service.",
    );
    expect(homepageMarketingModel.mission).toBeTruthy();
    expect(homepageMarketingModel.faq.length).toBeGreaterThan(0);
    expect(homepageMarketingModel.estimateCta.href).toBe("/request-estimate");
  });

  it("selects only approved projects with publishable public media", () => {
    const model = buildMarketingPageModel({
      projects: [
        ...projectRecords,
        {
          ...projectRecords[0],
          id: "project-held-fixture",
          publicationStatus: "hold",
          publicationReason: "Awaiting publication approval.",
        },
      ],
      partners: partnerRecords,
      locations: locationRecords,
    });

    expect(model.projects.map((project) => project.id)).toEqual([
      "project-commercial-envelope",
      "project-multi-storey-envelope",
      "project-spray-foam-interior",
    ]);
    expect(
      model.projects.every(
        (project) =>
          project.publicationStatus === "publish" &&
          project.publicImagePath.startsWith("/media/projects/generated/"),
      ),
    ).toBe(true);
  });

  it("uses approved public project media for every cinematic still", () => {
    expect(homepageMarketingModel.cinematicMedia).toEqual({
      hero:
        "/media/projects/generated/media-93e698a55726cd71-img-7880-hero-1920x1080.webp",
      process:
        "/media/projects/generated/media-da889acd7dfb11ec-img-7879-gallery-1600w-1600x778.webp",
      sector:
        "/media/projects/generated/media-da889acd7dfb11ec-img-7879-gallery-1600w-1600x778.webp",
    });
    expect(
      Object.values(homepageMarketingModel.cinematicMedia).every((path) =>
        homepageMarketingModel.projects.some(
          (project) => project.publicImagePath === path,
        ),
      ),
    ).toBe(true);
  });

  it("selects only fully approved partners and locations", () => {
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
      publicationStatus: "hold",
      publicationReason: "Publication remains on hold.",
    };

    const model = buildMarketingPageModel({
      projects: projectRecords,
      partners: [approvedPartner, heldPartner],
      locations: locationRecords,
    });

    expect(model.partners).toEqual([approvedPartner]);
    expect(model.locations.map((location) => location.id)).toEqual([
      "kitchener-operations",
    ]);
    expect(
      model.locations.every((location) =>
        Object.values(location.approvals).every(Boolean),
      ),
    ).toBe(true);
  });

  it("declares stable reduced-motion fallbacks without hiding content", () => {
    expect(homepageMarketingModel.motion).toEqual({
      disableNonEssentialMotion: true,
      essentialContentVisible: true,
      videoFallback: "poster",
      horizontalRailFallback: "scroll",
    });
  });

  it("renders the cinematic homepage in the declared section order", () => {
    const html = renderToStaticMarkup(
      createElement(ScrollWorldPage, { model: homepageMarketingModel }),
    );
    const rendered = [...html.matchAll(/data-home-section="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(rendered).toEqual([...homepageMarketingModel.sectionOrder]);
    expect(html).toContain("The crew installs the scope");
    expect(html).not.toContain("Qualified applicators");
    expect(html).not.toContain("Genyk");
  });
});
