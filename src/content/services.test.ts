import { describe, expect, it } from "vitest";
import { assertMarketingClaimsSafe } from "@/content/claims";
import {
  getServiceBySlug,
  serviceContent,
  type ServiceRouteSlug,
} from "@/content/services";
import { SCOPE_OPTIONS } from "@/content/survey";
import { SERVICE_IDS } from "@/lib/leads/types";

describe("typed service content", () => {
  it("defines the five canonical service routes", () => {
    expect(serviceContent.map((service) => service.slug)).toEqual([
      "spray-foam-insulation",
      "fire-protection",
      "air-vapour-barriers",
      "waterproofing",
      "firestopping",
    ]);
    expect(serviceContent.map((service) => service.canonicalPath)).toEqual(
      serviceContent.map((service) => `/services/${service.slug}`),
    );
    expect(new Set(serviceContent.map((service) => service.slug)).size).toBe(5);
    expect(
      new Set(serviceContent.map((service) => service.canonicalPath)).size,
    ).toBe(5);
  });

  it("keeps display slugs separate from stored lead service IDs", () => {
    expect(getServiceBySlug("spray-foam-insulation").storedServiceIds).toEqual([
      "spray-foam",
    ]);
    expect(getServiceBySlug("fire-protection").storedServiceIds).toEqual([
      "fireproofing",
      "intumescent",
    ]);
    expect(getServiceBySlug("air-vapour-barriers").storedServiceIds).toEqual([
      "avb",
    ]);
    expect(getServiceBySlug("waterproofing").storedServiceIds).toEqual([
      "waterproofing",
    ]);
    expect(getServiceBySlug("firestopping").storedServiceIds).toEqual([
      "firestopping",
    ]);
    for (const service of serviceContent) {
      for (const storedId of service.storedServiceIds) {
        expect(SERVICE_IDS).toContain(storedId);
      }
      expect(service).toHaveProperty("slug");
      expect(service).toHaveProperty("storedServiceIds");
    }
  });

  it("provides route metadata, CTA, technical sections, and cautions", () => {
    for (const service of serviceContent) {
      expect(service.metadata.title.length).toBeGreaterThan(20);
      expect(service.metadata.description.length).toBeGreaterThan(50);
      expect(service.cta).toEqual({
        label: "Request an estimate",
        href: "/request-estimate",
      });
      expect(service.technicalSections.length).toBeGreaterThanOrEqual(2);
      expect(service.cautions.length).toBeGreaterThan(0);
      expect(() =>
        assertMarketingClaimsSafe(service, `service ${service.slug}`),
      ).not.toThrow();
    }
  });

  it("keeps fire-protection scopes distinct under the endorsed identity", () => {
    const service = getServiceBySlug("fire-protection");
    expect(service.endorsement).toBe(
      "Strong Fire Protection, a Strong Foam service.",
    );
    expect(service.technicalSections.map((section) => section.id)).toEqual([
      "cementitious",
      "intumescent",
    ]);
  });

  it("rejects unknown service display slugs", () => {
    expect(() =>
      getServiceBySlug("unknown" as ServiceRouteSlug),
    ).toThrow(/unknown service slug/i);
  });

  it("maps every intake option to a current stored ID and display route", () => {
    expect(SCOPE_OPTIONS.map((option) => option.value)).toEqual(SERVICE_IDS);
    for (const option of SCOPE_OPTIONS) {
      expect(SERVICE_IDS).toContain(option.value);
      expect(
        getServiceBySlug(option.displaySlug).storedServiceIds,
      ).toContain(option.value);
      expect(option.displayPath).toBe(
        getServiceBySlug(option.displaySlug).canonicalPath,
      );
    }
  });
});
