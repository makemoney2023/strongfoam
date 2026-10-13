import { describe, expect, it } from "vitest";
import { contentApprovals, locationRecords } from "@/content/marketing-governance";
import { getServiceBySlug, serviceContent } from "@/content/services";
import { faqItems, site } from "@/content/site";
import {
  homeGraph,
  marketingPageGraph,
  organizationNode,
  serviceGraph,
  websiteNode,
} from "@/lib/site-schema";

function nodes(graph: ReturnType<typeof homeGraph>) {
  return graph["@graph"];
}

function canonicalReferences(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(canonicalReferences);
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, nested]) => {
    if (
      (key === "url" || key === "@id" || key === "item") &&
      typeof nested === "string"
    ) {
      return [nested];
    }
    return canonicalReferences(nested);
  });
}

describe("site schema graphs", () => {
  it("uses stable canonical Organization and WebSite IDs", () => {
    expect(organizationNode()).toMatchObject({
      "@type": "Organization",
      "@id": "https://strongfoam.com/#organization",
      url: "https://strongfoam.com",
    });
    expect(websiteNode()).toEqual({
      "@type": "WebSite",
      "@id": "https://strongfoam.com/#website",
      url: "https://strongfoam.com",
      name: site.brand,
      publisher: { "@id": "https://strongfoam.com/#organization" },
    });
  });

  it("builds a canonical homepage graph with applicable public nodes", () => {
    const graph = homeGraph(faqItems);
    const types = nodes(graph).flatMap((node) => {
      const type = node["@type"];
      return Array.isArray(type) ? type : [type];
    });

    expect(types).toEqual(
      expect.arrayContaining([
        "Organization",
        "WebSite",
        "WebPage",
        "LocalBusiness",
        "ContactPoint",
        "FAQPage",
      ]),
    );
    expect(JSON.stringify(graph)).not.toContain("admin@strongfoam.com");
  });

  it("builds service and breadcrumb nodes from visible service mappings", () => {
    for (const service of serviceContent) {
      const graph = serviceGraph(service);
      const serviceNode = nodes(graph).find(
        (node) => node["@type"] === "Service",
      );
      const breadcrumbNode = nodes(graph).find(
        (node) => node["@type"] === "BreadcrumbList",
      );

      expect(serviceNode).toMatchObject({
        "@id": `${site.url}${service.canonicalPath}#service`,
        name: service.title,
        description: service.summary,
        identifier: service.storedServiceIds,
        url: `${site.url}${service.canonicalPath}`,
      });
      expect(breadcrumbNode).toMatchObject({
        "@id": `${site.url}${service.canonicalPath}#breadcrumb`,
      });
    }

    expect(
      nodes(serviceGraph(getServiceBySlug("fire-protection"))).find(
        (node) => node["@type"] === "Service",
      ),
    ).toMatchObject({
      name: "Strong Fire Protection",
      identifier: ["fireproofing", "intumescent"],
    });
  });

  it("keeps held locations, relationships, and internal recipients out", () => {
    const graph = marketingPageGraph({
      path: "/locations",
      name: "Strong Foam locations",
      description:
        "Only current locations with approved public labels, addresses, active status, and service wording appear here.",
      breadcrumbs: [{ name: "Home", path: "/" }, { name: "Locations" }],
      includeLocalBusiness: true,
    });
    const serialized = JSON.stringify(graph);

    for (const location of locationRecords.filter(
      (entry) => entry.publicationStatus === "hold",
    )) {
      expect(serialized).not.toContain(location.label);
      if (location.address) {
        expect(serialized).not.toContain(location.address.street);
      }
    }
    for (const supplier of contentApprovals.supplierRelationships.value) {
      expect(serialized).not.toContain(supplier);
    }
    expect(serialized).not.toContain("admin@strongfoam.com");
    expect(serialized).not.toContain("Michael");
  });

  it("uses canonical strongfoam.com URLs throughout completed graphs", () => {
    const graph = serviceGraph(getServiceBySlug("spray-foam-insulation"));
    const urls = canonicalReferences(graph);

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.startsWith(site.url))).toBe(true);
  });

  it("rejects unsafe copy before a completed graph can be published", () => {
    expect(() =>
      homeGraph([
        {
          question: "What does the system do?",
          answer: "It is guaranteed to be the best option.",
        },
      ]),
    ).toThrow(/json-ld/i);
  });
});
