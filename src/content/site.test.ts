import { describe, expect, it } from "vitest";
import {
  companyContent,
  faqItems,
  publicRoutes,
  scrollSections,
  services,
  site,
} from "@/content/site";
import { assertMarketingClaimsSafe } from "@/content/claims";
import {
  contentApprovals,
  filterPublishableLocations,
  locationRecords,
} from "@/content/marketing-governance";

describe("site content for scroll overlays", () => {
  it("exposes verified NAP and contact channels", () => {
    expect(site.legalName).toBe("Strong Foam Insulation Inc.");
    expect(site.phoneDisplay).toBe("519-900-6000");
    expect(site.emailEstimating).toBe("estimating@strongfoam.com");
    expect(site.primaryOps.street).toContain("McGovern");
    expect(site).not.toHaveProperty("headOffice");
    expect(site).not.toHaveProperty("branches");
    expect(site).not.toHaveProperty("emailAdmin");
  });

  it("exposes light and dark brand logos for app and marketing chrome", () => {
    expect(site.brandLogos.onLight).toBe("/media/brand/strongfoam-logo.svg");
    expect(site.brandLogos.onDark).toBe(
      "/media/brand/strongfoam-logo.svg",
    );
  });

  it("covers all six homepage service anchors", () => {
    expect(services.map((s) => s.id)).toEqual([
      "spray-foam",
      "fireproofing",
      "intumescent",
      "avb",
      "waterproofing",
      "firestopping",
    ]);
    for (const service of services) {
      expect(service.title.length).toBeGreaterThan(3);
      expect(service.overlay.length).toBeGreaterThan(20);
      expect(service.overlay.length).toBeLessThan(220);
    }
  });

  it("orders scroll sections per build brief IA", () => {
    expect(scrollSections.map((s) => s.id)).toEqual([
      "hero",
      "trust",
      "services",
      "process",
      "sectors",
      "projects",
      "coverage",
      "faq",
      "contact",
    ]);
  });

  it("does not expose scaffold copy or unfinished labels", () => {
    const publicCopy = JSON.stringify(scrollSections);
    expect(publicCopy).not.toContain("Stub:");
    expect(publicCopy).not.toContain("[stub]");
    expect(scrollSections.every((section) => section.status === "ready")).toBe(
      true,
    );
  });

  it("keeps hero overlay budget tight (headline + one support)", () => {
    const hero = scrollSections.find((s) => s.id === "hero");
    expect(hero?.headline).toBeTruthy();
    expect(hero?.support?.split(" ").length).toBeLessThan(28);
  });

  it("ships FAQ pairs suitable for FAQPage JSON-LD", () => {
    expect(faqItems.length).toBeGreaterThanOrEqual(4);
    for (const item of faqItems) {
      expect(item.question.endsWith("?") || item.question.includes("?")).toBe(
        true,
      );
      expect(item.answer.length).toBeGreaterThan(40);
    }
  });

  it("sends hero estimate CTA to the survey route", () => {
    const hero = scrollSections.find((section) => section.id === "hero");
    expect(hero?.cta).toEqual({
      label: "Request an estimate",
      href: "/request-estimate",
    });
  });

  it("points estimate FAQ at the on-site survey first", () => {
    const item = faqItems.find((entry) =>
      entry.question.toLowerCase().includes("estimate"),
    );
    expect(item?.answer).toContain("/request-estimate");
    expect(item?.answer).toContain("estimating@strongfoam.com");
    expect(item?.answer).toContain("519-900-6000");
  });

  it("avoids banned absolute greenest claim in overlays", () => {
    const blob = JSON.stringify({ services, scrollSections, faqItems });
    expect(blob.toLowerCase()).not.toContain("greenest");
    expect(blob).not.toContain("—");
  });

  it("defines every public route with exactly five unique service slugs", () => {
    expect(publicRoutes.map((route) => route.path)).toEqual([
      "/",
      "/about",
      "/services",
      "/services/spray-foam-insulation",
      "/services/fire-protection",
      "/services/air-vapour-barriers",
      "/services/waterproofing",
      "/services/firestopping",
      "/projects",
      "/partners",
      "/locations",
      "/contact",
      "/request-estimate",
    ]);
    expect(new Set(publicRoutes.map((route) => route.path)).size).toBe(
      publicRoutes.length,
    );
    const serviceSlugs = publicRoutes
      .filter((route) => route.kind === "service")
      .map((route) => route.slug);
    expect(serviceSlugs).toEqual([
      "spray-foam-insulation",
      "fire-protection",
      "air-vapour-barriers",
      "waterproofing",
      "firestopping",
    ]);
    expect(new Set(serviceSlugs).size).toBe(5);
  });

  it("exposes approved company story and principle fields", () => {
    expect(companyContent).toMatchObject({
      story: expect.any(String),
      focus: expect.any(String),
      culture: expect.any(String),
      safety: expect.any(String),
      mission: expect.any(String),
      vision: expect.any(String),
      purpose: expect.any(String),
      promise: expect.any(String),
      objective: expect.any(String),
    });
    expect(companyContent.slogans).toEqual([
      "Creating Strong Relationships",
      "Go Beyond. Go Strong.",
      "Strong People. Strong Service. Strong Results.",
    ]);
    expect(() =>
      assertMarketingClaimsSafe(companyContent, "typed company content"),
    ).not.toThrow();
  });

  it("keeps approval-gated facts explicit and out of visible company copy", () => {
    expect(contentApprovals).toEqual({
      founding2016: expect.objectContaining({ approved: false }),
      alternate2020Date: expect.objectContaining({ approved: false }),
      fiftyYearsExperience: expect.objectContaining({ approved: false }),
      oneHundredYearsExperience: expect.objectContaining({ approved: false }),
      currentGtaStatus: expect.objectContaining({ approved: false }),
      namedClients: expect.objectContaining({ approved: true }),
      namedProjects: expect.objectContaining({ approved: false }),
      supplierRelationships: expect.objectContaining({ approved: true }),
      sourceMedia: expect.objectContaining({ approved: true, approvedOn: "2026-10-13" }),
      applicatorStatus: expect.objectContaining({ approved: false }),
    });
    const visibleCopy = JSON.stringify(companyContent);
    expect(visibleCopy).not.toMatch(/\b(?:2016|2020|50|100)\b/);
    expect(visibleCopy).not.toContain("Woodbridge");
  });

  it("omits held supplier, applicator, date, and experience claims from visible copy", () => {
    const visibleCopy = JSON.stringify({
      services,
      faqItems,
      scrollSections,
    });
    expect(visibleCopy).not.toMatch(
      /\b(?:Genyk|BASF|Soprema|Blueskin|GCP|Grace|Carboline|Hilti)\b/i,
    );
    expect(visibleCopy).not.toMatch(
      /\b(?:2016|2020|50 years|100 years|decades of field history)\b/i,
    );
    expect(visibleCopy).not.toContain("certified evaluation");
  });

  it("renders only locations whose public address and operating facts are approved", () => {
    expect(locationRecords.map((location) => location.id)).toEqual([
      "cambridge-operations",
      "kitchener-head-office",
      "london-dorchester",
      "gta-woodbridge",
    ]);

    const publishable = filterPublishableLocations(locationRecords);
    expect(publishable.map((location) => location.id)).toEqual([
      "cambridge-operations",
    ]);
    expect(
      publishable.every((location) =>
        Object.values(location.approvals).every(Boolean),
      ),
    ).toBe(true);

    const homepageCopy = JSON.stringify(scrollSections);
    expect(homepageCopy).not.toMatch(/\b(?:London|Dorchester|Woodbridge|GTA)\b/);
  });
});
