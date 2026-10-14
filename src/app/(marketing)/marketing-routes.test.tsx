import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AboutPage, { metadata as aboutMetadata } from "@/app/(marketing)/about/page";
import ContactPage, {
  metadata as contactMetadata,
} from "@/app/(marketing)/contact/page";
import HomePage, { metadata as homeMetadata } from "@/app/(marketing)/page";
import LocationsPage, {
  metadata as locationsMetadata,
} from "@/app/(marketing)/locations/page";
import PartnersPage, {
  metadata as partnersMetadata,
} from "@/app/(marketing)/partners/page";
import ProjectsPage, {
  metadata as projectsMetadata,
} from "@/app/(marketing)/projects/page";
import RequestEstimatePage, {
  metadata as requestEstimateMetadata,
} from "@/app/(marketing)/request-estimate/page";
import AirVapourBarriersPage, {
  metadata as airVapourBarriersMetadata,
} from "@/app/(marketing)/services/air-vapour-barriers/page";
import FireProtectionPage, {
  metadata as fireProtectionMetadata,
} from "@/app/(marketing)/services/fire-protection/page";
import ServicesPage, {
  metadata as servicesMetadata,
} from "@/app/(marketing)/services/page";
import WaterproofingPage, {
  metadata as waterproofingMetadata,
} from "@/app/(marketing)/services/waterproofing/page";
import FirestoppingPage, {
  metadata as firestoppingMetadata,
} from "@/app/(marketing)/services/firestopping/page";
import SprayFoamInsulationPage, {
  metadata as sprayFoamMetadata,
} from "@/app/(marketing)/services/spray-foam-insulation/page";
import { homepageMarketingModel } from "@/components/marketing/marketing-page-model";
import { getServiceBySlug } from "@/content/services";

type RouteCase = {
  path: string;
  Page: () => React.ReactNode;
  metadata: Metadata;
  h1: string;
  links: readonly string[];
};

const interiorRoutes: readonly RouteCase[] = [
  {
    path: "/about",
    Page: AboutPage,
    metadata: aboutMetadata,
    h1: "About Strong Foam",
    links: ["/services", "/request-estimate"],
  },
  {
    path: "/services",
    Page: ServicesPage,
    metadata: servicesMetadata,
    h1: "Specialty insulation and fire-protection services",
    links: [
      "/services/spray-foam-insulation",
      "/services/fire-protection",
      "/services/air-vapour-barriers",
      "/services/waterproofing",
      "/services/firestopping",
      "/request-estimate",
    ],
  },
  {
    path: "/services/spray-foam-insulation",
    Page: SprayFoamInsulationPage,
    metadata: sprayFoamMetadata,
    h1: "Spray foam insulation",
    links: ["/services", "/request-estimate"],
  },
  {
    path: "/services/fire-protection",
    Page: FireProtectionPage,
    metadata: fireProtectionMetadata,
    h1: "Strong Fire Protection",
    links: ["/services", "/request-estimate"],
  },
  {
    path: "/services/air-vapour-barriers",
    Page: AirVapourBarriersPage,
    metadata: airVapourBarriersMetadata,
    h1: "Air-vapour barriers",
    links: ["/services", "/request-estimate"],
  },
  {
    path: "/services/waterproofing",
    Page: WaterproofingPage,
    metadata: waterproofingMetadata,
    h1: "Waterproofing",
    links: ["/services", "/request-estimate"],
  },
  {
    path: "/services/firestopping",
    Page: FirestoppingPage,
    metadata: firestoppingMetadata,
    h1: "Firestopping",
    links: ["/services", "/request-estimate"],
  },
  {
    path: "/projects",
    Page: ProjectsPage,
    metadata: projectsMetadata,
    h1: "Our work in the field",
    links: ["/services", "/request-estimate"],
  },
  {
    path: "/partners",
    Page: PartnersPage,
    metadata: partnersMetadata,
    h1: "Strong relationships",
    links: ["/contact", "/request-estimate"],
  },
  {
    path: "/locations",
    Page: LocationsPage,
    metadata: locationsMetadata,
    h1: "Strong Foam locations",
    links: ["/contact", "/request-estimate"],
  },
  {
    path: "/contact",
    Page: ContactPage,
    metadata: contactMetadata,
    h1: "Contact Strong Foam",
    links: ["/locations", "/request-estimate"],
  },
  {
    path: "/request-estimate",
    Page: RequestEstimatePage,
    metadata: requestEstimateMetadata,
    h1: "Request an estimate or ask a question",
    links: ["mailto:estimating@strongfoam.com", "tel:+15199006000"],
  },
];

function titleOf(metadata: Metadata): string {
  return typeof metadata.title === "string" ? metadata.title : "";
}

function canonicalOf(metadata: Metadata): string {
  const canonical = metadata.alternates?.canonical;
  return typeof canonical === "string" ? canonical : "";
}

describe("marketing route contracts", () => {
  it.each(interiorRoutes)(
    "renders $path with one main, one route-specific H1, metadata, and contextual links",
    ({ path, Page, metadata, h1, links }) => {
      const html = renderToStaticMarkup(<>{Page()}</>);

      expect(html.match(/<main\b/g)).toHaveLength(1);
      expect(html).toContain('<main id="main-content"');
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).toContain(`<h1>${h1}</h1>`);
      expect(titleOf(metadata)).not.toBe("");
      expect(metadata.description).toEqual(expect.any(String));
      expect(canonicalOf(metadata)).toBe(path);
      for (const href of links) {
        expect(html).toContain(`href="${href}"`);
      }
    },
  );

  it("keeps the cinematic homepage behind the typed overview model", () => {
    expect(HomePage).toEqual(expect.any(Function));
    expect(titleOf(homeMetadata)).not.toBe("");
    expect(homeMetadata.description).toEqual(expect.any(String));
    expect(canonicalOf(homeMetadata)).toBe("/");
    expect(homepageMarketingModel.serviceLinks).toHaveLength(5);
    expect(homepageMarketingModel.serviceLinks.map((service) => service.href)).toEqual([
      "/services/spray-foam-insulation",
      "/services/fire-protection",
      "/services/air-vapour-barriers",
      "/services/waterproofing",
      "/services/firestopping",
    ]);
  });

  it("uses unique route titles and descriptions", () => {
    const routeMetadata = [
      homeMetadata,
      ...interiorRoutes.map((route) => route.metadata),
    ];
    const titles = routeMetadata.map(titleOf);
    const descriptions = routeMetadata.map((entry) => entry.description);

    expect(new Set(titles).size).toBe(routeMetadata.length);
    expect(new Set(descriptions).size).toBe(routeMetadata.length);
  });

  it("keeps held facts and relationships out of rendered routes", () => {
    const html = interiorRoutes
      .map(({ Page }) => renderToStaticMarkup(<>{Page()}</>))
      .join("");

    expect(html).not.toMatch(/\b(?:2016|2020)\b/);
    expect(html).not.toContain("Kitchener head office");
    expect(html).not.toContain("London branch");
    expect(html).not.toContain("GTA / Woodbridge");
    // Owner-approved partner logos render (2026-10-13); held ones do not.
    expect(html).toContain("Dakon Construction logo");
    expect(html).not.toContain("Demilec");
    expect(html).not.toContain("admin@strongfoam.com");
    expect(html).not.toContain("Qualified applicators");
    expect(html).not.toContain("322-72 St. Leger Street");
    expect(html).not.toContain("5130 Hamilton Road");
  });

  it("presents both fire-protection scopes and preserves their stored IDs", () => {
    const html = renderToStaticMarkup(<FireProtectionPage />);
    const service = getServiceBySlug("fire-protection");

    expect(html).toContain("Strong Fire Protection, a Strong Foam service.");
    expect(html).toContain("Cementitious passive fire protection");
    expect(html).toContain("Intumescent coatings");
    expect(service.storedServiceIds).toEqual(["fireproofing", "intumescent"]);
  });
});
