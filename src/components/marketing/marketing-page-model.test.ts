import { existsSync } from "node:fs";
import { join } from "node:path";
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
    ]);
    expect(
      model.projects.every(
        (project) =>
          project.publicationStatus === "publish" &&
          project.publicImagePath.startsWith("/media/projects/"),
      ),
    ).toBe(true);
  });

  it("uses approved shortlist video derivatives for the hero and sectors", () => {
    expect(homepageMarketingModel.cinematicMedia).toMatchObject({
      heroVideo: "/media/animated/16x9/sf-hero-envelope-spray.mp4",
      heroPoster: "/media/animated/16x9/sf-hero-envelope-spray-poster.jpg",
      sectorVideo: "/media/animated/16x9/sf-sector-deck-fireproofing.mp4",
      sectorPoster:
        "/media/animated/16x9/sf-sector-deck-fireproofing-poster.jpg",
    });
    for (const path of [
      homepageMarketingModel.cinematicMedia.heroVideo,
      homepageMarketingModel.cinematicMedia.heroPoster,
      homepageMarketingModel.cinematicMedia.sectorVideo,
      homepageMarketingModel.cinematicMedia.sectorPoster,
    ]) {
      expect(
        existsSync(join(process.cwd(), "assets", path.replace("/media/", ""))),
      ).toBe(true);
    }
  });

  it("uses approved public project media for every cinematic still", () => {
    const { hero, process: processImage, sector } =
      homepageMarketingModel.cinematicMedia;
    expect({ hero, process: processImage, sector }).toEqual({
      hero: "/media/projects/IMG_7880.jpeg",
      process: "/media/projects/IMG_7879.jpg",
      sector: "/media/projects/IMG_7879.jpg",
    });
    expect(
      [hero, processImage, sector].every((path) =>
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
      videoFallback: "poster-when-reduced-motion",
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
