import { describe, expect, it } from "vitest";
import {
  faqItems,
  scrollSections,
  services,
  site,
} from "@/content/site";

describe("site content for scroll overlays", () => {
  it("exposes verified NAP and contact channels", () => {
    expect(site.legalName).toBe("Strong Foam Insulation Inc.");
    expect(site.phoneDisplay).toBe("519-900-6000");
    expect(site.emailEstimating).toBe("estimating@strongfoam.com");
    expect(site.primaryOps.street).toContain("Breithaupt");
  });

  it("exposes light and dark brand logos for app and marketing chrome", () => {
    expect(site.brandLogos.onLight).toBe("/media/brand/SFI-Logo-Jpeg-EDIT.jpg");
    expect(site.brandLogos.onDark).toBe(
      "/media/brand/SFI-Logo-Jpeg-EDIT_00-removebg-preview.png",
    );
  });

  it("covers all five homepage service anchors", () => {
    expect(services.map((s) => s.id)).toEqual([
      "spray-foam",
      "fireproofing",
      "intumescent",
      "avb",
      "spf-roofing",
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
});
